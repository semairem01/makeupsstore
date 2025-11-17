using System.Text.Json;
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
            .Include(o => o.OrderItems).ThenInclude(oi => oi.Product)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.Variant)
            .FirstOrDefaultAsync(o => o.Id == orderId);
    }

    public async Task<Order?> GetByReturnCodeAsync(string returnCode)
    {
        return await _context.Orders
            .Include(o => o.OrderItems).ThenInclude(oi => oi.Product)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.Variant)
            .FirstOrDefaultAsync(o => o.ReturnCode == returnCode);
    }
    
    public async Task<IEnumerable<Order>> GetByUserIdAsync(Guid userId)
    {
        return await _context.Orders
            .Where(o => o.UserId == userId)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.Product)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.Variant)
            .ToListAsync();
    }

    public async Task<IEnumerable<Order>> GetAllAsync()
    {
        return await _context.Orders
            .Include(o => o.OrderItems).ThenInclude(oi => oi.Product)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.Variant)
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

    public async Task CancelOrderAsync(int orderId, Guid userId)
    {
        var order = await _context.Orders
            .Include(o => o.OrderItems).ThenInclude(oi => oi.Product)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.Variant)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId);

        if (order == null)
            throw new Exception("Order not found.");

        if (order.Status == OrderStatus.IptalEdildi)
            throw new Exception("Order already cancelled.");

        if (order.Status == OrderStatus.Kargoda || order.Status == OrderStatus.TeslimEdildi)
            throw new Exception("Cannot cancel order after shipping.");

        order.Status = OrderStatus.IptalEdildi;

        foreach (var item in order.OrderItems)
        {
            if (item.VariantId.HasValue && item.Variant != null)
            {
                item.Variant.StockQuantity += item.Quantity;
            }
            else if (item.Product != null)
            {
                item.Product.StockQuantity += item.Quantity;
            }
        }

        await _context.SaveChangesAsync();
    }

    public async Task RequestReturnAsync(int orderId, Guid userId, string reason, string? notes, List<int> returnItemIds)
    {
        var order = await _context.Orders
            .Include(o => o.OrderItems)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId);

        if (order == null)
            throw new Exception("Order not found.");

        if (order.Status != OrderStatus.TeslimEdildi)
            throw new Exception("Only delivered orders can be returned.");

        var daysSinceDelivery = (DateTime.UtcNow - order.OrderDate).Days;
        if (daysSinceDelivery > 15)
            throw new Exception("Return period expired (15 days limit).");

        if (returnItemIds == null || !returnItemIds.Any())
            throw new Exception("Please select at least one item to return.");

        var invalidItems = returnItemIds.Where(id => !order.OrderItems.Any(oi => oi.Id == id)).ToList();
        if (invalidItems.Any())
            throw new Exception("Some selected items are not part of this order.");
        
        order.ReturnStatus = ReturnStatus.Requested;
        order.ReturnRequestDate = DateTime.UtcNow;
        order.ReturnReason = reason;
        order.ReturnNotes = notes;
        order.ReturnItemsJson = JsonSerializer.Serialize(returnItemIds);

        await _context.SaveChangesAsync();
    }
    
    public async Task<string> ApproveReturnAsync(int orderId, string returnAddress, string? shippingInfo, string? adminNotes)
    {
        var order = await _context.Orders
            .Include(o => o.OrderItems).ThenInclude(oi => oi.Product)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.Variant)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
            throw new Exception("Order not found.");

        if (order.ReturnStatus != ReturnStatus.Requested)
            throw new Exception("Order is not awaiting return approval.");

        if (string.IsNullOrWhiteSpace(order.ReturnCode))
        {
            order.ReturnCode = GenerateReturnCode();
        }
        
        order.ReturnStatus = ReturnStatus.Approved;
        order.ReturnApprovedDate = DateTime.UtcNow;
        order.ReturnAdminNotes = adminNotes;
        order.ReturnAddress = returnAddress;
        order.ReturnShippingInfo = shippingInfo;

        // Calculate refund amount
        List<int>? returnItemIds = null;
        if (!string.IsNullOrWhiteSpace(order.ReturnItemsJson))
        {
            try
            {
                returnItemIds = JsonSerializer.Deserialize<List<int>>(order.ReturnItemsJson);
            }
            catch { }
        }

        decimal refundAmount = 0;
        foreach (var item in order.OrderItems)
        {
            if (returnItemIds == null || returnItemIds.Contains(item.Id))
            {
                refundAmount += item.UnitPrice * item.Quantity;
            }
        }

        order.RefundAmount = refundAmount;

        await _context.SaveChangesAsync();

        return order.ReturnCode ?? "";
    }

    public async Task RejectReturnAsync(int orderId, string? adminNotes)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
            throw new Exception("Order not found.");

        if (order.ReturnStatus != ReturnStatus.Requested)
            throw new Exception("Order is not awaiting return review.");

        order.ReturnStatus = ReturnStatus.Rejected;
        order.ReturnApprovedDate = DateTime.UtcNow;
        order.ReturnAdminNotes = adminNotes;

        await _context.SaveChangesAsync();
    }
    
    public async Task UpdateReturnTrackingAsync(int orderId, Guid userId, string trackingNumber)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId);

        if (order == null)
            throw new Exception("Order not found.");

        if (order.ReturnStatus != ReturnStatus.Approved)
            throw new Exception("Return must be approved first.");

        order.ReturnTrackingNumber = trackingNumber;
        order.ReturnShippedDate = DateTime.UtcNow;
        order.ReturnStatus = ReturnStatus.InTransit;

        await _context.SaveChangesAsync();
    }
    
    public async Task MarkReturnReceivedAsync(int orderId)
    {
        var order = await _context.Orders
            .Include(o => o.OrderItems).ThenInclude(oi => oi.Product)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.Variant)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
            throw new Exception("Order not found.");

        if (order.ReturnStatus != ReturnStatus.InTransit)
            throw new Exception("Return is not in transit.");

        order.ReturnStatus = ReturnStatus.Received;
        order.ReturnReceivedDate = DateTime.UtcNow;

        // Restore stock
        List<int>? returnItemIds = null;
        if (!string.IsNullOrWhiteSpace(order.ReturnItemsJson))
        {
            try
            {
                returnItemIds = JsonSerializer.Deserialize<List<int>>(order.ReturnItemsJson);
            }
            catch { }
        }

        foreach (var item in order.OrderItems)
        {
            if (returnItemIds == null || returnItemIds.Contains(item.Id))
            {
                if (item.VariantId.HasValue && item.Variant != null)
                {
                    item.Variant.StockQuantity += item.Quantity;
                }
                else if (item.Product != null)
                {
                    item.Product.StockQuantity += item.Quantity;
                }
            }
        }

        await _context.SaveChangesAsync();
    }
    
    public async Task CompleteRefundAsync(int orderId, decimal refundAmount, string refundMethod, string? transactionId)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
            throw new Exception("Order not found.");

        if (order.ReturnStatus != ReturnStatus.Received && order.ReturnStatus != ReturnStatus.Inspecting)
            throw new Exception("Return must be received first.");

        order.ReturnStatus = ReturnStatus.RefundCompleted;
        order.RefundAmount = refundAmount;
        order.RefundMethod = refundMethod;
        order.RefundTransactionId = transactionId;
        order.RefundProcessedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }
    
    private string GenerateReturnCode()
    {
        // Format: RET-YYYYMMDD-XXXXXX
        var date = DateTime.UtcNow.ToString("yyyyMMdd");
        var random = new Random().Next(100000, 999999);
        return $"RET-{date}-{random}";
    }
    
}