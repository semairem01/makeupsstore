namespace makeup.Models.Repositories;

public interface ICartItemRepository
{
    Task<CartItem?> GetByIdAsync(int id);
    Task<IEnumerable<CartItem>> GetByUserIdAsync(Guid userId);
    Task AddAsync(CartItem cartItem);
    Task UpdateAsync(CartItem cartItem);
    Task RemoveAsync(int id);
    Task ClearCartAsync(Guid userId); // tüm sepeti boşalt
    
    Task<CartItem?> GetByUserAndProductAsync(Guid userId, int productId);
}