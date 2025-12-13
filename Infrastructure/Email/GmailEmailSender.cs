using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace makeup.Infrastructure.Email;

public class GmailEmailSender : IEmailSender
{
    private readonly string _smtpHost;
    private readonly int _smtpPort;
    private readonly string _username;
    private readonly string _password;
    private readonly string _fromEmail;
    private readonly string _fromName;
    private readonly string _resetPasswordUrl;
    private readonly ILogger<GmailEmailSender> _logger;

    public GmailEmailSender(
        IConfiguration configuration,
        ILogger<GmailEmailSender> logger)
    {
        _smtpHost = configuration["Smtp:Host"] ?? "smtp.gmail.com";
        _smtpPort = int.Parse(configuration["Smtp:Port"] ?? "587");
        _username = configuration["Smtp:Username"] 
            ?? throw new ArgumentNullException("Smtp:Username is not configured");
        _password = configuration["Smtp:Password"] 
            ?? throw new ArgumentNullException("Smtp:Password is not configured");
        _fromEmail = configuration["Smtp:FromEmail"] ?? _username;
        _fromName = configuration["Smtp:FromName"] ?? "Lunara Beauty";
        _resetPasswordUrl = configuration["Frontend:ResetPasswordUrl"] 
            ?? "http://localhost:3000/reset-password";
        _logger = logger;
    }

    public async Task SendAsync(string toEmail, string subject, string htmlBody, string? plainTextBody = null)
    {
        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_fromName, _fromEmail));
            message.To.Add(new MailboxAddress("", toEmail));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = htmlBody,
                TextBody = plainTextBody ?? StripHtml(htmlBody)
            };

            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            
            // Gmail SMTP bağlantısı
            await client.ConnectAsync(_smtpHost, _smtpPort, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(_username, _password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Email sent successfully to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", toEmail);
            throw;
        }
    }

    public async Task SendPasswordResetEmailAsync(string toEmail, string resetToken, string userName)
    {
        var resetLink = $"{_resetPasswordUrl}?token={Uri.EscapeDataString(resetToken)}&email={Uri.EscapeDataString(toEmail)}";
        
        var subject = "🔐 Password Reset Request - Lunara Beauty";
        
        var htmlBody = $@"
<!DOCTYPE html>
<html lang='tr'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }}
        .header {{ background: linear-gradient(135deg, #ff69b4 0%, #ff85c0 100%); padding: 40px 30px; text-align: center; }}
        .header h1 {{ color: white; font-size: 28px; margin: 0; font-weight: 700; }}
        .logo {{ font-size: 48px; margin-bottom: 10px; }}
        .content {{ padding: 40px 30px; }}
        .content h2 {{ color: #1f1f1f; font-size: 24px; margin-bottom: 16px; }}
        .content p {{ color: #555; line-height: 1.7; margin-bottom: 20px; font-size: 15px; }}
        .button-container {{ text-align: center; margin: 32px 0; }}
        .button {{ display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ff69b4, #ff85c0); color: white; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 8px 24px rgba(255, 105, 180, 0.3); transition: all 0.3s ease; }}
        .button:hover {{ transform: translateY(-2px); box-shadow: 0 12px 32px rgba(255, 105, 180, 0.4); }}
        .warning-box {{ background: #fff3e0; border-left: 4px solid #ff9800; padding: 16px; margin: 24px 0; border-radius: 8px; }}
        .warning-box strong {{ color: #e65100; display: block; margin-bottom: 8px; }}
        .warning-box p {{ color: #f57c00; margin: 0; font-size: 14px; }}
        .link-box {{ background: #f8f8f8; padding: 16px; border-radius: 8px; margin: 20px 0; word-break: break-all; }}
        .link-box code {{ color: #666; font-size: 13px; }}
        .footer {{ background: #fafafa; padding: 24px; text-align: center; border-top: 1px solid #f0f0f0; }}
        .footer p {{ color: #888; font-size: 13px; margin: 8px 0; }}
        .feature-list {{ list-style: none; margin: 24px 0; }}
        .feature-list li {{ padding: 12px 0; color: #555; font-size: 14px; }}
        .feature-list li:before {{ content: '✓'; color: #4caf50; font-weight: bold; margin-right: 10px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <div class='logo'>🌸</div>
            <h1>Lunara Beauty</h1>
        </div>
        
        <div class='content'>
            <h2>Hello {userName},</h2>
            <p>You have requested a password reset for your account. Don’t worry, you can create a new password right away!</p>
            
            <div class='button-container'>
                <a href='{resetLink}' class='button'>🔐 Reset My Password</a>
            </div>
            
            <div class='warning-box'>
                <strong>⚠️Important Security Notice:</strong>
                <p>• This link is valid for 1 hour.</p>
                <p>• This link can only be used once.</p>
                <p>• If you did not make this request, you can safely ignore this email.</p>
                <p>• Do not share your password with anyone.</p>
            </div>
            
            <p style='color: #888; font-size: 14px; margin-top: 30px;'>
                <strong>If the button does not work,</strong> copy the link below into your browser:
            </p>
            <div class='link-box'>
                <code>{resetLink}</code>
            </div>
        </div>
        
        <div class='footer'>
            <p style='font-weight: 600; color: #333; margin-bottom: 12px;'>💖 Lunara Beauty ile Güzelliğinizi Keşfedin</p>
            <p>© 2024 Lunara Beauty. Tüm hakları saklıdır.</p>
            <p>Bu e-posta otomatik olarak gönderilmiştir, lütfen yanıtlamayın.</p>
            <p style='margin-top: 16px; font-size: 12px;'>
                Bu e-postayı almanızın nedeni Lunara Beauty hesabınız için şifre sıfırlama talebinde bulunulmasıdır.
            </p>
        </div>
    </div>
</body>
</html>";

        var plainText = $@"
🌸 Lunara Beauty - Şifre Sıfırlama

Merhaba {userName},

Hesabınız için bir şifre sıfırlama talebinde bulundunuz.

Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:
{resetLink}

⚠️ ÖNEMLİ:
- Bu link 1 saat içinde geçerlidir
- Link yalnızca bir kez kullanılabilir
- Bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz

© 2024 Lunara Beauty
Bu e-posta otomatik olarak gönderilmiştir.
";

        await SendAsync(toEmail, subject, htmlBody, plainText);
    }

    public async Task SendWelcomeEmailAsync(string toEmail, string userName)
    {
        var subject = "🎉 Lunara Beauty'ye Hoş Geldiniz!";
        var frontendUrl = "http://localhost:3000";
        
        var htmlBody = $@"
<!DOCTYPE html>
<html lang='tr'>
<head>
    <meta charset='UTF-8'>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px; margin: 0; }}
        .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }}
        .header {{ background: linear-gradient(135deg, #ff69b4, #ff85c0); padding: 50px 30px; text-align: center; }}
        .header h1 {{ color: white; font-size: 32px; margin: 16px 0 0 0; }}
        .emoji {{ font-size: 64px; }}
        .content {{ padding: 40px 30px; }}
        .content h2 {{ color: #1f1f1f; margin-bottom: 16px; }}
        .content p {{ color: #555; line-height: 1.7; margin-bottom: 16px; }}
        .button {{ display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ff69b4, #ff85c0); color: white; text-decoration: none; border-radius: 12px; font-weight: 700; margin: 24px 0; }}
        .features {{ background: #fff5f8; padding: 24px; border-radius: 12px; margin: 24px 0; }}
        .features ul {{ list-style: none; padding: 0; }}
        .features li {{ padding: 10px 0; color: #555; }}
        .features li:before {{ content: '✨'; margin-right: 10px; }}
        .footer {{ background: #fafafa; padding: 24px; text-align: center; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <div class='emoji'>🌸</div>
            <h1>Hoş Geldiniz!</h1>
        </div>
        <div class='content'>
            <h2>Merhaba {userName}! 💖</h2>
            <p>Lunara Beauty ailesine katıldığınız için çok mutluyuz! Şimdi premium makyaj ve cilt bakım ürünlerimizi keşfetmeye başlayabilirsiniz.</p>
            
            <div class='features'>
                <strong style='color: #e91e63; font-size: 18px;'>Neler Sizi Bekliyor:</strong>
                <ul>
                    <li>Binlerce premium ürün</li>
                    <li>Ücretsiz kargo fırsatları</li>
                    <li>Özel indirimler ve kampanyalar</li>
                    <li>Güvenli alışveriş deneyimi</li>
                </ul>
            </div>
            
            <div style='text-align: center;'>
                <a href='{frontendUrl}' class='button'>🛍️ Alışverişe Başla</a>
            </div>
            
            <p style='color: #888; font-size: 14px; margin-top: 32px;'>
                Herhangi bir sorunuz varsa, bize her zaman ulaşabilirsiniz!
            </p>
        </div>
        <div class='footer'>
            <p style='color: #888; font-size: 13px;'>© 2024 Lunara Beauty. Tüm hakları saklıdır.</p>
        </div>
    </div>
</body>
</html>";

        await SendAsync(toEmail, subject, htmlBody);
    }

    public async Task SendOrderConfirmationAsync(string toEmail, string userName, int orderId, decimal total)
    {
        var subject = $"✅ Siparişiniz Alındı - #{orderId}";
        var orderUrl = $"http://localhost:3000/orders/{orderId}";
        
        var htmlBody = $@"
<!DOCTYPE html>
<html lang='tr'>
<head>
    <meta charset='UTF-8'>
    <style>
        body {{ font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; }}
        h2 {{ color: #1f1f1f; }}
        .order-info {{ background: #fff5f8; padding: 20px; border-radius: 12px; margin: 20px 0; }}
        .order-info p {{ margin: 8px 0; color: #555; }}
        .total {{ font-size: 24px; font-weight: bold; color: #e91e63; }}
        .button {{ display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #ff69b4, #ff85c0); color: white; text-decoration: none; border-radius: 10px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class='container'>
        <h2>Siparişiniz için teşekkürler, {userName}! 🎉</h2>
        <p>Siparişiniz başarıyla alındı ve hazırlanıyor.</p>
        
        <div class='order-info'>
            <p><strong>Sipariş No:</strong> #{orderId}</p>
            <p><strong>Toplam Tutar:</strong> <span class='total'>{total:C2} TL</span></p>
            <p><strong>Durum:</strong> Hazırlanıyor 📦</p>
        </div>
        
        <p>Siparişiniz en kısa sürede kargoya verilecek ve size bilgilendirme yapılacaktır.</p>
        
        <div style='text-align: center;'>
            <a href='{orderUrl}' class='button'>Siparişi Görüntüle</a>
        </div>
    </div>
</body>
</html>";

        await SendAsync(toEmail, subject, htmlBody);
    }

    private static string StripHtml(string html)
    {
        return System.Text.RegularExpressions.Regex.Replace(html, "<.*?>", string.Empty);
    }
}