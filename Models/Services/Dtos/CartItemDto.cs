namespace makeup.Models.Services.Dtos;

// Kullanıcıya sepeti gösterirken
public record CartItemDto(
    int Id,
    int ProductId,
    string ProductName,
    string Brand,
    string ImageUrl,
    int? VariantId,
    string? VariantName,           // "46 Marvellous Mauve" vb.
    string? VariantImage,
    decimal UnitPrice,
    int Quantity,
    decimal TotalPrice
);

// Kullanıcı sepete ürün eklerken
public record CartItemCreateDto(
    int ProductId,
    int? VariantId,
    int Quantity
);
