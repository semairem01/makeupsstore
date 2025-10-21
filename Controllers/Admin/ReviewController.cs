using makeup.Models.Repositories;
using makeup.Models.Repositories.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace makeup.Controllers.Admin;

[ApiController]
[Route("api/admin/[controller]")]
[Authorize(Roles = "Admin")]
public class ReviewController : ControllerBase
{
    private readonly AppDbContext _ctx;

    public ReviewController(AppDbContext ctx)
    {
        _ctx = ctx;
    }

    // GET api/admin/review?productId=5&variantId=3&status=Pending
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int? productId,
        [FromQuery] int? variantId,
        [FromQuery] string? status)
    {
        var q = _ctx.ProductReviews
            .AsNoTracking()
            .Include(r => r.AppUser)
            .Include(r => r.Product)
            .Include(r => r.Variant)
            .AsQueryable();

        if (productId.HasValue)
            q = q.Where(r => r.ProductId == productId.Value);

        // ⭐ Varyant bazlı filtre
        if (variantId.HasValue)
            q = q.Where(r => r.VariantId == variantId.Value);

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<ProductReview.ReviewStatus>(status, true, out var st))
            q = q.Where(r => r.Status == st);

        var list = await q
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                r.Id,
                r.ProductId,
                ProductName = r.Product.Name,
                r.VariantId,
                VariantName = r.Variant != null ? r.Variant.Name : null,
                r.Rating,
                r.Comment,
                r.CreatedAt,
                User = (r.AppUser.FirstName + " " + r.AppUser.LastName).Trim(),
                r.IsVerifiedPurchase,
                Status = r.Status.ToString()
            })
            .ToListAsync();

        return Ok(list);
    }

    // POST api/admin/review/{id}/approve
    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id)
    {
        var r = await _ctx.ProductReviews.FindAsync(id);
        if (r == null) return NotFound();

        r.Status = ProductReview.ReviewStatus.Approved;
        await _ctx.SaveChangesAsync();
        return Ok();
    }

    // POST api/admin/review/{id}/reject
    [HttpPost("{id:int}/reject")]
    public async Task<IActionResult> Reject(int id)
    {
        var r = await _ctx.ProductReviews.FindAsync(id);
        if (r == null) return NotFound();

        r.Status = ProductReview.ReviewStatus.Rejected;
        await _ctx.SaveChangesAsync();
        return Ok();
    }

    // DELETE api/admin/review/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var r = await _ctx.ProductReviews.FindAsync(id);
        if (r == null) return NotFound();

        _ctx.ProductReviews.Remove(r);
        await _ctx.SaveChangesAsync();
        return Ok();
    }
}