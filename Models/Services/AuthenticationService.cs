using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using makeup.Models.Repositories.Entities;
using makeup.Models.Services.Dtos;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace makeup.Models.Services;

public interface IAuthenticationService
{
    Task<AuthResponseDto> LoginAsync(LoginDto loginDto);
    Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto);
    Task<AppUserDto?> GetUserByIdAsync(Guid userId);
    Task<AuthResponseDto> UpdateProfileAsync(Guid userId, UpdateProfileDto updateDto);
    Task<AuthResponseDto> ChangePasswordAsync(Guid userId, ChangePasswordDto changePasswordDto);
    Task<AuthResponseDto> AssignAdminRoleAsync(Guid userId, bool isAdmin);
    Task<List<AppUserDto>> GetAllUsersAsync();
}

public class AuthenticationService : IAuthenticationService
{
    private readonly UserManager<AppUser> _userManager;
    private readonly SignInManager<AppUser> _signInManager;
    private readonly RoleManager<AppRole> _roleManager;
    private readonly IConfiguration _configuration;

    public AuthenticationService(
        UserManager<AppUser> userManager, 
        SignInManager<AppUser> signInManager,
        RoleManager<AppRole> roleManager,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
        _configuration = configuration;
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
    {
        try
        {
            var user = await _userManager.FindByEmailAsync(loginDto.Email);
            if (user == null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Email veya şifre hatalı"
                };
            }

            var result = await _signInManager.CheckPasswordSignInAsync(user, loginDto.Password, true);
            
            if (result.IsLockedOut)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Hesabınız geçici olarak kilitlenmiştir. Lütfen daha sonra tekrar deneyiniz."
                };
            }

            if (!result.Succeeded)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Email veya şifre hatalı"
                };
            }

            var token = await GenerateJwtTokenAsync(user);
            var userDto = MapToAppUserDto(user);

            return new AuthResponseDto
            {
                Success = true,
                Message = "Giriş başarılı",
                Token = token,
                User = userDto,
                TokenExpiry = DateTime.UtcNow.AddHours(24)
            };
        }
        catch (Exception ex)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Giriş sırasında bir hata oluştu",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
    {
        try
        {
            // Email kontrolü
            var existingUser = await _userManager.FindByEmailAsync(registerDto.Email);
            if (existingUser != null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Bu email adresi zaten kullanımda"
                };
            }

            // Username kontrolü
            var existingUserName = await _userManager.FindByNameAsync(registerDto.UserName);
            if (existingUserName != null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Bu kullanıcı adı zaten kullanımda"
                };
            }

            string firstName = "";
            string lastName = "";
            
            if (!string.IsNullOrWhiteSpace(registerDto.FullName))
            {
                var nameParts = registerDto.FullName.Trim().Split(' ', 2); // Max 2 parça
                firstName = nameParts[0];
                lastName = nameParts.Length > 1 ? nameParts[1] : "";
            }
            
            // Yeni kullanıcı oluştur
            var user = new AppUser
            {
                Id = Guid.NewGuid(),
                UserName = registerDto.UserName,
                Email = registerDto.Email,
                PhoneNumber = registerDto.PhoneNumber,
                FirstName = firstName,      // ✅ İlk isim
                LastName = lastName,
                IsAdmin = false, // Default olarak normal kullanıcı
                EmailConfirmed = true // Email doğrulama şimdilik kapalı
                
            };

            var result = await _userManager.CreateAsync(user, registerDto.Password);

            if (!result.Succeeded)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Kayıt sırasında bir hata oluştu",
                    Errors = result.Errors.Select(e => e.Description).ToList()
                };
            }
            await _userManager.AddToRoleAsync(user, "User");
            
            var userDto = MapToAppUserDto(user);
            var token = await GenerateJwtTokenAsync(user);

            return new AuthResponseDto
            {
                Success = true,
                Message = "Kayıt başarılı",
                Token = token,
                User = userDto,
                TokenExpiry = DateTime.UtcNow.AddHours(24)
            };
        }
        catch (Exception ex)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Kayıt sırasında bir hata oluştu",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    public async Task<AppUserDto?> GetUserByIdAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        return user != null ? MapToAppUserDto(user) : null;
    }

    public async Task<AuthResponseDto> UpdateProfileAsync(Guid userId, UpdateProfileDto updateDto)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Kullanıcı bulunamadı"
                };
            }

            // Email değişikliği kontrolü
            if (user.Email != updateDto.Email)
            {
                var emailExists = await _userManager.FindByEmailAsync(updateDto.Email);
                if (emailExists != null)
                {
                    return new AuthResponseDto
                    {
                        Success = false,
                        Message = "Bu email adresi başka bir kullanıcı tarafından kullanılıyor"
                    };
                }
            }

            // Username değişikliği kontrolü
            if (user.UserName != updateDto.UserName)
            {
                var usernameExists = await _userManager.FindByNameAsync(updateDto.UserName);
                if (usernameExists != null)
                {
                    return new AuthResponseDto
                    {
                        Success = false,
                        Message = "Bu kullanıcı adı başka bir kullanıcı tarafından kullanılıyor"
                    };
                }
            }

            user.UserName = updateDto.UserName;
            user.Email = updateDto.Email;
            user.PhoneNumber = updateDto.PhoneNumber;

            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Profil güncellenirken bir hata oluştu",
                    Errors = result.Errors.Select(e => e.Description).ToList()
                };
            }

            return new AuthResponseDto
            {
                Success = true,
                Message = "Profil güncellendi",
                User = MapToAppUserDto(user)
            };
        }
        catch (Exception ex)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Profil güncellenirken bir hata oluştu",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    public async Task<AuthResponseDto> ChangePasswordAsync(Guid userId, ChangePasswordDto changePasswordDto)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Kullanıcı bulunamadı"
                };
            }

            var result = await _userManager.ChangePasswordAsync(user, changePasswordDto.CurrentPassword, changePasswordDto.NewPassword);

            if (!result.Succeeded)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Şifre güncellenirken bir hata oluştu",
                    Errors = result.Errors.Select(e => e.Description).ToList()
                };
            }

            return new AuthResponseDto
            {
                Success = true,
                Message = "Şifre başarıyla güncellendi"
            };
        }
        catch (Exception ex)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Şifre güncellenirken bir hata oluştu",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    public async Task<AuthResponseDto> AssignAdminRoleAsync(Guid userId, bool isAdmin)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Kullanıcı bulunamadı"
                };
            }

            user.IsAdmin = isAdmin;
            
            // Mevcut rolleri kaldır
            var currentRoles = await _userManager.GetRolesAsync(user);
            if (currentRoles.Any())
            {
                await _userManager.RemoveFromRolesAsync(user, currentRoles);
            }

            // Yeni rol ata
            if (isAdmin)
            {
                await _userManager.AddToRoleAsync(user, "Admin");
            }
            else
            {
                await _userManager.AddToRoleAsync(user, "User");
            }

            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Rol güncellenirken bir hata oluştu",
                    Errors = result.Errors.Select(e => e.Description).ToList()
                };
            }

            return new AuthResponseDto
            {
                Success = true,
                Message = isAdmin ? "Kullanıcıya admin yetkisi verildi" : "Kullanıcının admin yetkisi kaldırıldı",
                User = MapToAppUserDto(user)
            };
        }
        catch (Exception ex)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Rol güncellenirken bir hata oluştu",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    public async Task<List<AppUserDto>> GetAllUsersAsync()
    {
        var users = _userManager.Users.ToList();
        return users.Select(MapToAppUserDto).ToList();
    }

    private async Task<string> GenerateJwtTokenAsync(AppUser user)
    {
        var key = Encoding.ASCII.GetBytes(_configuration["JWT:Key"] ?? "your-super-secret-key-here-make-it-longer-than-256-bits-for-security");
        var tokenHandler = new JwtSecurityTokenHandler();

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.UserName ?? string.Empty),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new("IsAdmin", user.IsAdmin.ToString())
        };

        // Kullanıcının rollerini al ve claim'lere ekle
        var userRoles = await _userManager.GetRolesAsync(user);
        foreach (var role in userRoles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(24),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
            Issuer = _configuration["JWT:Issuer"] ?? "MakeupStore",
            Audience = _configuration["JWT:Audience"] ?? "MakeupStore"
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private AppUserDto MapToAppUserDto(AppUser user)
    {
        return new AppUserDto
        {
            Id = user.Id,
            UserName = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            PhoneNumber = user.PhoneNumber,
            IsAdmin = user.IsAdmin,
            EmailConfirmed = user.EmailConfirmed,
            LockoutEnd = user.LockoutEnd,
            LockoutEnabled = user.LockoutEnabled,
            AccessFailedCount = user.AccessFailedCount
        };
    }
}