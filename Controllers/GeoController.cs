// Controllers/GeoController.cs
using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using makeup.Infrastructure; // ✅ GeoFileStore burada
using System.Linq;

[ApiController]
[Route("api/geo")]
public class GeoController : ControllerBase
{
    private readonly GeoFileStore _geo;

    // TR kültürü ve sıralama karşılaştırıcısı tek yerde
    private static readonly CultureInfo Tr = CultureInfo.GetCultureInfo("tr-TR");
    private static readonly StringComparer TrIgnoreCase = StringComparer.Create(Tr, ignoreCase: true);

    public GeoController(GeoFileStore geo) { _geo = geo; }

    [HttpGet("cities")]
    public async Task<IActionResult> Cities(CancellationToken ct)
    {
        var rows = await _geo.GetCitiesAsync();
        var data = rows
            .OrderBy(c => c.sehir_adi, TrIgnoreCase)
            .Select(c => new
            {
                id = int.TryParse(c.sehir_id, out var idVal) ? idVal : -1,
                name = ToTitle(c.sehir_adi)
            })
            .Where(x => x.id > 0);
        return Ok(data);
    }

    [HttpGet("districts")]
    public async Task<IActionResult> Districts([FromQuery] int cityId, CancellationToken ct)
    {
        if (cityId <= 0) return BadRequest("Geçersiz cityId.");

        var rows = await _geo.GetDistrictsAsync();
        var data = rows
            .Where(d => d.sehir_id == cityId.ToString())
            .OrderBy(d => d.ilce_adi, TrIgnoreCase)
            .Select(d => new
            {
                id = int.TryParse(d.ilce_id, out var idVal) ? idVal : -1,
                name = ToTitle(d.ilce_adi)
            })
            .Where(x => x.id > 0);
        return Ok(data);
    }

    [HttpGet("neighborhoods")]
    public async Task<IActionResult> Neighborhoods([FromQuery] int districtId, CancellationToken ct)
    {
        if (districtId <= 0) return BadRequest("Geçersiz districtId.");

        var rows = await _geo.GetNeighborhoodsByDistrictAsync(districtId.ToString());
        var data = rows
            .OrderBy(n => n.mahalle_adi, TrIgnoreCase)
            .Select(n => new
            {
                id = int.TryParse(n.mahalle_id, out var idVal) ? idVal : -1,
                name = ToTitle(n.mahalle_adi)
            })
            .Where(x => x.id > 0);
        return Ok(data);
    }

    private static string ToTitle(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return string.Empty;
        var t = s.Trim();

        // “MAHALLESİ” gibi TAM BÜYÜK geldiyse baş harfleri düzelt
        bool hasLower = t.Any(char.IsLower);
        if (!hasLower) t = Tr.TextInfo.ToTitleCase(t.ToLower(Tr));

        return t;
    }
}
