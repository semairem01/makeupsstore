using makeup.Models.Repositories;
using makeup.Models.Services.Dtos;

namespace makeup.Models.Services;

public class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _categoryRepository;
    
    public CategoryService(ICategoryRepository categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }
    
    // Tüm kategorileri listele (alt kategorilerle birlikte)
    public async Task<IEnumerable<CategoryDto>> GetAllAsync()
    {
        var categories = await _categoryRepository.GetAllAsync();
        return categories
            .Where(c => c.ParentCategoryId == null) // Ana kategoriler
            .Select(c => MapToDto(c))
            .ToList();
           
    }

    public async Task<CategoryDto?> GetByIdAsync(int id)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        if (category == null) return null;

        return MapToDto(category);
    }

    public async Task<ServiceResult<CategoryDto>> CreateAsync(CategoryCreateDto dto)
    {
        try
        {
            // Duplicate kontrolü - aynı isimde kategori var mı kontrol et
            var existingCategory = await _categoryRepository.GetByNameAsync(dto.Name);
            if (existingCategory != null)
            {
                return ServiceResult<CategoryDto>.Fail($"'{dto.Name}' kategorisi zaten mevcut.");
            }

            // ParentCategory kontrolü (eğer parent ID verilmişse)
            if (dto.ParentCategoryId.HasValue)
            {
                var parentCategory = await _categoryRepository.GetByIdAsync(dto.ParentCategoryId.Value);
                if (parentCategory == null)
                {
                    return ServiceResult<CategoryDto>.Fail("Belirtilen üst kategori bulunamadı.");
                }
            }

            var category = new Category
            {
                Name = dto.Name.Trim(), // Boşlukları temizle
                ParentCategoryId = dto.ParentCategoryId
            };

            await _categoryRepository.AddAsync(category);

            var categoryDto = MapToDto(category);
            return ServiceResult<CategoryDto>.Ok(categoryDto, "Kategori başarıyla oluşturuldu!");
        }
        catch (Exception ex)
        {
            return ServiceResult<CategoryDto>.Fail($"Kategori oluşturulurken hata oluştu: {ex.Message}");
        }
    }

    public async Task<ServiceResult<CategoryDto>> UpdateAsync(CategoryUpdateDto dto)
    {
        try
        {
            var category = await _categoryRepository.GetByIdAsync(dto.Id);
            if (category == null)
                return ServiceResult<CategoryDto>.Fail("Kategori bulunamadı!");

            // Duplicate kontrolü (kendisi hariç)
            var existingCategory = await _categoryRepository.GetByNameAsync(dto.Name);
            if (existingCategory != null && existingCategory.Id != dto.Id)
            {
                return ServiceResult<CategoryDto>.Fail($"'{dto.Name}' kategorisi zaten mevcut.");
            }

            // ParentCategory kontrolü
            if (dto.ParentCategoryId.HasValue)
            {
                var parentCategory = await _categoryRepository.GetByIdAsync(dto.ParentCategoryId.Value);
                if (parentCategory == null)
                {
                    return ServiceResult<CategoryDto>.Fail("Belirtilen üst kategori bulunamadı.");
                }

                // Kendini parent olarak seçmesini engelle
                if (dto.ParentCategoryId.Value == dto.Id)
                {
                    return ServiceResult<CategoryDto>.Fail("Kategori kendi alt kategorisi olamaz.");
                }
            }

            category.Name = dto.Name.Trim();
            category.ParentCategoryId = dto.ParentCategoryId;

            await _categoryRepository.UpdateAsync(category);

            var categoryDto = MapToDto(category);
            return ServiceResult<CategoryDto>.Ok(categoryDto, "Kategori başarıyla güncellendi!");
        }
        catch (Exception ex)
        {
            return ServiceResult<CategoryDto>.Fail($"Kategori güncellenirken hata oluştu: {ex.Message}");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        try
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null)
                return ServiceResult<bool>.Fail("Kategori bulunamadı!");

            // Alt kategorileri kontrol et
            var hasSubCategories = category.SubCategories != null && category.SubCategories.Any();
            if (hasSubCategories)
            {
                return ServiceResult<bool>.Fail("Bu kategorinin alt kategorileri bulunmaktadır. Önce alt kategorileri silin.");
            }

            await _categoryRepository.DeleteAsync(category);
            return ServiceResult<bool>.Ok(true, "Kategori başarıyla silindi!");
        }
        catch (Exception ex)
        {
            return ServiceResult<bool>.Fail($"Kategori silinirken hata oluştu: {ex.Message}");
        }
    }

    private CategoryDto MapToDto(Category category)
    {
        return new CategoryDto(
            category.Id,
            category.Name,
            category.ParentCategoryId,
            category.ParentCategory?.Name,
            category.SubCategories?.Select(MapToDto).ToList() ?? new List<CategoryDto>()
        );
    }
}
