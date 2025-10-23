using makeup.Models.Services;
using makeup.Models.Services.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using makeup.Models.Repositories.Entities;
using Microsoft.AspNetCore.Identity;

namespace makeup.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthenticationService _authenticationService;
    private readonly UserManager<AppUser> _userManager;

    public AuthController(IAuthenticationService authService, UserManager<AppUser> userManager)
    {
        _authenticationService = authService;
        _userManager = userManager;
    }

    [HttpGet("check-username")]
    [AllowAnonymous]
    public async Task<IActionResult> CheckUsername([FromQuery] string username)
    {
        if (string.IsNullOrWhiteSpace(username))
            return BadRequest(new { available = false, message = "Username boş olamaz" });

        var exists = await _userManager.FindByNameAsync(username);
        return Ok(new { available = exists == null });
    }
    
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _authenticationService.RegisterAsync(registerDto);
        
        if (result.Success)
        {
            return Ok(result);
        }

        return BadRequest(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _authenticationService.LoginAsync(loginDto);
        
        if (result.Success)
        {
            return Ok(result);
        }

        return BadRequest(result);
    }

    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        var user = await _authenticationService.GetUserByIdAsync(userId);
        if (user == null)
        {
            return NotFound("Kullanıcı bulunamadı");
        }

        return Ok(user);
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto updateDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        var result = await _authenticationService.UpdateProfileAsync(userId, updateDto);
        
        if (result.Success)
        {
            return Ok(result);
        }

        return BadRequest(result);
    }

    [HttpPut("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto changePasswordDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = GetCurrentUserId();
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        var result = await _authenticationService.ChangePasswordAsync(userId, changePasswordDto);
        
        if (result.Success)
        {
            return Ok(result);
        }

        return BadRequest(result);
    }

    [HttpGet("users")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _authenticationService.GetAllUsersAsync();
        return Ok(users);
    }

    [HttpPut("assign-admin/{userId}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> AssignAdminRole(Guid userId, [FromBody] AssignRoleDto assignRoleDto)
    {
        if (userId != assignRoleDto.UserId)
        {
            return BadRequest("URL'deki kullanıcı ID'si ile body'deki ID eşleşmiyor");
        }

        var result = await _authenticationService.AssignAdminRoleAsync(userId, assignRoleDto.IsAdmin);
        
        if (result.Success)
        {
            return Ok(result);
        }

        return BadRequest(result);
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        // JWT token'lar stateless olduğu için server-side logout yok
        // Client-side'da token'ı silmek yeterli
        return Ok(new { success = true, message = "Çıkış başarılı" });
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }
}