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
    
}