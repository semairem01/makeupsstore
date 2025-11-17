namespace makeup.Models.Services.Dtos;

// Kullanıcıya sipariş detaylarını göstermek için
public record OrderItemDto(
    int ProductId,
    string ProductName,
    string ProductImage,
    decimal UnitPrice,
    int Quantity,
    decimal TotalPrice,
    string? VariantName = null,     
    string? VariantImage = null,
    int? OrderItemId = null
);

public record OrderDto(
    int Id,
    Guid UserId,
    DateTime OrderDate,
    string Status,
    List<OrderItemDto> Items,
    decimal ShippingFee,
    string ShippingMethod,
    string? TrackingNumber,
    DateTime? ReturnRequestDate,
    string? ReturnReason,
    string? ReturnNotes,
    string? ReturnItemsJson,
    DateTime? ReturnApprovedDate,
    string? ReturnAdminNotes,
    // Add these new fields:
    string? ReturnStatus,
    string? ReturnCode,
    string? ReturnAddress,
    string? ReturnShippingInfo,
    string? DiscountCode = null,       // ✅ YENİ
    decimal DiscountAmount = 0,        // ✅ YENİ
    int DiscountPercentage = 0
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
    decimal ShippingFee,
    int? AddressId = null,// 0 if free shipping
    string? ShipFullName = null,
    string? DiscountCode = null,
    string? ShipPhone = null,
    string? ShipCity = null,
    string? ShipDistrict = null,
    string? ShipNeighborhood = null,
    string? ShipLine = null,
    string? ShipPostalCode = null,
    string? ShipNotes = null
);