using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace makeup.Infrastructure.Email;

public sealed class SmtpOptions
{
    public string FromName { get; set; } = default!;
    public string FromAddress { get; set; } = default!;
    public string Host { get; set; } = default!;
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string User { get; set; } = default!;
    public string Password { get; set; } = default!;
}

public sealed class SmtpEmailSender : IEmailSender
{
    private readonly SmtpOptions _opt;

    public SmtpEmailSender(IOptions<SmtpOptions> opt)
    {
        _opt = opt.Value;
    }

    public async Task SendAsync(string to, string subject, string htmlBody, string? plainText = null, CancellationToken ct = default)
    {
        using var msg = new MailMessage
        {
            From = new MailAddress(_opt.FromAddress, _opt.FromName),
            Subject = subject,
            Body = string.IsNullOrWhiteSpace(plainText) ? htmlBody : $"{plainText}\n\n----\n{htmlBody}",
            IsBodyHtml = true
        };
        msg.To.Add(new MailAddress(to));

        using var client = new SmtpClient(_opt.Host, _opt.Port)
        {
            EnableSsl = _opt.EnableSsl,
            Credentials = new NetworkCredential(_opt.User, _opt.Password)
        };

        await client.SendMailAsync(msg);
    }
}