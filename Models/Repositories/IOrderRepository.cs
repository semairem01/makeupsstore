
namespace makeup.Models.Repositories;

public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(int orderId);
    Task<Order?> GetByReturnCodeAsync(string returnCode);
    
    Task<IEnumerable<Order>> GetByUserIdAsync(Guid userId);
    Task<IEnumerable<Order>> GetAllAsync();
    Task AddAsync(Order order);
    Task UpdateAsync(Order order);
    Task DeleteAsync(int orderId);
    Task CancelOrderAsync(int orderId, Guid userId);
    Task RequestReturnAsync(int orderId, Guid userId, string reason, string? notes, List<int> returnItemIds);
    Task<string> ApproveReturnAsync(int orderId, string returnAddress, string? shippingInfo, string? adminNotes);
    Task RejectReturnAsync(int orderId, string? adminNotes);
    Task UpdateReturnTrackingAsync(int orderId, Guid userId, string trackingNumber);
    Task MarkReturnReceivedAsync(int orderId);
    Task CompleteRefundAsync(int orderId, decimal refundAmount, string refundMethod, string? transactionId);
}