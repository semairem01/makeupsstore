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
        decimal ShippingFee,
        int Installments = 1  // ✅ Taksit sayısı (varsayılan 1 = peşin)
    );

    public record PaymentResponseDto(
        bool Success, 
        string Message, 
        string PaymentIntentId,
        InstallmentInfo? InstallmentDetails = null
    );

    public record InstallmentInfo(
        int Installments,
        decimal InstallmentAmount,
        decimal TotalAmount,
        decimal InstallmentRate
    );

    public record InstallmentOption(
        int Installments,
        decimal InstallmentRate,
        decimal InstallmentAmount,
        decimal TotalAmount
    );

    // ✅ Taksit oranları tablosu
    private static readonly Dictionary<int, decimal> InstallmentRates = new()
    {
        { 1, 0m },      // Peşin - faizsiz
        { 2, 0.02m },   // 2 taksit - %2
        { 3, 0.04m },   // 3 taksit - %4
        { 4, 0.06m },   // 4 taksit - %6
        { 6, 0.10m },   // 6 taksit - %10
    };

    [HttpGet("installment-options")]
    public async Task<ActionResult<List<InstallmentOption>>> GetInstallmentOptions()
    {
        var items = await _context.CartItems
            .Include(ci => ci.Product)
            .Where(ci => ci.UserId == CurrentUserId)
            .ToListAsync();

        if (!items.Any())
            return BadRequest("Sepet boş.");

        decimal GetEffectivePrice(Product p)
        {
            var discountRate = p?.DiscountPercent ?? 0m;
            return (discountRate > 0m) 
                ? p.Price * (1 - discountRate / 100m) 
                : p.Price;
        }

        var subtotal = items.Sum(i => GetEffectivePrice(i.Product) * i.Quantity);

        var options = new List<InstallmentOption>();

        foreach (var (installments, rate) in InstallmentRates)
        {
            var totalWithRate = subtotal * (1 + rate);
            var installmentAmount = totalWithRate / installments;

            options.Add(new InstallmentOption(
                installments,
                rate,
                Math.Round(installmentAmount, 2),
                Math.Round(totalWithRate, 2)
            ));
        }

        return Ok(options);
    }

    [HttpPost("simulate")]
    public async Task<ActionResult> Simulate([FromBody] PaymentRequestDto dto)
    {
        // 1) Sepet kontrolü
        var items = await _context.CartItems
            .Include(ci => ci.Product)
            .Where(ci => ci.UserId == CurrentUserId)
            .ToListAsync();

        if (!items.Any())
            return BadRequest(new PaymentResponseDto(false, "Sepet boş.", ""));

        decimal GetEffectivePrice(Product p)
        {
            var discountRate = p?.DiscountPercent ?? 0m;
            return (discountRate > 0m) 
                ? p.Price * (1 - discountRate / 100m) 
                : p.Price;
        }

        var subtotal = items.Sum(i => GetEffectivePrice(i.Product) * i.Quantity);
        var shipping = Math.Max(0m, dto.ShippingFee);
        var cartTotal = subtotal + shipping;

        // ✅ Taksit hesaplama
        var installments = Math.Max(1, dto.Installments);
        if (!InstallmentRates.ContainsKey(installments))
            return BadRequest(new PaymentResponseDto(false, "Geçersiz taksit sayısı.", ""));

        var installmentRate = InstallmentRates[installments];
        var totalWithRate = cartTotal * (1 + installmentRate);
        var installmentAmount = totalWithRate / installments;

        // 2) Kart doğrulamaları
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

        // 3) %90 başarı simülasyonu
        if (Random.Shared.Next(0, 10) == 0)
            return Ok(new PaymentResponseDto(false, "Banka reddetti. Lütfen tekrar deneyin.", ""));

        // 4) Başarılı ödeme
        var paymentIntentId = $"SIM-{Guid.NewGuid():N}".ToUpperInvariant();

        var installmentInfo = new InstallmentInfo(
            installments,
            Math.Round(installmentAmount, 2),
            Math.Round(totalWithRate, 2),
            installmentRate
        );

        var message = installments == 1
            ? $"Ödeme onaylandı. Tutar: {totalWithRate:0.00}₺"
            : $"Ödeme onaylandı. {installments} taksit × {installmentAmount:0.00}₺ = {totalWithRate:0.00}₺";

        return Ok(new PaymentResponseDto(
            true,
            message,
            paymentIntentId,
            installmentInfo
        ));
    }
}