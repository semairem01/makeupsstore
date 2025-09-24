using System.Security.Claims;
using makeup.Models.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace makeup.Controllers;

// Controllers/FavoritesController.cs
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FavoritesController : ControllerBase
{
    private readonly AppDbContext _ctx;
    public FavoritesController(AppDbContext ctx) { _ctx = ctx; }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult> List()
    {
        var list = await _ctx.FavoriteProducts
            .Where(f => f.UserId == CurrentUserId)
            .Include(f => f.Product)
            .Select(f => new {
                f.ProductId,
                f.CreatedAt,
                f.Product.Name,
                f.Product.Brand,
                f.Product.Price,
                f.Product.ImageUrl
            }).ToListAsync();
        return Ok(list);
    }

    [HttpPost("{productId:int}")]
    public async Task<ActionResult> Add(int productId)
    {
        var exists = await _ctx.FavoriteProducts.AnyAsync(f => f.UserId == CurrentUserId && f.ProductId == productId);
        if (!exists)
        {
            _ctx.FavoriteProducts.Add(new FavoriteProduct { UserId = CurrentUserId, ProductId = productId });
            await _ctx.SaveChangesAsync();
        }
        return Ok();
    }

    [HttpDelete("{productId:int}")]
    public async Task<ActionResult> Remove(int productId)
    {
        var fav = await _ctx.FavoriteProducts.FirstOrDefaultAsync(f => f.UserId == CurrentUserId && f.ProductId == productId);
        if (fav != null)
        {
            _ctx.FavoriteProducts.Remove(fav);
            await _ctx.SaveChangesAsync();
        }
        return Ok();
    }
}
