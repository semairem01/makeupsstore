namespace makeup.Models.Services.Dtos;

// Kullanıcıya sipariş detaylarını göstermek için
public record OrderItemDto(
    int ProductId,
    string ProductName,
    string ProductImage,
    decimal UnitPrice,
    int Quantity,
    decimal TotalPrice
);

public record OrderDto(
    int Id,
    Guid UserId,
    DateTime OrderDate,
    string Status,
    List<OrderItemDto> Items,
    decimal ShippingFee,           
    string? ShippingMethod,
    string? TrackingNumber
);

// Sipariş oluşturmak için
public record OrderCreateDto(
    List<OrderItemCreateDto> Items
);

public record OrderItemCreateDto(
    int ProductId,
    int Quantity
);

// OrderItem güncellemek için
public record OrderItemUpdateDto(
    int Id,
    int Quantity
);

public record CheckoutRequestDto(
    string ShippingMethod,         // "standard" | "express"
    decimal ShippingFee            // 0 if free shipping
);