using makeup.Models.Services.Dtos;

namespace makeup.Models.Services;

public interface ICartItemService
{
    Task<IEnumerable<CartItemDto>> GetAllAsync(Guid userId);                 // Oturumdaki kullanıcıya ait sepeti getir
    Task<ServiceResult<CartItemDto>> AddAsync(Guid userId, CartItemCreateDto dto); // Sepete ekle
    Task<ServiceResult<CartItemDto>> UpdateQuantityAsync(Guid userId, int cartItemId, int quantity); // Miktar güncelle
    Task<ServiceResult<bool>> RemoveAsync(Guid userId, int cartItemId);      // Sepetten kaldır
    Task<ServiceResult<bool>> ClearAsync(Guid userId);                       // Sepeti temizle
}