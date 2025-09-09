using makeup.Models.Repositories.Entities;

namespace makeup.Models.Repositories;

public class NotifyRequest //stok bitince gelince haber ver butonuna tıklayan kullanıcıları takip edecek.
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public Guid UserId { get; set; }
    public AppUser AppUser { get; set; } = null!;
    public DateTime RequestDate { get; set; } 
    
    //stok güncellenince kullanıcıya bildirim gönderilebilir.
    
    
}