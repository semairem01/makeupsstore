namespace makeup.Infrastructure.Email;

public interface IEmailSender
{
    Task SendAsync(
        string to,
        string subject,
        string htmlBody,
        string? plainText = null,
        CancellationToken ct = default);
}