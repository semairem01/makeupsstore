namespace makeup.Models.Services.Dtos;

public record ReviewCreateDto(int ProductId,int? VariantId, int Rating, string? Comment);
public record ReviewUpdateDto(int Rating, string? Comment);
public record ReviewItemDto(
    int Id, int ProductId, int Rating, string? Comment,
    DateTime CreatedAt, DateTime? UpdatedAt,
    string UserDisplayName // ör: "Ada Y."
);

public record ReviewListDto(
    double Average, int Count, // üst özet
    IDictionary<int,int> Distribution, // {5:12,4:4,...}
    IEnumerable<ReviewItemDto> Items
);

public record ReviewRecentDto(
    int Id,
    int ProductId,
    string ProductName,
    string? ProductImageUrl,
    int Rating,
    string? Comment,
    DateTime CreatedAt,
    string UserDisplayName
);