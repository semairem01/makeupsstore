// Controllers/PasswordResetController.cs
using makeup.Infrastructure.Email;
using makeup.Models.Repositories;
using makeup.Models.Repositories.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace makeup.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PasswordResetController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<PasswordResetController> _logger;

    public PasswordResetController(
        UserManager<AppUser> userManager,
        IEmailSender emailSender,
        ILogger<PasswordResetController> logger)
    {
        _userManager = userManager;
        _emailSender = emailSender;
        _logger = logger;
    }

    public record ForgotPasswordRequest(string Email);
    public record ResetPasswordRequest(string Email, string Token, string NewPassword);

    /// <summary>
    /// Şifre sıfırlama talebi - Email gönder
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest("Email adresi gerekli.");

        var user = await _userManager.FindByEmailAsync(request.Email);
        
        // ⚠️ Güvenlik: Kullanıcı bulunamasa bile "success" döndür
        // (Email'in sistemde olup olmadığını açığa çıkarma)
        if (user == null)
        {
            _logger.LogWarning("Password reset requested for non-existent email: {Email}", request.Email);
            // Yine de success döndür
            return Ok(new { message = "Eğer bu email kayıtlıysa, şifre sıfırlama linki gönderildi." });
        }

        try
        {
            // Token oluştur (1 saat geçerli)
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            
            // Email gönder
            await _emailSender.SendPasswordResetEmailAsync(
                user.Email!,
                token,
                user.FirstName ?? user.UserName ?? "Kullanıcı"
            );

            _logger.LogInformation("Password reset email sent to {Email}", user.Email);

            return Ok(new { message = "The password reset link has been sent to your email address." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset email to {Email}", request.Email);
            return StatusCode(500, "An error occurred while sending the email. Please try again later.");
        }
    }

    /// <summary>
    /// Şifre sıfırlama - Token ile yeni şifre belirleme
    /// </summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || 
            string.IsNullOrWhiteSpace(request.Token) || 
            string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest("All fields are required.");
        }

        if (request.NewPassword.Length < 6)
        {
            return BadRequest("The password must be at least 6 characters long.");
        }

        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            return BadRequest("Invalid operation.");
        }

        var result = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            _logger.LogWarning("Password reset failed for {Email}: {Errors}", request.Email, errors);
            return BadRequest($"Password reset failed: {errors}");
        }

        _logger.LogInformation("Password reset successful for {Email}", request.Email);

        return Ok(new { message = "Your password has been successfully reset. You can log in now." });
    }
}