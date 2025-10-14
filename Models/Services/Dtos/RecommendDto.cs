
public record RoutineRequestDto(
    string Skin,          // Dry|Oily|Combination|Sensitive|Normal
    string Vibe,          // Natural|Soft Glam|Bold
    string Env,           // Office/Daylight|Indoor Evening|Outdoor/Sunny|Party
    string Must,          // Lips|Eyes|Base|Cheeks
    string? Undertone,    // Warm|Cool|Neutral (opsiyonel)
    string? EyeColor      // Brown/Black|Hazel/Green|Blue/Gray (ops.)
);

public record RecommendItemDto(
    int Id, string Name, string Brand, string Category,
    decimal Price, string ImageUrl, string ShadeFamily, IEnumerable<string> Badges
);

public record RoutineResponseDto(
    string Title,
    IEnumerable<RecommendItemDto> Lips,
    IEnumerable<RecommendItemDto> Eyes,
    IEnumerable<RecommendItemDto> Base,
    IEnumerable<RecommendItemDto> Cheeks
);