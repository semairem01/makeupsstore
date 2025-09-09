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
    int CategoryId
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
    int CategoryId
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
    string CategoryName
);