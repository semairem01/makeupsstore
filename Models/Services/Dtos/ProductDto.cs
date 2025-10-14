namespace makeup.Models.Services.Dtos;

// Admin ürün ekleme/güncelleme için kullanılacak DTO
public record ProductCreateDto(
    string Name,
    string Brand,
    string Description,
    decimal Price,
    int StockQuantity,
    bool IsActive,
    string ImageUrl,
    string? Color,
    string? Size,
    int CategoryId,
    decimal? DiscountPercent,
    
    int SuitableForSkin,            // SkinTypeFlags (int olarak)
    string? Finish,                 // FinishType?
    string? Coverage,               // CoverageLevel?
    bool Longwear,
    bool Waterproof,
    bool PhotoFriendly,
    bool HasSpf,
    bool FragranceFree,
    bool NonComedogenic,
    string? ShadeFamily,
    string? Tags
);

public record ProductUpdateDto(
    int Id,
    string Name,
    string Brand,
    string Description,
    decimal Price,
    int StockQuantity,
    bool IsActive,
    string ImageUrl,
    string? Color,
    string? Size,
    int CategoryId,
    decimal? DiscountPercent,
    
    int SuitableForSkin,
    string? Finish,
    string? Coverage,
    bool Longwear,
    bool Waterproof,
    bool PhotoFriendly,
    bool HasSpf,
    bool FragranceFree,
    bool NonComedogenic,
    string? ShadeFamily,
    string? Tags
);

public record AdminProductListDto(
    int Id,
    string Name,
    string Brand,
    string Description,
    decimal Price,
    int StockQuantity,
    bool IsActive,
    string ImageUrl,
    string? Color,
    string? Size,
    int CategoryId,
    string CategoryName,
    
    int SuitableForSkin,
    string? Finish,
    string? Coverage,
    bool Longwear,
    bool Waterproof,
    bool PhotoFriendly,
    bool HasSpf,
    bool FragranceFree,
    bool NonComedogenic,
    string? ShadeFamily,
    string? Tags,
    decimal? DiscountPercent
);

// Kullanıcıya ürün listesi/görünümü için DTO (stok bilgisini göstermiyoruz!)
public record ProductDto(
    int Id,
    string Name,
    string Brand,
    string Description,
    decimal Price,
    bool IsActive,
    string ImageUrl,
    string? Color,
    string? Size,
    int CategoryId,
    string CategoryName,
    decimal? DiscountPercent,
    
    int SuitableForSkin,
    string? Finish,
    string? Coverage,
    bool Longwear,
    bool Waterproof,
    bool PhotoFriendly,
    bool HasSpf,
    bool FragranceFree,
    bool NonComedogenic,
    string? ShadeFamily,
    string? Tags,
    
    double? RatingAverage,   // 0..5
    int RatingCount 
  
)
{
    public decimal FinalPrice =>
        DiscountPercent.HasValue && DiscountPercent > 0
            ? Price * (1 - DiscountPercent.Value / 100)
            : Price;
}


    
