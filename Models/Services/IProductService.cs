using makeup.Models.Services.Dtos;

namespace makeup.Models.Services;

public interface IProductService
{
    Task <IEnumerable<ProductDto>> GetAllAsync();
    Task<ProductDto?> GetByIdAsync(int id);
    Task<ServiceResult<ProductDto>> CreateAsync(ProductCreateDto dto);
    Task<ServiceResult<ProductDto>> UpdateAsync(ProductUpdateDto dto);
    Task<ServiceResult<bool>> DeleteAsync(int id);
    Task<IEnumerable<ProductDto>> GetByCategoryAsync(int categoryId);
    Task<IEnumerable<ProductDto>> GetDiscountedAsync();
    Task<IEnumerable<ProductDto>> GetByCategoryTreeAsync(int categoryId);
    Task<IEnumerable<ProductDto>> SearchAsync(string? query);
    Task<PagedResult<ProductDto>> BrowseAsync(ProductBrowseQuery q);
    Task<IEnumerable<ProductListItemDto>> BrowseExpandedAsync(ProductBrowseQuery q);

}