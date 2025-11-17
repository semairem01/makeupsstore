using System.Security.Claims;
using makeup.Models.Repositories;
using makeup.Models.Repositories.Entities;
using makeup.Models.Services.Dtos;
using Microsoft.EntityFrameworkCore;

namespace makeup.Models.Services;

public class OrderService : IOrderService
{
    private readonly AppDbContext _context;
    private readonly IOrderRepository _orderRepository;
    private readonly IProductRepository _productRepository;
    private readonly ICartItemRepository _cartItemRepository;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public OrderService(
        IOrderRepository orderRepository,
        IProductRepository productRepository,
        ICartItemRepository cartItemRepository,
        IHttpContextAccessor httpContextAccessor,
        AppDbContext context)
    {
        _context = context;
        _orderRepository = orderRepository;
        _productRepository = productRepository;
        _cartItemRepository = cartItemRepository;
        _httpContextAccessor = httpContextAccessor;
    }

    private Guid CurrentUserId =>
        Guid.Parse(_httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier)
                   ?? Guid.Empty.ToString());

    private static decimal GetEffectivePrice(Product product)
    {
        var rate = product?.DiscountPercent ?? 0m;
        return rate > 0 ? product!.Price * (1 - rate / 100m) : product!.Price;
    }

    private static decimal GetEffectivePrice(ProductVariant variant)
    {
        var rate = variant?.DiscountPercent ?? 0m;
        return rate > 0 ? variant!.Price * (1 - rate / 100m) : variant!.Price;
    }

    public async Task<IEnumerable<OrderDto>> GetAllAsync(Guid userId)
    {
        var orders = await _orderRepository.GetByUserIdAsync(userId);
        return orders.Select(MapToDto).ToList();
    }

    public async Task<OrderDto?> GetByIdAsync(int id, Guid userId)
    {
        var order = await _orderRepository.GetByIdAsync(id);
        if (order == null || order.UserId != userId) return null;
        return MapToDto(order);
    }

    public async Task<ServiceResult<OrderDto>> CreateAsync(OrderCreateDto dto, Guid userId)
    {
        if (dto.Items == null || !dto.Items.Any())
            return ServiceResult<OrderDto>.Fail("No items in the order.");

        var orderItems = new List<OrderItem>();
        foreach (var item in dto.Items)
        {
            var product = await _productRepository.GetByIdAsync(item.ProductId);
            if (product == null || !product.IsActive)
                return ServiceResult<OrderDto>.Fail($"Product {item.ProductId} is not available.");

            if (product.StockQuantity < item.Quantity)
                return ServiceResult<OrderDto>.Fail($"Not enough stock for {product.Name}.");

            product.StockQuantity -= item.Quantity;
            if (product.StockQuantity <= 0)
            {
                product.StockQuantity = 0;
                product.IsActive = false;
            }
            await _productRepository.UpdateAsync(product);

            var effectivePrice = GetEffectivePrice(product);
            orderItems.Add(new OrderItem
            {
                ProductId = product.Id,
                Quantity = item.Quantity,
                UnitPrice = effectivePrice
            });
        }

        var order = new Order
        {
            UserId = userId,
            OrderDate = DateTime.UtcNow,
            Status = OrderStatus.SiparisAlindi,
            OrderItems = orderItems,
            ShippingFee = 0,
            ShippingMethod = "standard"
        };

        await _orderRepository.AddAsync(order);
        var loaded = await _orderRepository.GetByIdAsync(order.Id);
        return ServiceResult<OrderDto>.Ok(MapToDto(loaded!), "Order successfully created.");
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id, Guid userId)
    {
        var order = await _orderRepository.GetByIdAsync(id);
        if (order == null || order.UserId != userId)
            return ServiceResult<bool>.Fail("Order not found or access denied.");

        await _orderRepository.DeleteAsync(order.Id);
        return ServiceResult<bool>.Ok(true, "Order deleted successfully!");
    }

    // ✅ SADECE İMZA GÜNCELLENDİ - 3 yeni parametre eklendi
    public async Task<ServiceResult<OrderDto>> CheckoutAsync(
        Guid userId, 
        decimal shippingFee, 
        string shippingMethod,
        ShippingSnapshotDto? shippingSnapshot = null,
        string? discountCode = null,
        decimal discountAmount = 0m,
        int discountPercentage = 0)
    {
        if (userId == Guid.Empty)
            return ServiceResult<OrderDto>.Fail("Kullanıcı bulunamadı");

        var normalizedMethod = string.IsNullOrWhiteSpace(shippingMethod)
            ? "standard"
            : shippingMethod.Trim().ToLowerInvariant();

        if (normalizedMethod != "standard" && normalizedMethod != "express")
            normalizedMethod = "standard";

        if (shippingFee < 0) shippingFee = 0;

        await using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            var cartItems = (await _cartItemRepository.GetByUserIdAsync(userId)).ToList();
            if (!cartItems.Any())
                return ServiceResult<OrderDto>.Fail("Sepetiniz boş");

            var orderItems = new List<OrderItem>();

            foreach (var ci in cartItems)
            {
                var product = await _productRepository.GetByIdAsync(ci.ProductId);
                if (product == null || !product.IsActive)
                    return ServiceResult<OrderDto>.Fail($"Ürün geçersiz: {ci.ProductId}");

                if (ci.VariantId.HasValue && ci.VariantId > 0)
                {
                    var variant = product.Variants?.FirstOrDefault(v => v.Id == ci.VariantId);
                    if (variant == null || !variant.IsActive)
                        return ServiceResult<OrderDto>.Fail("Varyant bulunamadı veya aktif değil.");

                    if (variant.StockQuantity < ci.Quantity)
                        return ServiceResult<OrderDto>.Fail($"{product.Name} / {variant.Name} için yeterli stok yok.");

                    variant.StockQuantity -= ci.Quantity;
                    if (variant.StockQuantity <= 0)
                    {
                        variant.StockQuantity = 0;
                        variant.IsActive = false;
                    }

                    await _productRepository.UpdateAsync(product);

                    var unitPrice = GetEffectivePrice(variant);
                    orderItems.Add(new OrderItem
                    {
                        ProductId = ci.ProductId,
                        VariantId = ci.VariantId,
                        Quantity = ci.Quantity,
                        UnitPrice = unitPrice
                    });
                }
                else
                {
                    if (product.StockQuantity < ci.Quantity)
                        return ServiceResult<OrderDto>.Fail($"{product.Name} için yeterli stok yok.");

                    product.StockQuantity -= ci.Quantity;
                    if (product.StockQuantity <= 0)
                    {
                        product.StockQuantity = 0;
                        product.IsActive = false;
                    }
                    await _productRepository.UpdateAsync(product);

                    var unitPrice = GetEffectivePrice(product);
                    orderItems.Add(new OrderItem
                    {
                        ProductId = ci.ProductId,
                        Quantity = ci.Quantity,
                        UnitPrice = unitPrice
                    });
                }
            }

            var order = new Order
            {
                UserId = userId,
                OrderDate = DateTime.UtcNow,
                Status = OrderStatus.SiparisAlindi,
                OrderItems = orderItems,
                ShippingFee = shippingFee,
                ShippingMethod = normalizedMethod,
                // ✅ YENİ - Discount bilgileri
                DiscountCode = discountCode,
                DiscountAmount = discountAmount,
                DiscountPercentage = discountPercentage
            };

            if (shippingSnapshot != null)
            {
                order.ShipFullName     = shippingSnapshot.ShipFullName ?? "";
                order.ShipPhone        = shippingSnapshot.ShipPhone ?? "";
                order.ShipCity         = shippingSnapshot.ShipCity ?? "";
                order.ShipDistrict     = shippingSnapshot.ShipDistrict ?? "";
                order.ShipNeighborhood = shippingSnapshot.ShipNeighborhood ?? "";
                order.ShipLine         = shippingSnapshot.ShipLine ?? "";
                order.ShipPostalCode   = shippingSnapshot.ShipPostalCode ?? "";
            }
            await _orderRepository.AddAsync(order);
            await _cartItemRepository.ClearCartAsync(userId);

            var loaded = await _orderRepository.GetByIdAsync(order.Id);
            await tx.CommitAsync();

            return ServiceResult<OrderDto>.Ok(MapToDto(loaded!), "Sipariş başarıyla oluşturuldu");
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            return ServiceResult<OrderDto>.Fail(ex.Message);
        }
    }

    public async Task<ServiceResult<bool>> CancelOrderAsync(int orderId, Guid userId)
    {
        try
        {
            await _orderRepository.CancelOrderAsync(orderId, userId);
            return ServiceResult<bool>.Ok(true, "Sipariş iptal edildi.");
        }
        catch (Exception ex)
        {
            return ServiceResult<bool>.Fail(ex.Message);
        }
    }

    // ✅ MapToDto'ya 3 yeni alan eklendi
    public OrderDto MapToDto(Order order)
    {
        return new OrderDto(
            order.Id,
            order.UserId,
            order.OrderDate,
            order.Status.ToString(),
            order.OrderItems.Select(oi =>
            {
                var hasVariant = oi.VariantId.HasValue && oi.Variant != null;

                var productName  = oi.Product.Name;
                var productImage = oi.Product.ImageUrl;

                var variantName  = hasVariant ? oi.Variant!.Name     : null;
                var variantImage = hasVariant ? oi.Variant!.ImageUrl : null;

                return new OrderItemDto(
                    oi.ProductId,
                    productName,
                    productImage,
                    oi.UnitPrice,
                    oi.Quantity,
                    oi.UnitPrice * oi.Quantity, 
                    variantName,         
                    variantImage,
                    oi.Id
                );
            }).ToList(),
            order.ShippingFee,
            order.ShippingMethod,
            order.TrackingNumber,
            order.ReturnRequestDate,
            order.ReturnReason,
            order.ReturnNotes,
            order.ReturnItemsJson,
            order.ReturnApprovedDate,
            order.ReturnAdminNotes,
            order.ReturnStatus.ToString(),
            order.ReturnCode,
            order.ReturnAddress,
            order.ReturnShippingInfo,
            order.DiscountCode,      // ✅ YENİ
            order.DiscountAmount,    // ✅ YENİ
            order.DiscountPercentage // ✅ YENİ
        );
    }

    public async Task<IEnumerable<AdminOrderListItemDto>> AdminListAsync()
    {
        var all = await _orderRepository.GetAllAsync();
        return all.Select(o => new AdminOrderListItemDto(
            o.Id,
            o.UserId,
            o.OrderDate,
            o.Status.ToString(),
            o.ShippingFee,
            o.ShippingMethod,
            o.TrackingNumber,
            o.OrderItems.Sum(oi => oi.UnitPrice * oi.Quantity)
        ));
    }

    public async Task<ServiceResult<OrderDto>> AdminUpdateAsync(int orderId, AdminOrderUpdateDto dto)
    {
        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order == null) return ServiceResult<OrderDto>.Fail("Order not found.");

        if (!Enum.TryParse<OrderStatus>(dto.Status, ignoreCase: true, out var newStatus))
            return ServiceResult<OrderDto>.Fail("Invalid status.");

        order.Status = newStatus;
        order.TrackingNumber = string.IsNullOrWhiteSpace(dto.TrackingNumber) ? null : dto.TrackingNumber.Trim();

        await _orderRepository.UpdateAsync(order);

        var loaded = await _orderRepository.GetByIdAsync(order.Id);
        return ServiceResult<OrderDto>.Ok(MapToDto(loaded!), "Order updated.");
    }
}