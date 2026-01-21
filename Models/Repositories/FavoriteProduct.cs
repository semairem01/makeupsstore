using makeup.Models.Repositories.Entities;

namespace makeup.Models.Repositories;

public class FavoriteProduct
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public int ProductId { get; set; }
    public int? VariantId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public AppUser AppUser { get; set; } = null!;
    public Product Product { get; set; } = null!;
    
    public ProductVariant? Variant { get; set; }
}