using System.Security.Claims;
using makeup.Models.Repositories.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace makeup.Controllers;

// Controllers/ProfileController.cs
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly UserManager<AppUser> _users;
    private readonly IWebHostEnvironment _env;

    public ProfileController(UserManager<AppUser> users, IWebHostEnvironment env)
    {
        _users = users; _env = env;
    }

    private async Task<AppUser?> Me() =>
        await _users.FindByIdAsync(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public record ProfileDto(string Email, string? FirstName, string? LastName, string? Phone, string? AvatarUrl);
    public record UpdateDto(string? FirstName, string? LastName, string? Phone);

    [HttpGet]
    public async Task<ActionResult<ProfileDto>> Get()
    {
        var u = await Me(); if (u is null) return Unauthorized();
        return Ok(new ProfileDto(u.Email!, u.FirstName, u.LastName, u.Phone, u.AvatarUrl));
    }

    [HttpPut]
    public async Task<ActionResult> Update([FromBody] UpdateDto dto)
    {
        var u = await Me(); if (u is null) return Unauthorized();
        u.FirstName = dto.FirstName; u.LastName = dto.LastName; u.Phone = dto.Phone;
        var res = await _users.UpdateAsync(u);
        return res.Succeeded ? Ok() : BadRequest(string.Join("; ", res.Errors.Select(e => e.Description)));
    }

    [HttpPost("avatar")]
    [RequestSizeLimit(5_000_000)]
    public async Task<ActionResult> UploadAvatar(IFormFile file)
    {
        var u = await Me(); if (u is null) return Unauthorized();
        if (file == null || file.Length == 0) return BadRequest("Dosya yok.");
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        if (!allowed.Contains(ext)) return BadRequest("Sadece jpg/png/webp.");

        var fname = $"{u.Id:N}{ext}";
        var folder = Path.Combine(_env.WebRootPath, "images", "avatars");
        Directory.CreateDirectory(folder);
        var path = Path.Combine(folder, fname);
        await using var fs = System.IO.File.Create(path);
        await file.CopyToAsync(fs);

        u.AvatarUrl = $"/images/avatars/{fname}";
        await _users.UpdateAsync(u);
        return Ok(new { avatarUrl = u.AvatarUrl });
    }
}
