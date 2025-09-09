using makeup.Models.Services.Dtos;

namespace makeup.Models.Services;

public interface IOrderService
{
    Task<IEnumerable<OrderDto>> GetAllAsync(Guid userId); // Kullanıcının tüm siparişlerini getir
    Task<OrderDto?> GetByIdAsync(int id, Guid userId);     // Tek bir sipariş getir
    Task<ServiceResult<OrderDto>> CreateAsync(OrderCreateDto dto, Guid userId); // Yeni sipariş oluştur
    Task<ServiceResult<bool>> DeleteAsync(int id, Guid userId); // Siparişi iptal et
}