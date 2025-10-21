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
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Variant)   // ✅ varyant da yüklensin
            .FirstOrDefaultAsync(o => o.Id == orderId);
    }

    public async Task<IEnumerable<Order>> GetByUserIdAsync(Guid userId)
    {
        return await _context.Orders
            .Where(o => o.UserId == userId)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Variant)   // ✅ liste sorgusunda da varyant
            .ToListAsync();
    }

    public async Task<IEnumerable<Order>> GetAllAsync()
    {
        return await _context.Orders
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Variant)   // ✅ admin listesi için de
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
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Variant)   // ✅ stok iadesinde varyant lazım
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId);

        if (order == null)
            throw new Exception("Sipariş bulunamadı.");

        if (order.Status == OrderStatus.IptalEdildi)
            throw new Exception("Sipariş zaten iptal edilmiş.");

        if (order.Status == OrderStatus.Kargoda || order.Status == OrderStatus.TeslimEdildi)
            throw new Exception("Sipariş kargoya verildikten sonra iptal edilemez.");

        order.Status = OrderStatus.IptalEdildi;

        foreach (var item in order.OrderItems)
        {
            // ✅ Varyant varsa varyant stoğunu iade et; yoksa ürün stoğunu iade et
            if (item.VariantId.HasValue && item.Variant != null)
            {
                item.Variant.StockQuantity += item.Quantity;
                // İstersen stok 0 üstüne çıktıysa tekrar aktif et:
                // item.Variant.IsActive = true;
            }
            else if (item.Product != null)
            {
                item.Product.StockQuantity += item.Quantity;
                // item.Product.IsActive = true;
            }
        }

        await _context.SaveChangesAsync();
    }
}
