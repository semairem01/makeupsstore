using makeup.Models.Repositories.Entities;
using Microsoft.EntityFrameworkCore;

namespace makeup.Models.Repositories;

public class OrderRepository : IOrderRepository
{
    private readonly AppDbContext _context;

    public OrderRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Order?> GetByIdAsync(int orderId)
    {
        return await _context.Orders
            .Include(o => o.OrderItems)
            .ThenInclude(oi => oi.Product)
            .FirstOrDefaultAsync(o => o.Id == orderId);
    }

    public async Task<IEnumerable<Order>> GetByUserIdAsync(Guid userId)
    {
        return await _context.Orders
            .Where(o => o.UserId == userId)
            .Include(o => o.OrderItems)
            .ThenInclude(oi => oi.Product)
            .ToListAsync();
    }

    public async Task<IEnumerable<Order>> GetAllAsync()
    {
        return await _context.Orders
            .Include(o => o.OrderItems)
            .ThenInclude(oi => oi.Product)
            .ToListAsync();
    }

    public async Task AddAsync(Order order)
    {
        await _context.Orders.AddAsync(order);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Order order)
    {
        _context.Orders.Update(order);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int orderId)
    {
        var order = await _context.Orders.FindAsync(orderId);
        if (order != null)
        {
            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();
        }
    }
    
    // kullanıcı sadece sipariş alındı veya hazırlanıyor aşamasında siparişi iptal edebilir

    public async Task CancelOrderAsync(int orderId, Guid userId)
    {
        var order = await _context.Orders
            .Include(o => o.OrderItems)
            .ThenInclude(oi => oi.Product)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId);
        
        if(order == null)
            throw new Exception("Sipariş bulunamadı.");
        
        if (order.Status == OrderStatus.IptalEdildi)
            throw new Exception("Sipariş zaten iptal edilmiş.");
        
        if (order.Status == OrderStatus.Kargoda || order.Status == OrderStatus.TeslimEdildi)
            throw new Exception("Sipariş kargoya verildikten sonra iptal edilemez.");

        order.Status = OrderStatus.IptalEdildi;
        
        foreach (var item in order.OrderItems)
        {
            item.Product.StockQuantity += item.Quantity;
        }
        
        await _context.SaveChangesAsync();
    }
}