using System.ComponentModel.DataAnnotations;
using makeup.Models.Repositories.Entities;

namespace makeup.Models.Repositories;

public class Order
{
    public int Id {get; set;}
    
    public Guid UserId { get; set; }
    public AppUser AppUser { get; set; } = null!;
    
    public DateTime OrderDate { get; set; }
    
    public OrderStatus Status {get; set;} // "Sipariş alımdı" , "Hazırlanıyor" , "Kargoda" , "Teslim Edildi"
    public ICollection<OrderItem> OrderItems { get; set; }
    
    public string? TrackingNumber { get; set; }
    public string? ShippingMethod { get; set; }   // "standard" | "express"
    public decimal ShippingFee { get; set; }
    
    [MaxLength(100)] public string ShipFullName     { get; set; } = "";
    [MaxLength(20)]  public string ShipPhone        { get; set; } = "";
    [MaxLength(64)]  public string ShipCity         { get; set; } = "";
    [MaxLength(64)]  public string ShipDistrict     { get; set; } = "";
    [MaxLength(64)]  public string ShipNeighborhood { get; set; } = "";
    [MaxLength(240)] public string ShipLine         { get; set; } = ""; // Cadde + Bina/Daire
    [MaxLength(10)]  public string ShipPostalCode   { get; set; } = "";
    
}