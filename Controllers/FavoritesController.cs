using System.Security.Claims;
using makeup.Models.Repositories;
using makeup.Models.Repositories.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace makeup.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FavoritesController : ControllerBase
{
    private readonly AppDbContext _ctx;
    public FavoritesController(AppDbContext ctx) { _ctx = ctx; }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ✅ Sepetteki gibi: indirimli birim fiyat (ürün)
    private static decimal GetEffectiveUnitPrice(Product p)
    {
        if (p == null) return 0m;
        var rate = (p.DiscountPercent ?? 0m);
        return (rate > 0m) ? p.Price * (1 - rate / 100m) : p.Price;
    }

    // ✅ Sepetteki gibi: indirimli birim fiyat (varyant)
    private static decimal GetEffectiveUnitPrice(ProductVariant v)
    {
        if (v == null) return 0m;
        var rate = (v.DiscountPercent ?? 0m);
        return (rate > 0m) ? v.Price * (1 - rate / 100m) : v.Price;
    }

    [HttpGet]
    public async Task<ActionResult> List()
    {
        var list = await _ctx.FavoriteProducts
            .Where(f => f.UserId == CurrentUserId)
            .Include(f => f.Product)
            .Include(f => f.Variant)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new
            {
                // frontend’in kullandığı isimlerle dönelim
                productId = f.ProductId,
                variantId = f.VariantId,
                createdAt = f.CreatedAt,

                name = f.Product.Name,
                brand = f.Product.Brand,

                // ✅ varyant varsa varyanttan, yoksa üründen (indirimli)
                price = f.VariantId != null
                    ? GetEffectiveUnitPrice(f.Variant!)
                    : GetEffectiveUnitPrice(f.Product),

                imageUrl = f.VariantId != null
                    ? f.Variant!.ImageUrl
                    : f.Product.ImageUrl,

                // opsiyonel (istersen UI’da gösterirsin)
                variantName = f.VariantId != null ? f.Variant!.Name : null
            })
            .ToListAsync();

        return Ok(list);
    }

    // ✅ Aynı route kalsın, sadece query ile variantId alalım
    // POST /api/favorites/12?variantId=5
    [HttpPost("{productId:int}")]
    public async Task<ActionResult> Add(int productId, [FromQuery] int? variantId)
    {
        var exists = await _ctx.FavoriteProducts.AnyAsync(f =>
            f.UserId == CurrentUserId &&
            f.ProductId == productId &&
            f.VariantId == variantId);

        if (!exists)
        {
            _ctx.FavoriteProducts.Add(new FavoriteProduct
            {
                UserId = CurrentUserId,
                ProductId = productId,
                VariantId = variantId
            });
            await _ctx.SaveChangesAsync();
        }

        return Ok();
    }

    // ✅ Aynı route kalsın, query ile variantId gönderirsen sadece onu siler
    // DELETE /api/favorites/12?variantId=5
    // variantId göndermezsen o productId’ye ait tüm favorileri siler (minimal & güvenli)
    [HttpDelete("{productId:int}")]
    public async Task<ActionResult> Remove(int productId, [FromQuery] int? variantId)
    {
        var q = _ctx.FavoriteProducts.Where(f =>
            f.UserId == CurrentUserId &&
            f.ProductId == productId);

        if (variantId.HasValue)
            q = q.Where(f => f.VariantId == variantId);

        var favs = await q.ToListAsync();
        if (favs.Count > 0)
        {
            _ctx.FavoriteProducts.RemoveRange(favs);
            await _ctx.SaveChangesAsync();
        }

        return Ok();
    }
}
