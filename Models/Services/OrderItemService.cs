using makeup.Models.Repositories;
using makeup.Models.Services.Dtos;

namespace makeup.Models.Services;

public class OrderItemService : IOrderItemService
{
    private readonly IOrderItemRepository _orderItemRepository;

    public OrderItemService(IOrderItemRepository orderItemRepository)
    {
        _orderItemRepository = orderItemRepository;
    }
    
    // Sipariş ID’ye göre tüm OrderItem’ları getir
    public async Task<IEnumerable<OrderItemDto>> GetByOrderIdAsync(int orderId)
    {
        var items = await _orderItemRepository.GetByOrderIdAsync(orderId);
        return items.Select(oi => new OrderItemDto(
            oi.ProductId,
            oi.Product.Name,
            oi.Product.ImageUrl,
            oi.UnitPrice,
            oi.Quantity,
            oi.UnitPrice * oi.Quantity
        )).ToList();
    }
    
    // Tek bir OrderItem getir
    public async Task<OrderItemDto?> GetByIdAsync(int id)
    {
        var item = await _orderItemRepository.GetByIdAsync(id);
        if (item == null) return null;

        return new OrderItemDto(
            item.ProductId,
            item.Product.Name,
            item.Product.ImageUrl,
            item.UnitPrice,
            item.Quantity,
            item.UnitPrice * item.Quantity
        );
    }
}