using System.Security.Claims;
using makeup.Models.Repositories;
using makeup.Models.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace makeup.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentController : ControllerBase
{
    private readonly AppDbContext _context;

    public PaymentController(AppDbContext context)
    {
        _context = context;
    }
    
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    
    public record PaymentRequestDto(string CardNumber, int ExpMonth, int ExpYear, string Cvv, string NameOnCard);
    public record PaymentResponseDto(bool Success, string Message, string PaymentIntentId);
    

    [HttpPost("simulate")]
    public async Task<ActionResult> Simulate([FromBody] PaymentRequestDto dto)
    {
        // 1) Kullanıcının sepet toplamını DB’den hesapla
        var items = await _context.CartItems
            .Include(ci => ci.Product)
            .Where(ci => ci.UserId == CurrentUserId)
            .ToListAsync();
        
        if (!items.Any())
            return BadRequest(new PaymentResponseDto(false, "Sepet boş.", ""));

        var amount = items.Sum(i => i.Product.Price * i.Quantity);

        // 2) Basit doğrulamalar (gerçekte PCI DSS vb. gerekir)
        if (string.IsNullOrWhiteSpace(dto.CardNumber) || dto.CardNumber.Replace(" ", "").Length < 12)
            return BadRequest(new PaymentResponseDto(false, "Kart numarası geçersiz.", ""));

        if (dto.ExpMonth is < 1 or > 12) 
            return BadRequest(new PaymentResponseDto(false, "Son kullanma ayı geçersiz.", ""));

        if (dto.ExpYear < DateTime.UtcNow.Year || 
            (dto.ExpYear == DateTime.UtcNow.Year && dto.ExpMonth < DateTime.UtcNow.Month))
            return BadRequest(new PaymentResponseDto(false, "Kartın son kullanma tarihi geçmiş.", ""));

        if (dto.Cvv.Length is < 3 or > 4)
            return BadRequest(new PaymentResponseDto(false, "CVV geçersiz.", ""));

        // 3) Simülasyon sonucu: %90 başarı, %10 başarısızlık
        var rnd = Random.Shared.Next(0, 10);
        if (rnd == 0)
            return Ok(new PaymentResponseDto(false, "Banka reddetti. Lütfen tekrar deneyin.", ""));

        // 4) Sahte ödeme onayı/id
        var paymentIntentId = $"SIM-{Guid.NewGuid():N}".ToUpperInvariant();

        return Ok(new PaymentResponseDto(true, $"Ödeme onaylandı. Tutar: {amount:0.00}₺", paymentIntentId));

    }
}