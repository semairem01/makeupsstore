namespace makeup.Models.Repositories.Entities;

public enum ReturnStatus
{
    None = 0,                    // İade talebi yok
    Requested = 1,               // İade talebi yapıldı
    Approved = 2,                // İade onaylandı (kullanıcı kargolayabilir)
    Rejected = 3,                // İade reddedildi
    InTransit = 4,               // Kargoda (kullanıcıdan gelirken)
    Received = 5,                // İade ürünleri alındı
    Inspecting = 6,              // İnceleniyor
    RefundProcessing = 7,        // İade işlemi yapılıyor
    RefundCompleted = 8,         // İade tamamlandı (para iadesi yapıldı)
    Cancelled = 9                // İade iptali
}

public class ReturnRequest
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Guid UserId { get; set; }
    
    public string Reason { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime RequestDate { get; set; } = DateTime.UtcNow;
    
    public ReturnStatus Status { get; set; } = ReturnStatus.Requested;
    public string? AdminNote { get; set; }
    public DateTime? ReviewedDate { get; set; }
    
    // Navigation
    public Order Order { get; set; } = null!;
    public AppUser AppUser { get; set; } = null!;
}