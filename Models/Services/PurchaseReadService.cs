// Services/PurchaseReadService.cs
using Microsoft.EntityFrameworkCore;
using makeup.Models.Repositories;
using makeup.Models.Repositories.Entities;
using makeup.Models.Services;

public class PurchaseReadService : IPurchaseReadService
{
    private readonly AppDbContext _db;
    public PurchaseReadService(AppDbContext db) => _db = db;

    public async Task<bool> HasPurchasedAsync(Guid userId, int productId)
    {
        var validStatuses = new[] { OrderStatus.TeslimEdildi };

        return await _db.Orders
            .Where(o => o.UserId == userId && validStatuses.Contains(o.Status))
            .SelectMany(o => o.OrderItems)
            .AnyAsync(oi => oi.ProductId == productId);
    }
    
    public async Task<bool> HasPurchasedVariantAsync(Guid userId, int variantId)
    {
        var validStatuses = new[] { OrderStatus.TeslimEdildi };

        return await _db.Orders
            .Where(o => o.UserId == userId && validStatuses.Contains(o.Status))
            .SelectMany(o => o.OrderItems)
            .AnyAsync(oi => oi.VariantId == variantId);
    }
}