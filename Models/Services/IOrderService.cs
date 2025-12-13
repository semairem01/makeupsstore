using makeup.Models.Repositories;
using makeup.Models.Services.Dtos;

namespace makeup.Models.Services;

public interface IOrderService
{
    Task<IEnumerable<OrderDto>> GetAllAsync(Guid userId); // Kullanıcının tüm siparişlerini getir
    Task<OrderDto?> GetByIdAsync(int id, Guid userId);     // Tek bir sipariş getir
    Task<ServiceResult<OrderDto>> CreateAsync(OrderCreateDto dto, Guid userId); // Yeni sipariş oluştur
    Task<ServiceResult<bool>> DeleteAsync(int id, Guid userId); // Siparişi iptal et
    Task<ServiceResult<OrderDto>> CheckoutAsync(
        Guid userId, 
        decimal shippingFee, 
        string shippingMethod, 
        ShippingSnapshotDto snapshot,
        string? discountCode = null,
        decimal discountAmount = 0m,
        int discountPercentage = 0
    );
    
    Task<ServiceResult<bool>> CancelOrderAsync(int orderId, Guid userId);
    
    Task<IEnumerable<AdminOrderListItemDto>> AdminListAsync();
    Task<ServiceResult<OrderDto>> AdminUpdateAsync(int orderId, AdminOrderUpdateDto dto);
    OrderDto MapToDto(Order order);
}