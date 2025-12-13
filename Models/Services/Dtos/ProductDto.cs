namespace makeup.Models.Services.Dtos;

public record ImageDto(int Id, string Url, string? Alt, bool IsPrimary, int SortOrder);

public record ProductVariantDto(
    int Id,
    int ProductId,
    string Sku,
    string? Barcode,
    string Name,
    string? ShadeCode,
    string? ShadeFamily,
    string? HexColor,
    string? SwatchImageUrl,
    string ImageUrl,
    decimal Price,
    decimal? DiscountPercent,
    int StockQuantity,
    bool IsActive,
    bool IsDefault,
    List<ImageDto> Images
);


// Create/Update istekleri için tek DTO (Upsert)
public record ProductVariantUpsertDto(
    int? Id,                    // create'de null; update'de dolu gelir
    string Sku,
    string? Barcode,
    string Name,
    string? ShadeCode,
    string? ShadeFamily,
    string? HexColor,
    string? SwatchImageUrl,
    string ImageUrl,
    decimal Price,
    decimal? DiscountPercent,
    int StockQuantity,
    bool IsActive,
    bool IsDefault
);

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
    string? Ingredients,
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
    string? Tags,
    List<ProductVariantUpsertDto>? Variants
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
    string? Ingredients,
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
    List<ProductVariantUpsertDto>? Variants
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
    string? Ingredients,
    decimal? DiscountPercent,
    List<ProductVariantUpsertDto>? Variants
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
    string? Ingredients,
    
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
    int RatingCount,
    int StockQuantity,
    List<ProductVariantDto>? Variants,
    List<ImageDto>? Images
    
)

{
    public decimal FinalPrice =>
        DiscountPercent.HasValue && DiscountPercent > 0
            ? Price * (1 - DiscountPercent.Value / 100)
            : Price;
}

public record ProductListItemDto(
    int ProductId,                 // ana ürün id
    int? VariantId,                // varyant kartıysa dolu; ana ürün kartıysa null
    string Name,                   // "Product - Variant" veya sadece "Product"
    string Brand,
    string ImageUrl,
    decimal Price,
    decimal? DiscountPercent,
    decimal FinalPrice,
    bool IsActive,
    string? ShadeFamily,
    string? HexColor
);

    
