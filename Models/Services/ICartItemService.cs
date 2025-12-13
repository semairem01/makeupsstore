using makeup.Models.Services.Dtos;

namespace makeup.Models.Services;

public interface ICartItemService
{
    Task<IEnumerable<CartItemDto>> GetAllAsync(); // Oturumdaki kullanıcıya ait sepeti getir
    Task<ServiceResult<CartItemDto>> AddAsync(CartItemCreateDto dto); // Sepete ekle
    Task<ServiceResult<CartItemDto>> UpdateQuantityAsync(int cartItemId, int quantity); // Miktar güncelle
    Task<ServiceResult<bool>> RemoveAsync(int cartItemId); // Sepetten kaldır
    Task<ServiceResult<bool>> ClearAsync(); // Sepeti temizle
    
}