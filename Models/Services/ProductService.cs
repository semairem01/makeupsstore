using makeup.Models.Repositories;
using makeup.Models.Services.Dtos;

namespace makeup.Models.Services;

public class ProductService : IProductService
{
    private readonly IProductRepository _productRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly INotifyRequestRepository _notifyRepo;        // ← NEW
    private readonly ILogger<ProductService> _logger;             // ← (opsiyonel) log

    public ProductService(
        IProductRepository productRepository,
        ICategoryRepository categoryRepository,
        IHttpContextAccessor httpContextAccessor,
        INotifyRequestRepository notifyRepo,                      // ← NEW
        ILogger<ProductService> logger)                           // ← (opsiyonel)
    {
        _productRepository = productRepository;
        _categoryRepository = categoryRepository;
        _httpContextAccessor = httpContextAccessor;
        _notifyRepo = notifyRepo;                                  // ← NEW
        _logger = logger;
    }

    // tüm ürünleri listele
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
            p.CategoryId,
            p.Category.Name
        )).ToList();
    }

    // tek ürün
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
            product.CategoryId,
            product.Category.Name
        );
    }

    public async Task<IEnumerable<ProductDto>> GetByCategoryAsync(int categoryId)
    {
        var category = await _categoryRepository.GetByIdAsync(categoryId);
        if (category == null) return new List<ProductDto>();

        var products = await _productRepository.GetAllAsync();

        var filtered = products
            .Where(p => p.CategoryId == categoryId)   // isActive filtrelemeyi FE/endpoint seviyesinde yapıyorsun
            .Select(p => new ProductDto(
                p.Id, p.Name, p.Brand, p.Description, p.Price, p.IsActive,
                p.ImageUrl, p.Color, p.Size, p.CategoryId,
                p.Category?.Name ?? category.Name
            ))
            .ToList();

        return filtered;
    }

    public async Task<IEnumerable<ProductDto>> GetByCategoryTreeAsync(int categoryId)
    {
        var allCats = await _categoryRepository.GetAllAsync();

        var wanted = new HashSet<int> { categoryId };
        var q = new Queue<int>();
        q.Enqueue(categoryId);

        var lookup = allCats.GroupBy(c => c.ParentCategoryId ?? 0)
            .ToDictionary(g => g.Key, g => g.Select(x => x.Id).ToList());

        while (q.Count > 0)
        {
            var cur = q.Dequeue();
            if (lookup.TryGetValue(cur, out var children))
                foreach (var cid in children)
                    if (wanted.Add(cid)) q.Enqueue(cid);
        }

        var all = await _productRepository.GetAllAsync();
        var filtered = all
            .Where(p => wanted.Contains(p.CategoryId) && p.IsActive)
            .Select(p => new ProductDto(
                p.Id, p.Name, p.Brand, p.Description, p.Price, p.IsActive,
                p.ImageUrl, p.Color, p.Size, p.CategoryId, p.Category?.Name ?? ""
            ))
            .ToList();

        return filtered;
    }

    // create
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
            IsActive = dto.StockQuantity > 0 && dto.IsActive,
            ImageUrl = dto.ImageUrl,
            Color = dto.Color,
            Size = dto.Size,
            CategoryId = dto.CategoryId
        };

        await _productRepository.AddAsync(product);

        var productDto = new ProductDto(
            product.Id, product.Name, product.Brand, product.Description, product.Price,
            product.IsActive, product.ImageUrl, product.Color, product.Size,
            product.CategoryId, category.Name
        );

        return ServiceResult<ProductDto>.Ok(productDto, "Product created successfully!");
    }

    // update (+ restock bildirimi)
    public async Task<ServiceResult<ProductDto>> UpdateAsync(ProductUpdateDto dto)
    {
        var product = await _productRepository.GetByIdAsync(dto.Id);
        if (product == null)
            return ServiceResult<ProductDto>.Fail("Product is not found!");

        var category = await _categoryRepository.GetByIdAsync(dto.CategoryId);
        if (category == null)
            return ServiceResult<ProductDto>.Fail("Category is not valid!");

        // RESTOCK KONTROLÜ: önceki durum 0 mıydı?
        var wasOut = product.StockQuantity <= 0;

        product.Name = dto.Name;
        product.Brand = dto.Brand;
        product.Description = dto.Description;
        product.Price = dto.Price;
        product.StockQuantity = dto.StockQuantity;
        product.IsActive = product.StockQuantity > 0 && dto.IsActive; // 0 ise zorla false
        product.ImageUrl = dto.ImageUrl;
        product.Color = dto.Color;
        product.Size = dto.Size;
        product.CategoryId = dto.CategoryId;

        await _productRepository.UpdateAsync(product);

        // 0 → >0 olduysa bekleyenlere haber ver
        if (wasOut && product.StockQuantity > 0)
        {
            try
            {
                var waiters = await _notifyRepo.GetPendingRequestsAsync(product.Id);
                var list = waiters.ToList();

                // TODO: burada e-posta/sms/push gönder
                // Örn. IEmailSender.SendAsync(waiter.AppUser.Email, "...");

                // Şimdilik sadece loglayalım ve kayıtları silelim:
                foreach (var w in list)
                {
                    _logger.LogInformation("Restock notify: Product {ProductId} -> User {UserId}", product.Id, w.UserId);
                    await _notifyRepo.RemoveAsync(w.Id);
                }
            }
            catch (Exception ex)
            {
                // Bildirim hatası stok güncellemesini bozmamalı
                _logger.LogError(ex, "Waitlist notify failed for product {ProductId}", product.Id);
            }
        }

        var productDto = new ProductDto(
            product.Id, product.Name, product.Brand, product.Description, product.Price,
            product.IsActive, product.ImageUrl, product.Color, product.Size,
            product.CategoryId, category.Name
        );

        return ServiceResult<ProductDto>.Ok(productDto, "Product updated successfully!");
    }

    // delete
    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        var product = await _productRepository.GetByIdAsync(id);
        if (product == null)
            return ServiceResult<bool>.Fail("Product is not found!");

        await _productRepository.DeleteAsync(product);
        return ServiceResult<bool>.Ok(true, "Product deleted successfully!");
    }
}
