namespace makeup.Controllers.Admin;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using makeup.Models.Repositories;

[ApiController]
[Route("api/admin/[controller]")]
[Authorize(Roles="Admin")]
public class ReviewController : ControllerBase
{
    private readonly AppDbContext _ctx;
    public ReviewController(AppDbContext ctx) { _ctx = ctx; }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? productId)
    {
        var q = _ctx.ProductReviews.AsNoTracking().Include(r => r.AppUser).Include(r => r.Product).AsQueryable();
        if (productId.HasValue) q = q.Where(r => r.ProductId == productId.Value);

        var list = await q.OrderByDescending(r => r.CreatedAt).Select(r => new {
            r.Id, r.ProductId, productName = r.Product.Name, r.Rating, r.Comment, r.CreatedAt,
            user = (r.AppUser.FirstName + " " + r.AppUser.LastName).Trim()
        }).ToListAsync();

        return Ok(list);
    }

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