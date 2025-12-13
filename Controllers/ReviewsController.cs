using System.Security.Claims;
using makeup.Models.Repositories;
using makeup.Models.Repositories.Entities;
using makeup.Models.Services;
using makeup.Models.Services.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace makeup.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly AppDbContext _ctx;
    private readonly IPurchaseReadService _purchase;

    public ReviewsController(AppDbContext ctx, IPurchaseReadService purchase)
    {
        _ctx = ctx;
        _purchase = purchase;
    }

    private Guid? CurrentUserId =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private static string BuildDisplay(string? first, string? last, string? userName)
    {
        if (!string.IsNullOrWhiteSpace(first))
        {
            var initial = char.ToUpperInvariant(first.Trim()[0]);
            var ln = (last ?? string.Empty).Trim().ToUpperInvariant();
            return $"{initial}. {ln}".Trim();
        }
        return string.IsNullOrWhiteSpace(userName) ? "Kullanıcı" : userName!;
    }

    // GET api/reviews/product/123?variantId=5  ==> ürünün/varyantın yorumları + özet (SADECE ONAYLI)
    [HttpGet("product/{productId:int}")]
    public async Task<ActionResult<ReviewListDto>> ListByProduct(
        int productId,
        [FromQuery] int? variantId)
    {
        var query = _ctx.ProductReviews
            .Where(r => r.ProductId == productId && r.Status == ProductReview.ReviewStatus.Approved);

        // ⭐ Varyant bazlı filtre
        if (variantId.HasValue)
            query = query.Where(r => r.VariantId == variantId.Value);
        else
            query = query.Where(r => r.VariantId == null); // Ürün bazlı yorum

        var raw = await query
            .Include(r => r.AppUser)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                r.Id,
                r.ProductId,
                r.VariantId,
                r.Rating,
                r.Comment,
                r.CreatedAt,
                r.UpdatedAt,
                r.IsVerifiedPurchase,
                r.Status,
                FirstName = r.AppUser.FirstName,
                LastName = r.AppUser.LastName,
                UserName = r.AppUser.UserName
            })
            .ToListAsync();

        var items = raw.Select(r => new ReviewItemDto(
            r.Id,
            r.ProductId,
            r.Rating,
            r.Comment,
            r.CreatedAt,
            r.UpdatedAt,
            BuildDisplay(r.FirstName, r.LastName, r.UserName)
        )).ToList();

        var count = items.Count;
        var avg = count == 0 ? 0 : Math.Round(items.Average(i => i.Rating), 2);

        var dist = new Dictionary<int, int> { { 1, 0 }, { 2, 0 }, { 3, 0 }, { 4, 0 }, { 5, 0 } };
        foreach (var it in items) dist[it.Rating]++;

        return Ok(new ReviewListDto(avg, count, dist, items));
    }

    // GET api/reviews/my/123?variantId=5 - Benim yorumum
    [HttpGet("my/{productId:int}")]
    [Authorize]
    public async Task<ActionResult<ReviewItemDto>> My(
        int productId,
        [FromQuery] int? variantId)
    {
        var uid = CurrentUserId!.Value;

        var query = _ctx.ProductReviews
            .Where(r => r.ProductId == productId && r.UserId == uid);

        // ⭐ Varyant bazlı filtre
        if (variantId.HasValue)
            query = query.Where(r => r.VariantId == variantId.Value);
        else
            query = query.Where(r => r.VariantId == null);

        var raw = await query
            .Include(r => r.AppUser)
            .Select(r => new
            {
                r.Id,
                r.ProductId,
                r.Rating,
                r.Comment,
                r.CreatedAt,
                r.UpdatedAt,
                FirstName = r.AppUser.FirstName,
                LastName = r.AppUser.LastName,
                UserName = r.AppUser.UserName
            })
            .FirstOrDefaultAsync();

        if (raw == null) return NotFound();

        var dto = new ReviewItemDto(
            raw.Id,
            raw.ProductId,
            raw.Rating,
            raw.Comment,
            raw.CreatedAt,
            raw.UpdatedAt,
            BuildDisplay(raw.FirstName, raw.LastName, raw.UserName)
        );

        return Ok(dto);
    }

    // GET api/reviews/recent - Son yorumlar
    [HttpGet("recent")]
    public async Task<ActionResult<IEnumerable<ReviewRecentDto>>> Recent(
        [FromQuery] int take = 6)
    {
        if (take is < 1 or > 24) take = 6;

        var raw = await _ctx.ProductReviews
            .Where(r => r.Status == ProductReview.ReviewStatus.Approved && r.VariantId == null) // Ana ürün yorumları
            .Include(r => r.AppUser)
            .Include(r => r.Product)
            .OrderByDescending(r => r.CreatedAt)
            .Take(take)
            .Select(r => new
            {
                r.Id,
                r.ProductId,
                ProductName = r.Product.Name,
                ProductImageUrl = r.Product.ImageUrl,
                r.Rating,
                r.Comment,
                r.CreatedAt,
                FirstName = r.AppUser.FirstName,
                LastName = r.AppUser.LastName,
                UserName = r.AppUser.UserName
            })
            .ToListAsync();

        var items = raw.Select(r => new ReviewRecentDto(
            r.Id,
            r.ProductId,
            r.ProductName,
            r.ProductImageUrl,
            r.Rating,
            r.Comment,
            r.CreatedAt,
            BuildDisplay(r.FirstName, r.LastName, r.UserName)
        ));

        return Ok(items);
    }

    // POST api/reviews - Yeni yorum (varyant bazlı)
    [HttpPost]
    [Authorize]
    public async Task<ActionResult> Create([FromBody] ReviewCreateDto dto)
    {
        if (dto.Rating is < 1 or > 5) return BadRequest("Puan 1-5 arası olmalı.");

        var uid = CurrentUserId!.Value;

        // ⭐ Varyant bazlı unique kontrol
        var exists = await _ctx.ProductReviews
            .AnyAsync(r =>
                r.ProductId == dto.ProductId &&
                r.VariantId == dto.VariantId &&
                r.UserId == uid);

        if (exists)
            return Conflict("Bu ürüne zaten bir yorumunuz var. Güncelleyebilirsiniz.");

        // Satın alma kontrolü (varyant varsa varyant bazlı, yoksa ürün bazlı)
        var purchased = dto.VariantId.HasValue
            ? await _purchase.HasPurchasedVariantAsync(uid, dto.VariantId.Value)
            : await _purchase.HasPurchasedAsync(uid, dto.ProductId);

        if (!purchased)
            return Forbid("Bu ürüne yorum yazmak için önce satın almanız gerekir.");

        var r = new ProductReview
        {
            ProductId = dto.ProductId,
            VariantId = dto.VariantId,
            UserId = uid,
            Rating = dto.Rating,
            Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim(),
            IsVerifiedPurchase = true,
            Status = ProductReview.ReviewStatus.Pending
        };

        _ctx.ProductReviews.Add(r);
        await _ctx.SaveChangesAsync();

        return Ok(new { r.Id });
    }

    // PUT api/reviews/{id} - Yorum güncelle
    [HttpPut("{id:int}")]
    [Authorize]
    public async Task<ActionResult> Update(int id, [FromBody] ReviewUpdateDto dto)
    {
        if (dto.Rating is < 1 or > 5) return BadRequest("Puan 1-5 arası olmalı.");

        var uid = CurrentUserId!.Value;
        var r = await _ctx.ProductReviews.FirstOrDefaultAsync(x => x.Id == id && x.UserId == uid);

        if (r == null) return NotFound("Yorum bulunamadı.");

        r.Rating = dto.Rating;
        r.Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim();
        r.UpdatedAt = DateTime.UtcNow;
        r.Status = ProductReview.ReviewStatus.Pending;

        await _ctx.SaveChangesAsync();
        return Ok();
    }

    // DELETE api/reviews/{id} - Yorum sil
    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<ActionResult> Delete(int id)
    {
        var uid = CurrentUserId!.Value;
        var r = await _ctx.ProductReviews.FirstOrDefaultAsync(x => x.Id == id && x.UserId == uid);

        if (r == null) return NotFound();

        _ctx.ProductReviews.Remove(r);
        await _ctx.SaveChangesAsync();
        return Ok();
    }
}