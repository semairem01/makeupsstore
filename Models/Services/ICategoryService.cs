using makeup.Models.Services.Dtos;

namespace makeup.Models.Services;

public interface ICategoryService
{
    Task<IEnumerable<CategoryDto>> GetAllAsync();
    Task<CategoryDto?> GetByIdAsync(int id);
    Task<ServiceResult<CategoryDto>> CreateAsync(CategoryCreateDto dto);
    Task<ServiceResult<CategoryDto>> UpdateAsync(CategoryUpdateDto dto);
    Task<ServiceResult<bool>> DeleteAsync(int id);
}