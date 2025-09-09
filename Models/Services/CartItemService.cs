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

    public CartItemService(ICartItemRepository cartItemRepository, IProductRepository productRepository,
        IHttpContextAccessor httpContextAccessor)
    {
        _cartItemRepository = cartItemRepository;
        _productRepository = productRepository;
        _httpContextAccessor = httpContextAccessor;
    }
    
    //Oturumdaki kullanıcı ID'si
    private Guid CurrentUserId =>
    Guid.Parse(_httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? Guid.Empty.ToString());
    
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
    
    //sepete ekle
    public async Task<ServiceResult<CartItemDto>> AddAsync(CartItemCreateDto dto)
    {
        var cartItem = new CartItem
        {
            ProductId = dto.ProductId,
            Quantity = dto.Quantity,
            UserId = CurrentUserId
        };

        await _cartItemRepository.AddAsync(cartItem);

        var addedItem = await _cartItemRepository.GetByIdAsync(cartItem.Id);

        if (addedItem == null)
            return ServiceResult<CartItemDto>.Fail("Failed to add item to cart.");

        var cartItemDto = new CartItemDto(
            addedItem.Id,
            addedItem.ProductId,
            addedItem.Product.Name,
            addedItem.Product.Brand,
            addedItem.Product.ImageUrl,
            addedItem.Product.Price,
            addedItem.Quantity,
            addedItem.Product.Price * addedItem.Quantity
        );

        return ServiceResult<CartItemDto>.Ok(cartItemDto, "Item added to cart successfully.");
    }
    
    public async Task<ServiceResult<CartItemDto>> UpdateQuantityAsync(int cartItemId, int quantity)
    {
        var cartItem = await _cartItemRepository.GetByIdAsync(cartItemId);
        if (cartItem == null) return ServiceResult<CartItemDto>.Fail("Cart item not found.");

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
        await _cartItemRepository.RemoveAsync(cartItemId);
        return ServiceResult<bool>.Ok(true, "Item removed from cart successfully.");
    }

    public async Task<ServiceResult<bool>> ClearAsync()
    {
        var userId = CurrentUserId;
        await _cartItemRepository.ClearCartAsync(CurrentUserId);
        return ServiceResult<bool>.Ok(true, "Cart cleared successfully.");
    }
}