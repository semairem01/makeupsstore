using System.Security.Claims;
using makeup.Models.Repositories;
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

    public record PaymentRequestDto(
        string CardNumber,
        int ExpMonth,
        int ExpYear,
        string Cvv,
        string NameOnCard,
        decimal ShippingFee
    );

    public record PaymentResponseDto(bool Success, string Message, string PaymentIntentId);

    [HttpPost("simulate")]
    public async Task<ActionResult> Simulate([FromBody] PaymentRequestDto dto)
    {
        // 1) Kullanıcının sepetini yükle
        var items = await _context.CartItems
            .Include(ci => ci.Product)
            .Where(ci => ci.UserId == CurrentUserId)
            .ToListAsync();

        if (!items.Any())
            return BadRequest(new PaymentResponseDto(false, "Sepet boş.", ""));

        // ✅ İndirimli birim fiyat hesaplama (Cart/Checkout ile aynı mantık)
        decimal GetEffectivePrice(Product p)
        {
            var discountRate = p?.DiscountPercent ?? 0m;
            return (discountRate > 0m) 
                ? p.Price * (1 - discountRate / 100m) 
                : p.Price;
        }

        // ✅ Sepet toplamını indirimli fiyatlarla hesapla
        var subtotal = items.Sum(i => GetEffectivePrice(i.Product) * i.Quantity);
        var shipping = Math.Max(0m, dto.ShippingFee);
        var amount = subtotal + shipping;

        // 2) Basit doğrulamalar
        var digitsOnly = (dto.CardNumber ?? string.Empty).Replace(" ", "");
        if (string.IsNullOrWhiteSpace(digitsOnly) || digitsOnly.Length < 12)
            return BadRequest(new PaymentResponseDto(false, "Kart numarası geçersiz.", ""));

        if (dto.ExpMonth is < 1 or > 12)
            return BadRequest(new PaymentResponseDto(false, "Son kullanma ayı geçersiz.", ""));

        if (dto.ExpYear < DateTime.UtcNow.Year || 
            (dto.ExpYear == DateTime.UtcNow.Year && dto.ExpMonth < DateTime.UtcNow.Month))
            return BadRequest(new PaymentResponseDto(false, "Kartın son kullanma tarihi geçmiş.", ""));

        if (string.IsNullOrWhiteSpace(dto.Cvv) || dto.Cvv.Length is < 3 or > 4)
            return BadRequest(new PaymentResponseDto(false, "CVV geçersiz.", ""));

        // 3) %90 başarı, %10 red simülasyonu
        if (Random.Shared.Next(0, 10) == 0)
            return Ok(new PaymentResponseDto(false, "Banka reddetti. Lütfen tekrar deneyin.", ""));

        // 4) Sahte ödeme onayı/id
        var paymentIntentId = $"SIM-{Guid.NewGuid():N}".ToUpperInvariant();

        return Ok(new PaymentResponseDto(
            true,
            $"Ödeme onaylandı. Tutar: {amount:0.00}₺ (Ara Toplam: {subtotal:0.00}₺, Kargo: {shipping:0.00}₺)",
            paymentIntentId
        ));
    }
}