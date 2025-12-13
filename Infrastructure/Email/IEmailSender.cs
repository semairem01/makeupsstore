namespace makeup.Infrastructure.Email;

public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string htmlBody, string? plainTextBody = null);
    Task SendPasswordResetEmailAsync(string toEmail, string resetToken, string userName);
    Task SendWelcomeEmailAsync(string toEmail, string userName);
    Task SendOrderConfirmationAsync(string toEmail, string userName, int orderId, decimal total);
}