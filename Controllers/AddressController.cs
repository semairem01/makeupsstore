// Controllers/AddressController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using makeup.Models.Repositories;
using makeup.Models.Repositories.Entities;
using System.Security.Claims;

namespace makeup.Controllers;

[Route("api/[controller]")]
[ApiController, Authorize]
public class AddressController : ControllerBase
{
    private readonly AppDbContext _db;
    public AddressController(AppDbContext db) => _db = db;

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

    // Tüm adresler: Varsayılan en üstte, sonra id desc
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var list = await _db.Addresses
            .Where(a => a.UserId == CurrentUserId)
            .OrderByDescending(a => a.IsDefault)
            .ThenByDescending(a => a.Id)
            .ToListAsync();

        return Ok(list);
    }

    // Tek adres getir
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var a = await _db.Addresses
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUserId);

        return a is null ? NotFound() : Ok(a);
    }

    // Kullanıcının varsayılan adresi
    [HttpGet("default")]
    public async Task<IActionResult> GetDefault()
    {
        var a = await _db.Addresses
            .Where(x => x.UserId == CurrentUserId)
            .OrderByDescending(x => x.IsDefault)
            .ThenByDescending(x => x.Id)
            .FirstOrDefaultAsync();

        return a is null ? NotFound() : Ok(a);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AddressDto dto)
    {
        // Kullanıcının mevcut adresi var mı?
        var hasAny = await _db.Addresses.AnyAsync(a => a.UserId == CurrentUserId);

        var address = new Address
        {
            UserId = CurrentUserId,
            Title = dto.Title ?? "Ev",
            FullName = dto.FullName ?? "",
            Phone = dto.Phone ?? "",
            CityId = dto.CityId,
            DistrictId = dto.DistrictId,
            NeighborhoodId = dto.NeighborhoodId,
            Street = dto.Street ?? "",
            BuildingNo = dto.BuildingNo,
            ApartmentNo = dto.ApartmentNo,
            PostalCode = dto.PostalCode ?? "",
            Notes = dto.Notes,
            // İlk adres otomatik varsayılan olsun; aksi halde gelen değeri kullan
            IsDefault = !hasAny ? true : dto.IsDefault
        };

        using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            if (address.IsDefault)
            {
                // Önce tüm adresleri default olmaktan çıkar
                var allAddresses = await _db.Addresses
                    .Where(a => a.UserId == CurrentUserId)
                    .ToListAsync();

                foreach (var addr in allAddresses)
                    addr.IsDefault = false;

                await _db.SaveChangesAsync();
            }

            // Yeni adresi ekle
            _db.Add(address);
            await _db.SaveChangesAsync();

            await transaction.CommitAsync();
            return Ok(address);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "Adres eklenemedi", error = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] AddressDto dto)
    {
        var a = await _db.Addresses
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUserId);

        if (a is null) return NotFound();

        a.Title = dto.Title ?? "Ev";
        a.FullName = dto.FullName ?? "";
        a.Phone = dto.Phone ?? "";
        a.CityId = dto.CityId;
        a.DistrictId = dto.DistrictId;
        a.NeighborhoodId = dto.NeighborhoodId;
        a.Street = dto.Street ?? "";
        a.BuildingNo = dto.BuildingNo;
        a.ApartmentNo = dto.ApartmentNo;
        a.PostalCode = dto.PostalCode ?? "";
        a.Notes = dto.Notes;

        using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            if (dto.IsDefault && !a.IsDefault)
            {
                // Mevcut diğer defaultları kapat
                var olds = await _db.Addresses
                    .Where(x => x.UserId == CurrentUserId && x.IsDefault)
                    .ToListAsync();

                olds.ForEach(x => x.IsDefault = false);
                a.IsDefault = true;
            }
            else if (!dto.IsDefault)
            {
                a.IsDefault = false;
            }

            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            return Ok(a);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            return StatusCode(500, new { message = "Adres güncellenemedi", error = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var a = await _db.Addresses
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUserId);

        if (a is null) return NotFound();

        _db.Remove(a);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/default")]
    public async Task<IActionResult> SetDefault(int id)
    {
        var a = await _db.Addresses
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUserId);

        if (a is null) return NotFound();

        using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            // Önce tüm adresleri default olmaktan çıkar
            var allAddresses = await _db.Addresses
                .Where(x => x.UserId == CurrentUserId)
                .ToListAsync();

            foreach (var addr in allAddresses)
                addr.IsDefault = false;

            await _db.SaveChangesAsync();

            // Seçili adresi default yap
            a.IsDefault = true;
            await _db.SaveChangesAsync();

            await transaction.CommitAsync();
            return Ok(a);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "Varsayılan adres güncellenemedi", error = ex.Message });
        }
    }
}

// DTO (Data Transfer Object)
public class AddressDto
{
    public string? Title { get; set; }
    public string? FullName { get; set; }
    public string? Phone { get; set; }
    public int CityId { get; set; }
    public int DistrictId { get; set; }
    public int NeighborhoodId { get; set; }
    public string? Street { get; set; }
    public string? BuildingNo { get; set; }
    public string? ApartmentNo { get; set; }
    public string? PostalCode { get; set; }
    public string? Notes { get; set; }
    public bool IsDefault { get; set; }
}
