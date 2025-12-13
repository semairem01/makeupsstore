using makeup.Models.Repositories.Entities;

namespace makeup.Models.Repositories;

public class CartItem //sepetteki ürünler
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int Quantity { get; set; } //kullanıcının eklediği miktar 
    public Guid UserId { get; set; }
    public AppUser AppUser { get; set; } = null!;
    
    public int? VariantId { get; set; }
    public ProductVariant? Variant { get; set; }
}