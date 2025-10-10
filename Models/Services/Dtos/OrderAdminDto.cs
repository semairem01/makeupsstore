namespace makeup.Models.Services.Dtos;

public record AdminOrderListItemDto(
    int Id,
    Guid UserId,
    DateTime OrderDate,
    string Status,
    decimal ShippingFee,
    string? ShippingMethod,
    string? TrackingNumber,
    decimal Subtotal // sum of line totals (discounted already in mapping)
);

public record AdminOrderUpdateDto(
    string Status,          // "SiparisAlindi" | "Hazirlaniyor" | "Kargoda" | "TeslimEdildi" | "IptalEdildi"
    string? TrackingNumber
);