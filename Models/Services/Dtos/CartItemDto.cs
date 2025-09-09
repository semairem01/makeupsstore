namespace makeup.Models.Services.Dtos;

// Kullanıcıya sepeti gösterirken
public record CartItemDto(
    int Id,
    int ProductId,
    string ProductName,
    string Brand,
    string ImageUrl,
    decimal UnitPrice,
    int Quantity,
    decimal TotalPrice
);

// Kullanıcı sepete ürün eklerken
public record CartItemCreateDto(
    int ProductId,
    int Quantity
);
