namespace makeup.Models.Repositories;

public interface IOrderItemRepository
{
    Task<OrderItem?> GetByIdAsync(int id);
    Task<IEnumerable<OrderItem>> GetByOrderIdAsync(int orderId);
    Task<IEnumerable<OrderItem>> GetByProductIdAsync(int productId);
    Task AddAsync(OrderItem orderItem);
    Task UpdateAsync(OrderItem orderItem);
    Task DeleteAsync(int id);
}