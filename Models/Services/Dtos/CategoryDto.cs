namespace makeup.Models.Services.Dtos;

// Admin için kategori ekleme/güncelleme
public record CategoryCreateDto(
    string Name,
    int? ParentCategoryId // null ise ana kategori
);

public record CategoryUpdateDto(
    int Id,
    string Name,
    int? ParentCategoryId
);

// Kullanıcıya kategori listesi gösterirken
public record CategoryDto(
    int Id,
    string Name,
    int? ParentCategoryId,
    string? ParentCategoryName,
    List<CategoryDto> SubCategories // Alt kategoriler
);