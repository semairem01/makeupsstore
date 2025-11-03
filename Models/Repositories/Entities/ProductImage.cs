// Models/Repositories/Entities/ProductImage.cs
namespace makeup.Models.Repositories.Entities;

public class ProductImage
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public int? VariantId { get; set; }
    public ProductVariant? Variant { get; set; }

    public string Url { get; set; } = null!;
    public string? Alt { get; set; }
    public int SortOrder { get; set; } = 0;
    public bool IsPrimary { get; set; } = false; // kapak/öne çıkan
}