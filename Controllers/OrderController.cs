using System.Security.Claims;
using System.Linq; // ⬅️ eklendi
using makeup.Models.Services;
using makeup.Models.Services.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

// ⬇️ EK: adresi DB'den okuyacağız
using Microsoft.EntityFrameworkCore;
using makeup.Models.Repositories;

// ⬇️ EK: şehir/ilçe/mahalle isimlerini verisetinden çözeceğiz
using makeup.Infrastructure; // GeoFileStore'ı nereye koyduysan o namespace

namespace makeup.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class OrderController : ControllerBase
{
    private readonly IOrderService _orderService;

    // ⬇️ EK: minimum ek bağımlılıklar
    private readonly AppDbContext _db;
    private readonly GeoFileStore _geo;

    public OrderController(IOrderService orderService, AppDbContext db, GeoFileStore geo)
    {
        _orderService = orderService;
        _db = db;
        _geo = geo;
    }

    // Current authenticated user id
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetAll()
    {
        var orders = await _orderService.GetAllAsync(CurrentUserId);
        return Ok(orders);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<OrderDto>> GetById(int id)
    {
        var order = await _orderService.GetByIdAsync(id, CurrentUserId);
        if (order == null) return NotFound();
        return Ok(order);
    }

    /// <summary>
    /// Creates an order from the user's cart.
    /// Accepts shipping information and optional addressId to snapshot.
    /// </summary>
    [HttpPost("checkout")]
    public async Task<ActionResult<OrderDto>> Checkout([FromBody] CheckoutRequestDto? dto)
    {
        // Defensive defaults
        var shippingFee = dto?.ShippingFee ?? 0m;
        var shippingMethod = string.IsNullOrWhiteSpace(dto?.ShippingMethod) ? "standard" : dto!.ShippingMethod;

        // ⬇️ addressId gönderildiyse snapshot hazırla; yoksa dto'dan doldur
        ShippingSnapshotDto? snapshot = null;

        if (dto?.AddressId is int addrId && addrId > 0)
        {
            var addr = await _db.Addresses
                .FirstOrDefaultAsync(a => a.Id == addrId && a.UserId == CurrentUserId);

            if (addr is null)
                return BadRequest("Adres bulunamadı veya size ait değil.");

            // İsimleri verisetinden çöz (bulunamazsa fallback boş bırakma)
            var cities = await _geo.GetCitiesAsync();
            var cityName = cities.FirstOrDefault(c => c.sehir_id == addr.CityId.ToString())?.sehir_adi ?? "";
            var dists = await _geo.GetDistrictsAsync();
            var distName = dists.FirstOrDefault(d => d.ilce_id == addr.DistrictId.ToString())?.ilce_adi ?? "";
            var nbList = await _geo.GetNeighborhoodsByDistrictAsync(addr.DistrictId.ToString());
            var nbName = nbList.FirstOrDefault(n => n.mahalle_id == addr.NeighborhoodId.ToString())?.mahalle_adi ?? "";

            var lineParts = new[]
            {
                addr.Street,
                string.IsNullOrWhiteSpace(addr.BuildingNo) ? null : $"No:{addr.BuildingNo}",
                string.IsNullOrWhiteSpace(addr.ApartmentNo) ? null : $"D:{addr.ApartmentNo}"
            }.Where(s => !string.IsNullOrWhiteSpace(s));

            snapshot = new ShippingSnapshotDto
            {
                ShipFullName     = addr.FullName,
                ShipPhone        = addr.Phone,
                ShipCity         = ToTitle(cityName),
                ShipDistrict     = ToTitle(distName),
                ShipNeighborhood = ToTitle(nbName),
                ShipLine         = string.Join(" ", lineParts),
                ShipPostalCode   = addr.PostalCode ?? "",
                ShipNotes        = addr.Notes
            };
        }
        else
        {
            // Elle girilen adres bilgileri (opsiyonel alanlar boş gelebilir)
            snapshot = new ShippingSnapshotDto
            {
                ShipFullName     = dto?.ShipFullName     ?? "",
                ShipPhone        = dto?.ShipPhone        ?? "",
                ShipCity         = dto?.ShipCity         ?? "",
                ShipDistrict     = dto?.ShipDistrict     ?? "",
                ShipNeighborhood = dto?.ShipNeighborhood ?? "",
                ShipLine         = dto?.ShipLine         ?? "",
                ShipPostalCode   = dto?.ShipPostalCode   ?? "",
                ShipNotes        = dto?.ShipNotes
            };
        }

        // ⬇️ Servise opsiyonel snapshot ilet (mevcut imzayı bozmayalım)
        var result = await _orderService.CheckoutAsync(CurrentUserId, shippingFee, shippingMethod, snapshot);

        if (!result.Success)
            return BadRequest(result.Message);

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create([FromBody] OrderCreateDto dto)
    {
        var result = await _orderService.CreateAsync(dto, CurrentUserId);
        if (!result.Success) return BadRequest(result.Message);

        return CreatedAtAction(nameof(GetById), new { id = result.Data.Id }, result.Data);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
        var result = await _orderService.DeleteAsync(id, CurrentUserId);
        if (!result.Success) return NotFound(result.Message);

        return NoContent();
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var result = await _orderService.CancelOrderAsync(id, CurrentUserId);
        if (!result.Success)
            return BadRequest(result.Message);

        return Ok(new { success = true, message = result.Message });
    }

    // Türkçe baş harf düzenleme (tam büyük gelen veriler için)
    private static string ToTitle(string s)
    {
        var tr = System.Globalization.CultureInfo.GetCultureInfo("tr-TR");
        var t = s?.Trim() ?? "";
        if (t.Length > 0 && t.All(ch => !char.IsLower(ch))) t = tr.TextInfo.ToTitleCase(t.ToLower(tr));
        return t;
    }
}
