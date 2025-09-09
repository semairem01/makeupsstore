using System.ComponentModel.DataAnnotations;

namespace makeup.Models.Repositories;

public class Product  //Temel ürün ve stok bilgilerini tutar.
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    
    public string Brand { get; set; } = null!;
    
    public string Description { get; set; } = null!;
    
    public decimal Price { get; set; }
    public int StockQuantity { get; set; } //Stok miktarını sadece admin görebilir.
    public bool IsActive { get; set; } //ürün yayında mı?
    public string ImageUrl { get; set; } = null!;
    
    public string? Color { get; set; } 
    public string? Size { get; set; }
    
    public int CategoryId { get; set; }

    public Category Category { get; set; } = null!;
    
}