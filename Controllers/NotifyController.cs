namespace makeup.Controllers;

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using makeup.Models.Repositories;
using makeup.Models.Repositories.Entities;

[ApiController]
[Route("api/notify")]
[Authorize] 
public class NotifyController : ControllerBase
{
    private readonly AppDbContext _ctx;
    private readonly INotifyRequestRepository _repo;

    public NotifyController(AppDbContext ctx, INotifyRequestRepository repo)
    {
        _ctx = ctx; _repo = repo;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost("product/{productId:int}")]
    public async Task<IActionResult> Add(int productId)
    {
        var p = await _ctx.Products.FindAsync(productId);
        if (p is null) return NotFound("Ürün bulunamadı");

        await _repo.AddAsync(new NotifyRequest
        {
            ProductId = productId,
            UserId = CurrentUserId,
            RequestDate = DateTime.UtcNow
        });

        return Ok(new { success = true });
    }

    // (opsiyonel) kullanıcının bekledikleri
    [HttpGet("mine")]
    public async Task<IActionResult> Mine()
        => Ok(await _repo.GetByUserIdAsync(CurrentUserId));

    // (opsiyonel) kaydı sil
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Remove(int id)
    {
        await _repo.RemoveAsync(id);
        return NoContent();
    }
}