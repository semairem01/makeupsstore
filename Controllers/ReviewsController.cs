using System.Security.Claims;
using makeup.Models.Repositories;
using makeup.Models.Repositories.Entities;
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
    public ReviewsController(AppDbContext ctx) { _ctx = ctx; }

    private Guid? CurrentUserId =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    // GET api/reviews/product/123  ==> ürünün yorumları + özet
    [HttpGet("product/{productId:int}")]
    public async Task<ActionResult<ReviewListDto>> ListByProduct(int productId)
    {
        // 1) SQL'e çevrilemeyen (switch expression vb.) şeyleri burada yapmıyoruz.
        var raw = await _ctx.ProductReviews
            .Where(r => r.ProductId == productId)
            .Include(r => r.AppUser)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                r.Id,
                r.ProductId,
                r.Rating,
                r.Comment,
                r.CreatedAt,
                r.UpdatedAt,
                FirstName = r.AppUser.FirstName,
                LastName  = r.AppUser.LastName,
                UserName  = r.AppUser.UserName
            })
            .ToListAsync();

        // 2) Bellekte, rahatça string işleme / "display name" üretimi
        static string BuildDisplay(string? first, string? last, string? userName)
        {
            if (!string.IsNullOrWhiteSpace(first))
            {
                var initial = char.ToUpperInvariant(first.Trim()[0]);
                var ln = (last ?? string.Empty).Trim().ToUpperInvariant();
                return $"{initial}. {ln}".Trim();
            }
            return string.IsNullOrWhiteSpace(userName) ? "Kullanıcı" : userName!;
        }

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

        // 3) Analyzer uyarısı olmasın diye dağılım sözlüğünü açıkça kuruyoruz
        var dist = new Dictionary<int, int> { {1,0},{2,0},{3,0},{4,0},{5,0} };
        foreach (var it in items) dist[it.Rating]++;

        return Ok(new ReviewListDto(avg, count, dist, items));
    }

    [HttpGet("my/{productId:int}")]
    [Authorize]
    public async Task<ActionResult<ReviewItemDto>> My(int productId)
    {
        var uid = CurrentUserId!.Value;

        var q = _ctx.ProductReviews
            .Where(r => r.ProductId == productId && r.UserId == uid)
            .Include(r => r.AppUser)
            .Select(r => new
            {
                r.Id, r.ProductId, r.Rating, r.Comment, r.CreatedAt, r.UpdatedAt,
                FirstName = r.AppUser.FirstName,
                LastName  = r.AppUser.LastName,
                UserName  = r.AppUser.UserName
            });

        var raw = await q.FirstOrDefaultAsync();
        if (raw == null) return NotFound();

        string BuildDisplay(string? first, string? last, string? userName)
        {
            if (!string.IsNullOrWhiteSpace(first))
            {
                var initial = char.ToUpperInvariant(first.Trim()[0]);
                var ln = (last ?? string.Empty).Trim().ToUpperInvariant();
                return $"{initial}. {ln}".Trim();
            }
            return string.IsNullOrWhiteSpace(userName) ? "Kullanıcı" : userName!;
        }

        var dto = new ReviewItemDto(
            raw.Id, raw.ProductId, raw.Rating, raw.Comment, raw.CreatedAt, raw.UpdatedAt,
            BuildDisplay(raw.FirstName, raw.LastName, raw.UserName)
        );
        return Ok(dto);
    }
    
    // POST api/reviews
    [HttpPost]
    [Authorize]
    public async Task<ActionResult> Create([FromBody] ReviewCreateDto dto)
    {
        if (dto.Rating is < 1 or > 5) return BadRequest("Puan 1-5 arası olmalı.");
        var uid = CurrentUserId!.Value;

        var exists = await _ctx.ProductReviews
            .AnyAsync(r => r.ProductId == dto.ProductId && r.UserId == uid);
        if (exists) return Conflict("Bu ürüne zaten bir yorumunuz var. Güncelleyebilirsiniz.");

        var r = new ProductReview
        {
            ProductId = dto.ProductId,
            UserId = uid,
            Rating = dto.Rating,
            Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim()
        };
        _ctx.ProductReviews.Add(r);
        await _ctx.SaveChangesAsync();
        return Ok();
    }

    // PUT api/reviews/{id}
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

        await _ctx.SaveChangesAsync();
        return Ok();
    }

    
    // DELETE api/reviews/{id}
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
