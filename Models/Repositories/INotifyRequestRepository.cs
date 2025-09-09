namespace makeup.Models.Repositories;

public interface INotifyRequestRepository
{
    Task<NotifyRequest?> GetByIdAsync(int id);
    Task<IEnumerable<NotifyRequest>> GetByProductIdAsync(int productId);
    Task<IEnumerable<NotifyRequest>> GetByUserIdAsync(Guid userId);
    Task AddAsync(NotifyRequest request);
    Task RemoveAsync(int id);
    Task<IEnumerable<NotifyRequest>> GetPendingRequestsAsync(int productId);
}