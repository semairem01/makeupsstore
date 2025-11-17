using System.Security.Claims;
using makeup.Models.Services;
using makeup.Models.Services.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using makeup.Models.Repositories;
using makeup.Infrastructure;

namespace makeup.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class OrderController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly AppDbContext _db;
    private readonly GeoFileStore _geo;
    private readonly IOrderRepository _orderRepository;

    public OrderController(
        IOrderService orderService, 
        AppDbContext db, 
        GeoFileStore geo,
        IOrderRepository orderRepository)
    {
        _orderService = orderService;
        _db = db;
        _geo = geo;
        _orderRepository = orderRepository;
    }

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

    [HttpGet("return/{returnCode}")]
    public async Task<ActionResult<OrderDto>> GetByReturnCode(string returnCode)
    {
        var order = await _orderRepository.GetByReturnCodeAsync(returnCode);
        if (order == null || order.UserId != CurrentUserId) 
            return NotFound("Return not found.");
        
        return Ok(_orderService.MapToDto(order));
    }

    [HttpPost("checkout")]
public async Task<ActionResult<OrderDto>> Checkout([FromBody] CheckoutRequestDto? dto)
{
    var shippingFee = dto?.ShippingFee ?? 0m;
    var shippingMethod = string.IsNullOrWhiteSpace(dto?.ShippingMethod) ? "standard" : dto!.ShippingMethod;
    
    // ✅ Discount code kontrolü
    string? discountCode = dto?.DiscountCode;
    decimal discountAmount = 0m;
    int discountPercentage = 0;

    if (!string.IsNullOrWhiteSpace(discountCode))
    {
        var discount = await _db.DiscountCodes
            .FirstOrDefaultAsync(d => d.Code == discountCode && !d.IsUsed);

        if (discount == null)
        {
            return BadRequest("Invalid or already used discount code");
        }

        // User kontrolü
        if (discount.UserId.HasValue && discount.UserId != CurrentUserId)
        {
            return BadRequest("This discount code doesn't belong to you");
        }

        // Cart toplamını hesapla
        var cartItems = await _db.CartItems
            .Include(ci => ci.Product)
            .Include(ci => ci.Variant)
            .Where(ci => ci.UserId == CurrentUserId)
            .ToListAsync();

        var cartTotal = cartItems.Sum(ci =>
        {
            var unitPrice = ci.Variant != null
                ? (ci.Variant.DiscountPercent.HasValue
                    ? ci.Variant.Price * (1 - ci.Variant.DiscountPercent.Value / 100)
                    : ci.Variant.Price)
                : (ci.Product.DiscountPercent.HasValue
                    ? ci.Product.Price * (1 - ci.Product.DiscountPercent.Value / 100)
                    : ci.Product.Price);
            return unitPrice * ci.Quantity;
        });

        // Minimum tutar kontrolü
        if (cartTotal < discount.MinimumOrderAmount)
        {
            return BadRequest($"Minimum order amount is ₺{discount.MinimumOrderAmount:N2} for this discount");
        }

        discountAmount = (cartTotal * discount.DiscountPercentage) / 100;
        discountPercentage = discount.DiscountPercentage;

        // İndirimi kullanıldı olarak işaretle
        discount.IsUsed = true;
        discount.UsedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    ShippingSnapshotDto? snapshot = null;

    if (dto?.AddressId is int addrId && addrId > 0)
    {
        var addr = await _db.Addresses
            .FirstOrDefaultAsync(a => a.Id == addrId && a.UserId == CurrentUserId);

        if (addr is null)
            return BadRequest("Address not found or doesn't belong to you.");

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

    // ✅ Discount bilgilerini service'e gönder
    var result = await _orderService.CheckoutAsync(
        CurrentUserId, 
        shippingFee, 
        shippingMethod, 
        snapshot,
        discountCode,
        discountAmount,
        discountPercentage
    );

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

    public record ReturnRequestDto(string Reason, string? Notes, List<int> ReturnItemIds);

    [HttpPost("{id:int}/return")]
    public async Task<IActionResult> RequestReturn(int id, [FromBody] ReturnRequestDto dto)
    {
        try
        {
            await _orderRepository.RequestReturnAsync(id, CurrentUserId, dto.Reason, dto.Notes, dto.ReturnItemIds);
            
            var order = await _orderRepository.GetByIdAsync(id);
            
            return Ok(new { 
                success = true, 
                message = "Return request submitted successfully.",
                returnCode = order?.ReturnCode
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    public record ReturnTrackingDto(string TrackingNumber);

    [HttpPost("{id:int}/return-tracking")]
    public async Task<IActionResult> UpdateReturnTracking(int id, [FromBody] ReturnTrackingDto dto)
    {
        try
        {
            await _orderRepository.UpdateReturnTrackingAsync(id, CurrentUserId, dto.TrackingNumber);
            return Ok(new { 
                success = true, 
                message = "Return tracking number updated successfully." 
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    private static string ToTitle(string s)
    {
        var tr = System.Globalization.CultureInfo.GetCultureInfo("tr-TR");
        var t = s?.Trim() ?? "";
        if (t.Length > 0 && t.All(ch => !char.IsLower(ch))) t = tr.TextInfo.ToTitleCase(t.ToLower(tr));
        return t;
    }
}