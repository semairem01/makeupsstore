using System.Security.Claims;
using makeup.Models.Repositories;
using makeup.Models.Services.Dtos;
using System.Linq;

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

    // Sepeti getir
    public async Task<IEnumerable<CartItemDto>> GetAllAsync()
    {
        var userId = CurrentUserId;
        var cartItems = await _cartItemRepository.GetByUserIdAsync(userId);

        return cartItems.Select(ci => new CartItemDto(
            ci.Id,
            ci.ProductId,
            ci.Product.Name,
            ci.Product.Brand,
            ci.Product.ImageUrl,
            ci.Product.Price,
            ci.Quantity,
            ci.Product.Price * ci.Quantity
        )).ToList();
    }

    // Sepete ekle (iş kuralları burada)
    public async Task<ServiceResult<CartItemDto>> AddAsync(CartItemCreateDto dto)
    {
        if (dto.Quantity < 1)
            return ServiceResult<CartItemDto>.Fail("Quantity must be at least 1.");

        var product = await _productRepository.GetByIdAsync(dto.ProductId);
        if (product == null || !product.IsActive)
            return ServiceResult<CartItemDto>.Fail("Product is not available.");

        // Mevcut satır var mı? (aynı kullanıcı + aynı ürün)
        var existing = await _cartItemRepository.GetByUserAndProductAsync(CurrentUserId, dto.ProductId);
        var newQty = (existing?.Quantity ?? 0) + dto.Quantity;

        if (product.StockQuantity < newQty)
            return ServiceResult<CartItemDto>.Fail("Not enough stock.");

        if (existing != null)
        {
            // miktarı artır
            existing.Quantity = newQty;
            await _cartItemRepository.UpdateAsync(existing);

            var dtoOut = new CartItemDto(
                existing.Id,
                existing.ProductId,
                existing.Product.Name,
                existing.Product.Brand,
                existing.Product.ImageUrl,
                existing.Product.Price,
                existing.Quantity,
                existing.Product.Price * existing.Quantity
            );

            return ServiceResult<CartItemDto>.Ok(dtoOut, "Cart updated.");
        }
        else
        {
            // yeni satır ekle
            var cartItem = new CartItem
            {
                ProductId = dto.ProductId,
                Quantity = dto.Quantity,
                UserId = CurrentUserId
            };
            await _cartItemRepository.AddAsync(cartItem);

            // repo AddAsync genellikle entity’yi geri doldurur; emin olmak için tekrar oku
            var added = await _cartItemRepository.GetByUserAndProductAsync(CurrentUserId, dto.ProductId);
            if (added == null)
                return ServiceResult<CartItemDto>.Fail("Failed to add item to cart.");

            var dtoOut = new CartItemDto(
                added.Id,
                added.ProductId,
                added.Product.Name,
                added.Product.Brand,
                added.Product.ImageUrl,
                added.Product.Price,
                added.Quantity,
                added.Product.Price * added.Quantity
            );

            return ServiceResult<CartItemDto>.Ok(dtoOut, "Item added to cart.");
        }
    }

    // Miktar güncelle
    public async Task<ServiceResult<CartItemDto>> UpdateQuantityAsync(int cartItemId, int quantity)
    {
        if (quantity < 1)
            return ServiceResult<CartItemDto>.Fail("Quantity must be at least 1.");

        var cartItem = await _cartItemRepository.GetByIdAsync(cartItemId);
        if (cartItem == null)
            return ServiceResult<CartItemDto>.Fail("Cart item not found.");

        // Kendi sepeti mi? (temel güvenlik)
        if (cartItem.UserId != CurrentUserId)
            return ServiceResult<CartItemDto>.Fail("You cannot modify this cart item.");

        var product = await _productRepository.GetByIdAsync(cartItem.ProductId);
        if (product == null || !product.IsActive)
            return ServiceResult<CartItemDto>.Fail("Product is not available.");

        if (product.StockQuantity < quantity)
            return ServiceResult<CartItemDto>.Fail("Not enough stock.");

        cartItem.Quantity = quantity;
        await _cartItemRepository.UpdateAsync(cartItem);

        var dto = new CartItemDto(
            cartItem.Id,
            cartItem.ProductId,
            cartItem.Product.Name,
            cartItem.Product.Brand,
            cartItem.Product.ImageUrl,
            cartItem.Product.Price,
            cartItem.Quantity,
            cartItem.Product.Price * cartItem.Quantity
        );

        return ServiceResult<CartItemDto>.Ok(dto, "Quantity updated successfully.");
    }

    public async Task<ServiceResult<bool>> RemoveAsync(int cartItemId)
    {
        var ci = await _cartItemRepository.GetByIdAsync(cartItemId);
        if (ci == null) return ServiceResult<bool>.Fail("Cart item not found.");
        if (ci.UserId != CurrentUserId) return ServiceResult<bool>.Fail("You cannot modify this cart item.");

        await _cartItemRepository.RemoveAsync(cartItemId);
        return ServiceResult<bool>.Ok(true, "Item removed from cart successfully.");
    }

    public async Task<ServiceResult<bool>> ClearAsync()
    {
        await _cartItemRepository.ClearCartAsync(CurrentUserId);
        return ServiceResult<bool>.Ok(true, "Cart cleared successfully.");
    }
}
