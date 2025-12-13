namespace makeup.Controllers.Admin;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using makeup.Models.Repositories;
using System.Linq;

[ApiController]
[Route("api/admin/[controller]")]
[Authorize(Roles = "Admin")]
public class MetricsController : ControllerBase
{
    private readonly AppDbContext _ctx;
    public MetricsController(AppDbContext ctx) { _ctx = ctx; }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        // 1) IQueryable başlat
        IQueryable<Order> q = _ctx.Orders.AsNoTracking();

        // 2) Filtreleri uygula
        if (from.HasValue) q = q.Where(o => o.OrderDate >= from.Value);
        if (to.HasValue)   q = q.Where(o => o.OrderDate <  to.Value);

        // 3) Include EN SON
        var orders = await q
            .Include(o => o.OrderItems)
            .ToListAsync();

        decimal totalSales = orders.Sum(o => o.OrderItems.Sum(i => i.UnitPrice * i.Quantity));
        int orderCount = orders.Count;

        var today = DateTime.Today;
        var todays = orders.Where(o => o.OrderDate.Date == today).ToList();
        decimal todaySales = todays.Sum(o => o.OrderItems.Sum(i => i.UnitPrice * i.Quantity));

        var yesterday = today.AddDays(-1);
        var yests = orders.Where(o => o.OrderDate.Date == yesterday).ToList();
        decimal yestSales = yests.Sum(o => o.OrderItems.Sum(i => i.UnitPrice * i.Quantity));
        var delta = yestSales == 0 ? 100 : Math.Round(((todaySales - yestSales) / yestSales) * 100m, 1);

        return Ok(new { sales = totalSales, orders = orderCount, today = todaySales, delta });
    }

    [HttpGet("top-products")]
    public async Task<IActionResult> TopProducts([FromQuery] int limit = 5)
    {
        var q = await _ctx.OrderItems
            .AsNoTracking()
            .Include(oi => oi.Product)
            .GroupBy(oi => new { oi.ProductId, oi.Product.Name })
            .Select(g => new { id = g.Key.ProductId, name = g.Key.Name, totalSold = g.Sum(x => x.Quantity) })
            .OrderByDescending(x => x.totalSold)
            .Take(limit)
            .ToListAsync();

        return Ok(q);
    }
    
    [HttpGet("daily-orders")]
    public async Task<IActionResult> DailyOrders([FromQuery] int days = 7)
    {
        // son N gün (bugün dahil)
        if (days < 1) days = 1;
        var end = DateTime.Today.AddDays(1);            // yarın 00:00 (exclusive)
        var start = DateTime.Today.AddDays(-(days - 1)); // N gün önce 00:00
    
        // veritabanından çek: start <= OrderDate < end
        var raw = await _ctx.Orders
            .AsNoTracking()
            .Where(o => o.OrderDate >= start && o.OrderDate < end)
            .GroupBy(o => o.OrderDate.Date)
            .Select(g => new { date = g.Key, count = g.Count() })
            .ToListAsync();
    
        // Eksik günleri 0’la doldur
        var map = raw.ToDictionary(x => x.date, x => x.count);
        var result = new List<object>();
        for (var d = start.Date; d < end.Date; d = d.AddDays(1))
        {
            map.TryGetValue(d, out var c);
            result.Add(new { date = d, count = c });
        }
    
        // Tarihe göre sırala (artans)
        return Ok(result.OrderBy(x => ((dynamic)x).date));
    }
}