using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using makeup.Models.Repositories;
using makeup.Models.Repositories.Entities;

namespace makeup.Controllers.Admin;

[ApiController]
[Route("api/admin/[controller]")]
[Authorize(Roles = "Admin")]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _ctx;
    public OrdersController(AppDbContext ctx) { _ctx = ctx; }

    /// <summary>
    /// List all orders with optional filters (status, date range, search query)
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromQuery] string? q,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var query = _ctx.Orders
            .AsNoTracking()
            .Include(o => o.AppUser)
            .Include(o => o.OrderItems).ThenInclude(i => i.Product)
            .AsQueryable();

        // status filter
        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<OrderStatus>(status, out var st))
        {
            query = query.Where(o => o.Status == st);
        }

        // date filters
        if (from.HasValue) query = query.Where(o => o.OrderDate >= from.Value);
        if (to.HasValue)   query = query.Where(o => o.OrderDate <  to.Value);

        // search by id / full name / email
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(o =>
                o.Id.ToString().Contains(term) ||
                (o.AppUser.FirstName + " " + o.AppUser.LastName).ToLower().Contains(term) ||
                o.AppUser.Email!.ToLower().Contains(term));
        }

        var list = await query
            .OrderByDescending(o => o.OrderDate)
            .Select(o => new
            {
                id            = o.Id,
                orderDate     = o.OrderDate,
                customerName  = ((o.AppUser.FirstName ?? "") + " " + (o.AppUser.LastName ?? "")).Trim(),
                productTotal  = o.OrderItems.Sum(i => i.UnitPrice * i.Quantity),
                shipping      = o.ShippingFee,
                grandTotal    = o.OrderItems.Sum(i => i.UnitPrice * i.Quantity) + o.ShippingFee,
                shippingMethod = o.ShippingMethod,
                statusText     = o.Status.ToString(),
                trackingNumber = o.TrackingNumber
            })
            .ToListAsync();

        return Ok(list);
    }

    public record AdminOrderUpdateDto(string Status, string? TrackingNumber);

    /// <summary>
    /// Update order status or tracking number
    /// </summary>
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> SetStatus(int id, [FromBody] AdminOrderUpdateDto dto)
    {
        if (!Enum.TryParse<OrderStatus>(dto.Status, out var newStatus))
            return BadRequest("Invalid order status");

        var order = await _ctx.Orders.FirstOrDefaultAsync(x => x.Id == id);
        if (order == null) return NotFound("Order not found");

        order.Status = newStatus;
        if (!string.IsNullOrWhiteSpace(dto.TrackingNumber))
            order.TrackingNumber = dto.TrackingNumber.Trim();

        await _ctx.SaveChangesAsync();

        // UI’nin satırı anında güncelleyebilmesi için güncel değerleri döndür.
        return Ok(new
        {
            id = order.Id,
            statusText = order.Status.ToString(),
            trackingNumber = order.TrackingNumber
        });
    }
}
