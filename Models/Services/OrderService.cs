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
    public OrderService(IOrderRepository orderRepository, IProductRepository productRepository,
        ICartItemRepository cartItemRepository,
        IHttpContextAccessor httpContextAccessor, AppDbContext context)
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

            // Stok düşürme
            product.StockQuantity -= item.Quantity;
            
            if (product.StockQuantity <= 0)
            {
                product.StockQuantity = 0;
                product.IsActive = false;
            }
            await _productRepository.UpdateAsync(product);

            orderItems.Add(new OrderItem
            {
                ProductId = product.Id,
                Quantity = item.Quantity,
                UnitPrice = product.Price
            });
        }

        var order = new Order
        {
            UserId = userId,
            OrderDate = DateTime.UtcNow,
            Status = OrderStatus.SiparisAlindi,
            OrderItems = orderItems
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

    public async Task<ServiceResult<OrderDto>> CheckoutAsync()
        {
            // 1) kullanıcı
            if (CurrentUserId == Guid.Empty)
                return ServiceResult<OrderDto>.Fail("Kullanıcı bulunamadı");

            
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1) Sepeti çek
                var cartItems = (await _cartItemRepository.GetByUserIdAsync(CurrentUserId)).ToList();
                if (!cartItems.Any())
                    return ServiceResult<OrderDto>.Fail("Sepetiniz boş");

                // 2) Stok kontrol + stok düş
                var orderItems = new List<OrderItem>();
                foreach (var ci in cartItems)
                {
                    var product = await _productRepository.GetByIdAsync(ci.ProductId);
                    if (product == null || !product.IsActive)
                        return ServiceResult<OrderDto>.Fail($"Ürün geçersiz: {ci.ProductId}");

                    if (product.StockQuantity < ci.Quantity)
                        return ServiceResult<OrderDto>.Fail($"{product.Name} için yeterli stok yok.");

                    product.StockQuantity -= ci.Quantity;
                    if (product.StockQuantity <= 0)
                    {
                        product.StockQuantity = 0;
                        product.IsActive = false;
                    }
                    await _productRepository.UpdateAsync(product);

                    orderItems.Add(new OrderItem
                    {
                        ProductId = ci.ProductId,
                        Quantity = ci.Quantity,
                        UnitPrice = product.Price
                    });
                }

                // 3) Sipariş oluştur
                var order = new Order
                {
                    UserId = CurrentUserId,
                    OrderDate = DateTime.UtcNow,
                    Status = OrderStatus.SiparisAlindi,
                    OrderItems = orderItems
                };

                await _orderRepository.AddAsync(order);

                // 4) Sepeti temizle
                await _cartItemRepository.ClearCartAsync(CurrentUserId);

                // 5) DTO için include’larla tekrar yükle
                var loaded = await _orderRepository.GetByIdAsync(order.Id);

                // 6) Transaction commit
                await tx.CommitAsync();

                return ServiceResult<OrderDto>.Ok(MapToDto(loaded!), "Sipariş başarıyla oluşturuldu");
            }
            catch (Exception ex)
            {
                // Herhangi bir hata → tüm değişiklikleri geri al
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
    private OrderDto MapToDto(Order order)
    {
        return new OrderDto(
            order.Id,
            order.UserId,
            order.OrderDate,
            order.Status.ToString(),
            order.OrderItems.Select(oi => new OrderItemDto(
                oi.ProductId,
                oi.Product.Name,
                oi.Product.ImageUrl,
                oi.UnitPrice,
                oi.Quantity,
                oi.UnitPrice * oi.Quantity
            )).ToList()
        );
    }
    
    
}