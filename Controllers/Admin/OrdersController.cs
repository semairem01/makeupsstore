namespace makeup.Controllers.Admin;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using makeup.Models.Repositories;
using makeup.Models.Repositories.Entities;

[ApiController]
[Route("api/admin/[controller]")]
[Authorize(Roles="Admin")]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _ctx;
    public OrdersController(AppDbContext ctx) { _ctx = ctx; }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] string? q, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var query = _ctx.Orders
            .AsNoTracking()
            .Include(o => o.AppUser)
            .Include(o => o.OrderItems)
            .ThenInclude(i => i.Product)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<OrderStatus>(status, out var st))
            query = query.Where(o => o.Status == st);

        if (from.HasValue) query = query.Where(o => o.OrderDate >= from.Value);
        if (to.HasValue)   query = query.Where(o => o.OrderDate <  to.Value);

        if (!string.IsNullOrWhiteSpace(q))
        {
            q = q.Trim().ToLower();
            query = query.Where(o =>
                o.Id.ToString().Contains(q) ||
                (o.AppUser.FirstName + " " + o.AppUser.LastName).ToLower().Contains(q) ||
                o.AppUser.Email!.ToLower().Contains(q));
        }

        var list = await query
            .OrderByDescending(o => o.OrderDate)
            .Select(o => new {
                o.Id,
                o.OrderDate,
                o.Status,
                customerName = (o.AppUser.FirstName + " " + o.AppUser.LastName).Trim(),
                total = o.OrderItems.Sum(i => i.UnitPrice * i.Quantity),
                o.TrackingNumber
            })
            .ToListAsync();

        return Ok(list);
    }

    public record StatusDto(string Status, string? TrackingNumber);

    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> SetStatus(int id, [FromBody] StatusDto dto)
    {
        if (!Enum.TryParse<OrderStatus>(dto.Status, out var newStatus)) return BadRequest("Geçersiz durum");
        var o = await _ctx.Orders.FirstOrDefaultAsync(x => x.Id == id);
        if (o == null) return NotFound();

        o.Status = newStatus;
        if (!string.IsNullOrWhiteSpace(dto.TrackingNumber))
            o.TrackingNumber = dto.TrackingNumber.Trim();

        await _ctx.SaveChangesAsync();
        return Ok();
    }
}