using System.Security.Claims;
using makeup.Models.Repositories;
using makeup.Models.Services.Dtos;
using System.Linq;
using makeup.Models.Repositories.Entities;

namespace makeup.Models.Services;

public class CartItemService : ICartItemService
{
    private readonly ICartItemRepository _cartItemRepository;
    private readonly IProductRepository _productRepository;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CartItemService(
        ICartItemRepository cartItemRepository,
        IProductRepository productRepository,
        IHttpContextAccessor httpContextAccessor)
    {
        _cartItemRepository = cartItemRepository;
        _productRepository = productRepository;
        _httpContextAccessor = httpContextAccessor;
    }

    private Guid CurrentUserId =>
        Guid.Parse(_httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier)
                   ?? Guid.Empty.ToString());

    // İndirim uygulanmış birim fiyat (ürün için)
    private static decimal GetEffectiveUnitPrice(Product p)
    {
        if (p == null) return 0m;
        var rate = (p.DiscountPercent ?? 0m);
        return (rate > 0m) ? p.Price * (1 - rate / 100m) : p.Price;
    }

    // İndirim uygulanmış birim fiyat (varyant için)
    private static decimal GetEffectiveUnitPrice(ProductVariant v)
    {
        if (v == null) return 0m;
        var rate = (v.DiscountPercent ?? 0m);
        return (rate > 0m) ? v.Price * (1 - rate / 100m) : v.Price;
    }

    // CartItem -> CartItemDto dönüşümü
    private CartItemDto MapToDto(CartItem ci)
    {
        var unitPrice = ci.Variant != null
            ? GetEffectiveUnitPrice(ci.Variant)
            : GetEffectiveUnitPrice(ci.Product);

        return new CartItemDto(
            ci.Id,
            ci.ProductId,
            ci.Product.Name,
            ci.Product.Brand,
            ci.Product.ImageUrl,
            ci.VariantId,
            ci.Variant?.Name,
            ci.Variant?.ImageUrl,
            unitPrice,
            ci.Quantity,
            unitPrice * ci.Quantity
        );
    }

    // Sepeti getir
    public async Task<IEnumerable<CartItemDto>> GetAllAsync()
    {
        var userId = CurrentUserId;
        var cartItems = await _cartItemRepository.GetByUserIdAsync(userId);
        return cartItems.Select(MapToDto).ToList();
    }

    // Sepete ekle
    public async Task<ServiceResult<CartItemDto>> AddAsync(CartItemCreateDto dto)
    {
        if (dto.Quantity < 1)
            return ServiceResult<CartItemDto>.Fail("Miktar en az 1 olmalıdır.");

        var product = await _productRepository.GetByIdAsync(dto.ProductId);
        if (product == null || !product.IsActive)
            return ServiceResult<CartItemDto>.Fail("Ürün kullanılamıyor.");

        ProductVariant? variant = null;
        int checkStockQty = dto.Quantity;

        // Varyant varsa kontrol et
        if (dto.VariantId.HasValue && dto.VariantId > 0)
        {
            variant = product.Variants?.FirstOrDefault(v => v.Id == dto.VariantId);
            if (variant == null || !variant.IsActive)
                return ServiceResult<CartItemDto>.Fail("Varyant bulunamadı veya aktif değil.");

            if (variant.StockQuantity < checkStockQty)
                return ServiceResult<CartItemDto>.Fail($"Varyant stok yetersiz. Mevcut: {variant.StockQuantity}");
        }
        else
        {
            if (product.StockQuantity < checkStockQty)
                return ServiceResult<CartItemDto>.Fail($"Ürün stok yetersiz. Mevcut: {product.StockQuantity}");
        }

        // Aynı ürün + aynı varyant kombinasyonu var mı?
        var existing = await _cartItemRepository.GetByUserProductVariantAsync(CurrentUserId, dto.ProductId, dto.VariantId);
        
        if (existing != null)
        {
            // Miktarı artır
            int newQty = existing.Quantity + dto.Quantity;

            // Stok kontrolü yap
            if (variant != null && variant.StockQuantity < newQty)
                return ServiceResult<CartItemDto>.Fail($"Varyant stok yetersiz. Mevcut: {variant.StockQuantity}");
            if (variant == null && product.StockQuantity < newQty)
                return ServiceResult<CartItemDto>.Fail($"Ürün stok yetersiz. Mevcut: {product.StockQuantity}");

            existing.Quantity = newQty;
            await _cartItemRepository.UpdateAsync(existing);

            return ServiceResult<CartItemDto>.Ok(
                MapToDto(existing),
                "Sepet güncellendi."
            );
        }
        else
        {
            // Yeni satır ekle
            var cartItem = new CartItem
            {
                ProductId = dto.ProductId,
                VariantId = dto.VariantId,
                Quantity = dto.Quantity,
                UserId = CurrentUserId
            };
            await _cartItemRepository.AddAsync(cartItem);

            // Eklenen item'i tekrar oku (Include'lu)
            var added = await _cartItemRepository.GetByIdAsync(cartItem.Id);
            if (added == null)
                return ServiceResult<CartItemDto>.Fail("Sepete eklenemedi.");

            return ServiceResult<CartItemDto>.Ok(
                MapToDto(added),
                "Ürün sepete eklendi."
            );
        }
    }

    // Miktar güncelle
    public async Task<ServiceResult<CartItemDto>> UpdateQuantityAsync(int cartItemId, int quantity)
    {
        if (quantity < 1)
            return ServiceResult<CartItemDto>.Fail("Miktar en az 1 olmalıdır.");

        var cartItem = await _cartItemRepository.GetByIdAsync(cartItemId);
        if (cartItem == null)
            return ServiceResult<CartItemDto>.Fail("Sepet öğesi bulunamadı.");

        // Kendi sepeti mi?
        if (cartItem.UserId != CurrentUserId)
            return ServiceResult<CartItemDto>.Fail("Bu sepet öğesini değiştiremezsiniz.");

        var product = await _productRepository.GetByIdAsync(cartItem.ProductId);
        if (product == null || !product.IsActive)
            return ServiceResult<CartItemDto>.Fail("Ürün kullanılamıyor.");

        // Stok kontrol et
        if (cartItem.VariantId.HasValue && cartItem.VariantId > 0)
        {
            var variant = product.Variants?.FirstOrDefault(v => v.Id == cartItem.VariantId);
            if (variant == null)
                return ServiceResult<CartItemDto>.Fail("Varyant bulunamadı.");
            if (variant.StockQuantity < quantity)
                return ServiceResult<CartItemDto>.Fail($"Varyant stok yetersiz. Mevcut: {variant.StockQuantity}");
        }
        else
        {
            if (product.StockQuantity < quantity)
                return ServiceResult<CartItemDto>.Fail($"Ürün stok yetersiz. Mevcut: {product.StockQuantity}");
        }

        cartItem.Quantity = quantity;
        await _cartItemRepository.UpdateAsync(cartItem);

        return ServiceResult<CartItemDto>.Ok(
            MapToDto(cartItem),
            "Miktar güncellendi."
        );
    }

    // Sepetten kaldır
    public async Task<ServiceResult<bool>> RemoveAsync(int cartItemId)
    {
        var ci = await _cartItemRepository.GetByIdAsync(cartItemId);
        if (ci == null)
            return ServiceResult<bool>.Fail("Sepet öğesi bulunamadı.");
        
        if (ci.UserId != CurrentUserId)
            return ServiceResult<bool>.Fail("Bu sepet öğesini silemezsiniz.");

        await _cartItemRepository.RemoveAsync(cartItemId);
        return ServiceResult<bool>.Ok(true, "Sepetten kaldırıldı.");
    }

    // Sepeti temizle
    public async Task<ServiceResult<bool>> ClearAsync()
    {
        await _cartItemRepository.ClearCartAsync(CurrentUserId);
        return ServiceResult<bool>.Ok(true, "Sepet temizlendi.");
    }
}