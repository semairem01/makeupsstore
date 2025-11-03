namespace makeup.Models.Repositories.Entities;

public class ProductVariant
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;

    // Satın alınan sku bilgileri
    public string Sku { get; set; } = null!;          // ör: KIKO-LG-46
    public string? Barcode { get; set; }

    // Görünüm
    public string Name { get; set; } = null!;         // ör: "46 Marvellous Mauve" / "1N Ivory"
    public string? ShadeCode { get; set; }            // ör: "46" veya "1N"
    public string? ShadeFamily { get; set; }          // "mauve", "neutral", ...
    public string? HexColor { get; set; }             // "#E7A4B1" (swatch renklendirme için)
    public string? SwatchImageUrl { get; set; }       // küçük nokta görseli istersen
    public string ImageUrl { get; set; } = null!;     // büyük ürün görseli (varyant özel)

    // Fiyat/indirim varyant bazlı olabilir
    public decimal Price { get; set; }
    public decimal? DiscountPercent { get; set; }

    // Stok
    public int StockQuantity { get; set; }
    public bool IsActive { get; set; }                // Stock > 0 ise otomatik true tutulabilir

    // İşlevsel
    public bool IsDefault { get; set; } = false;      // sayfa ilk açılışta gösterilecek varyant
    
    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
}