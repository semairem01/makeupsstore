using System.ComponentModel.DataAnnotations;
using makeup.Models.Repositories.Entities;

namespace makeup.Models.Repositories;

public class Order
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public OrderStatus Status { get; set; }
    
    public decimal ShippingFee { get; set; }
    public string ShippingMethod { get; set; } = "standard";
    public string? TrackingNumber { get; set; }
    
    // Shipping snapshot
    public string ShipFullName { get; set; } = "";
    public string ShipPhone { get; set; } = "";
    public string ShipCity { get; set; } = "";
    public string ShipDistrict { get; set; } = "";
    public string ShipNeighborhood { get; set; } = "";
    public string ShipLine { get; set; } = "";
    public string ShipPostalCode { get; set; } = "";
    public string? ShipNotes { get; set; }
    
    // Return/Refund fields
    public ReturnStatus ReturnStatus { get; set; } = ReturnStatus.None;
    public string? ReturnCode { get; set; }              // Benzersiz iade kodu (örn: RET-2024-001234)
    public DateTime? ReturnRequestDate { get; set; }
    public string? ReturnReason { get; set; }
    public string? ReturnNotes { get; set; }
    public string? ReturnItemsJson { get; set; }
    
    public DateTime? ReturnApprovedDate { get; set; }
    public string? ReturnAdminNotes { get; set; }
    public string? ReturnAddress { get; set; }           // İade adresi (admin sağlar)
    public string? ReturnShippingInfo { get; set; }      // Kargo bilgileri (admin sağlar)
    
    public string? ReturnTrackingNumber { get; set; }    // Kullanıcının iade kargo takip no
    public DateTime? ReturnShippedDate { get; set; }     // Kullanıcı ne zaman kargoladı
    
    public DateTime? ReturnReceivedDate { get; set; }    // Ne zaman alındı
    public DateTime? ReturnInspectedDate { get; set; }   // Ne zaman incelendi
    
    public decimal? RefundAmount { get; set; }           // İade edilecek tutar
    public DateTime? RefundProcessedDate { get; set; }   // Para iadesi yapıldı
    public string? RefundMethod { get; set; }            // İade yöntemi (kredi kartı, banka, vs)
    public string? RefundTransactionId { get; set; }     // İade işlem numarası
    
    public string? DiscountCode { get; set; }        // ✅ YENİ
    public decimal DiscountAmount { get; set; }      // ✅ YENİ
    public int DiscountPercentage { get; set; }
    
    // Navigation
    public AppUser AppUser { get; set; } = null!;
    public List<OrderItem> OrderItems { get; set; } = new();
}