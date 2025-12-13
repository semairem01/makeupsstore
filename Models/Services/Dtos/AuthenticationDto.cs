using System.ComponentModel.DataAnnotations;

namespace makeup.Models.Services.Dtos;

// Login DTO
public class LoginDto
{
    [Required(ErrorMessage = "Email gereklidir")]
    [EmailAddress(ErrorMessage = "Geçerli bir email adresi giriniz")]
    public string Email { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "Şifre gereklidir")]
    [MinLength(6, ErrorMessage = "Şifre en az 6 karakter olmalıdır")]
    public string Password { get; set; } = string.Empty;
    
    public bool RememberMe { get; set; } = false;
}

// Register DTO
public class RegisterDto
{
    [Required(ErrorMessage = "Kullanıcı adı gereklidir")]
    [StringLength(50, ErrorMessage = "Kullanıcı adı en fazla 50 karakter olabilir")]
    [RegularExpression(@"^[a-zA-Z0-9._-]{3,30}$", ErrorMessage = "Geçersiz kullanıcı adı")]
    public string UserName { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "Email gereklidir")]
    [EmailAddress(ErrorMessage = "Geçerli bir email adresi giriniz")]
    public string Email { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "Şifre gereklidir")]
    [MinLength(6, ErrorMessage = "Şifre en az 6 karakter olmalıdır")]
    [RegularExpression(@"^(?=.*\p{Ll})(?=.*\p{Lu})(?=.*\d)[\p{L}\d@$!%*?&]{6,}$",
        ErrorMessage = "Şifre en az 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir")]
    public string Password { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "Şifre tekrarı gereklidir")]
    [Compare("Password", ErrorMessage = "Şifreler eşleşmiyor")]
    public string ConfirmPassword { get; set; } = string.Empty;
    
    [Phone(ErrorMessage = "Geçerli bir telefon numarası giriniz")]
    public string? PhoneNumber { get; set; }
    
    [StringLength(60, MinimumLength = 2)]
    public string? FullName { get; set; }
}

// Auth Response DTO
public class AuthResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Token { get; set; }
    public AppUserDto? User { get; set; }
    public DateTime? TokenExpiry { get; set; }
    public List<string> Errors { get; set; } = new List<string>();
}

// AppUser DTO
public class AppUserDto
{
    public Guid Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public bool IsAdmin { get; set; }
    public bool EmailConfirmed { get; set; }
    public DateTimeOffset? LockoutEnd { get; set; }
    public bool LockoutEnabled { get; set; }
    public int AccessFailedCount { get; set; }
}

// Update Profile DTO
public class UpdateProfileDto
{
    [Required(ErrorMessage = "Kullanıcı adı gereklidir")]
    [StringLength(50)]
    [RegularExpression(@"^[a-zA-Z0-9._-]{3,30}$", ErrorMessage = "Geçersiz kullanıcı adı")]
    public string UserName { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "Email gereklidir")]
    [EmailAddress(ErrorMessage = "Geçerli bir email adresi giriniz")]
    public string Email { get; set; } = string.Empty;
    
    [Phone(ErrorMessage = "Geçerli bir telefon numarası giriniz")]
    public string? PhoneNumber { get; set; }
}

// Change Password DTO
public class ChangePasswordDto
{
    [Required(ErrorMessage = "Mevcut şifre gereklidir")]
    public string CurrentPassword { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "Yeni şifre gereklidir")]
    [MinLength(6, ErrorMessage = "Şifre en az 6 karakter olmalıdır")]
    [RegularExpression(@"^(?=.*\p{Ll})(?=.*\p{Lu})(?=.*\d)[\p{L}\d@$!%*?&]{6,}$",
        ErrorMessage = "Şifre en az 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir")]
    public string NewPassword { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "Yeni şifre tekrarı gereklidir")]
    [Compare("NewPassword", ErrorMessage = "Şifreler eşleşmiyor")]
    public string ConfirmNewPassword { get; set; } = string.Empty;
}

// Role Management DTOs
public class AssignRoleDto
{
    public Guid UserId { get; set; }
    public bool IsAdmin { get; set; }
}