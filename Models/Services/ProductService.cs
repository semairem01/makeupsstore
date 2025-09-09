using makeup.Models.Repositories;
using makeup.Models.Services.Dtos;

namespace makeup.Models.Services;

public class ProductService : IProductService
{
    private readonly IProductRepository _productRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public ProductService(IProductRepository productRepository, ICategoryRepository categoryRepository,
        IHttpContextAccessor httpContextAccessor)
    {
        _productRepository = productRepository;
        _categoryRepository = categoryRepository;
        _httpContextAccessor = httpContextAccessor;
    }

    //tüm ürünleri listele
   public async Task<IEnumerable<ProductDto>> GetAllAsync()
    {
        var products = await _productRepository.GetAllAsync();
        return products.Select(p => new ProductDto(
            p.Id,
            p.Name,
            p.Brand,
            p.Description,
            p.Price,
            p.IsActive,
            p.ImageUrl,
            p.Color,
            p.Size,
            p.Category.Name
        )).ToList();
    }

    // Tek bir ürün getir
    public async Task<ProductDto?> GetByIdAsync(int id)
    {
        var product = await _productRepository.GetByIdAsync(id);
        if (product == null) return null;

        return new ProductDto(
            product.Id,
            product.Name,
            product.Brand,
            product.Description,
            product.Price,
            product.IsActive,
            product.ImageUrl,
            product.Color,
            product.Size,
            product.Category.Name
        );
    }

    // Yeni ürün ekle
    public async Task<ServiceResult<ProductDto>> CreateAsync(ProductCreateDto dto)
    {
        var category = await _categoryRepository.GetByIdAsync(dto.CategoryId);
        if (category == null)
            return ServiceResult<ProductDto>.Fail("Category is not valid!");

        var product = new Product
        {
            Name = dto.Name,
            Brand = dto.Brand,
            Description = dto.Description,
            Price = dto.Price,
            StockQuantity = dto.StockQuantity,
            IsActive = dto.IsActive,
            ImageUrl = dto.ImageUrl,
            Color = dto.Color,
            Size = dto.Size,
            CategoryId = dto.CategoryId
        };

        await _productRepository.AddAsync(product);

        var productDto = new ProductDto(
            product.Id,
            product.Name,
            product.Brand,
            product.Description,
            product.Price,
            product.IsActive,
            product.ImageUrl,
            product.Color,
            product.Size,
            category.Name
        );

        return ServiceResult<ProductDto>.Ok(productDto, "Product created successfully!");
    }

    // Ürün güncelle
    public async Task<ServiceResult<ProductDto>> UpdateAsync(ProductUpdateDto dto)
    {
        var product = await _productRepository.GetByIdAsync(dto.Id);
        if (product == null)
            return ServiceResult<ProductDto>.Fail("Product is not found!");

        var category = await _categoryRepository.GetByIdAsync(dto.CategoryId);
        if (category == null)
            return ServiceResult<ProductDto>.Fail("Category is not valid!");

        product.Name = dto.Name;
        product.Brand = dto.Brand;
        product.Description = dto.Description;
        product.Price = dto.Price;
        product.StockQuantity = dto.StockQuantity;
        product.IsActive = dto.IsActive;
        product.ImageUrl = dto.ImageUrl;
        product.Color = dto.Color;
        product.Size = dto.Size;
        product.CategoryId = dto.CategoryId;

        await _productRepository.UpdateAsync(product);

        var productDto = new ProductDto(
            product.Id,
            product.Name,
            product.Brand,
            product.Description,
            product.Price,
            product.IsActive,
            product.ImageUrl,
            product.Color,
            product.Size,
            category.Name
        );

        return ServiceResult<ProductDto>.Ok(productDto, "Product updated successfully!");
    }

    // Ürünü sil
    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        var product = await _productRepository.GetByIdAsync(id);
        if (product == null)
            return ServiceResult<bool>.Fail("Product is not found!");

        await _productRepository.DeleteAsync(product);

        return ServiceResult<bool>.Ok(true, "Product deleted successfully!");
    }
}