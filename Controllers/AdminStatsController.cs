using makeup.Models.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace makeup.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/admin/stats")]
public class AdminStatsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminStatsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("summary")]
    public IActionResult GetSummary()
    {
        var totalSales = _context.Orders.Sum(o => o.OrderItems.Sum(oi => oi.UnitPrice * oi.Quantity));
        var totalOrders = _context.Orders.Count();
        var totalUsers = _context.Users.Count();

        return Ok(new {
            TotalSales = totalSales,
            TotalOrders = totalOrders,
            TotalUsers = totalUsers
        });
    }

    [HttpGet("popular-products")]
    public IActionResult GetPopularProducts()
    {
        var products = _context.OrderItems
            .GroupBy(oi => oi.Product.Name)
            .Select(g => new { ProductName = g.Key, Quantity = g.Sum(x => x.Quantity) })
            .OrderByDescending(x => x.Quantity)
            .Take(5)
            .ToList();

        return Ok(products);
    }

    [HttpGet("daily-orders")]
    public IActionResult GetDailyOrders()
    {
        var today = DateTime.UtcNow.Date;
        var data = _context.Orders
            .Where(o => o.OrderDate >= today.AddDays(-6))
            .GroupBy(o => o.OrderDate.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToList();

        return Ok(data);
    }
}