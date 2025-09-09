
namespace makeup.Models.Repositories;

public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(int orderId);
    Task<IEnumerable<Order>> GetByUserIdAsync(Guid userId);
    Task<IEnumerable<Order>> GetAllAsync();
    Task AddAsync(Order order);
    Task UpdateAsync(Order order);
    Task DeleteAsync(int orderId);
    Task CancelOrderAsync(int orderId, Guid userId);
}