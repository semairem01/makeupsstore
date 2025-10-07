using makeup.Infrastructure.Email;
using makeup.Models.Repositories;
using makeup.Models.Services.Dtos;

namespace makeup.Models.Services;

public class ProductService : IProductService
{
    private readonly IProductRepository _productRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly INotifyRequestRepository _notifyRepo;
    private readonly ILogger<ProductService> _logger;
    private readonly IEmailSender _email;

    public ProductService(
        IProductRepository productRepository,
        ICategoryRepository categoryRepository,
        IHttpContextAccessor httpContextAccessor,
        INotifyRequestRepository notifyRepo,
        ILogger<ProductService> logger,
        IEmailSender email)
    {
        _productRepository = productRepository;
        _categoryRepository = categoryRepository;
        _httpContextAccessor = httpContextAccessor;
        _notifyRepo = notifyRepo;
        _logger = logger;
        _email = email;
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
            p.Category.Name,
            p.DiscountPercent                 // <-- eklendi
        )).ToList();
    }

    public async Task<IEnumerable<ProductDto>> GetDiscountedAsync()
    {
        var all = await _productRepository.GetAllAsync(); // Category Include'lu
        var discounted = all
            .Where(p => p.IsActive && (p.DiscountPercent ?? 0) > 0)
            .Select(p => new ProductDto(
                p.Id, p.Name, p.Brand, p.Description, p.Price, p.IsActive,
                p.ImageUrl, p.Color, p.Size, p.CategoryId,
                p.Category?.Name ?? "",
                p.DiscountPercent
            ))
            .OrderByDescending(p => p.DiscountPercent)
            .ThenBy(p => p.Name)
            .ToList();

        return discounted;
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
            product.Category.Name,
            product.DiscountPercent            // <-- eklendi
        );
    }

    public async Task<IEnumerable<ProductDto>> GetByCategoryAsync(int categoryId)
    {
        var category = await _categoryRepository.GetByIdAsync(categoryId);
        if (category == null) return new List<ProductDto>();

        var products = await _productRepository.GetAllAsync();

        var filtered = products
            .Where(p => p.CategoryId == categoryId)
            .Select(p => new ProductDto(
                p.Id, p.Name, p.Brand, p.Description, p.Price, p.IsActive,
                p.ImageUrl, p.Color, p.Size, p.CategoryId,
                p.Category?.Name ?? category.Name,
                p.DiscountPercent            // <-- eklendi
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
                p.ImageUrl, p.Color, p.Size, p.CategoryId,
                p.Category?.Name ?? "",
                p.DiscountPercent            // <-- eklendi
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
            Name          = dto.Name,
            Brand         = dto.Brand,
            Description   = dto.Description,
            Price         = dto.Price,
            StockQuantity = dto.StockQuantity,
            // Aktiflik tamamen stoğa bağlı:
            IsActive      = dto.StockQuantity > 0,
            ImageUrl      = dto.ImageUrl,
            Color         = dto.Color,
            Size          = dto.Size,
            CategoryId    = dto.CategoryId,
            DiscountPercent = dto.DiscountPercent   // <-- eklendi (DTO’da olmalı)
        };

        await _productRepository.AddAsync(product);

        var productDto = new ProductDto(
            product.Id, product.Name, product.Brand, product.Description, product.Price,
            product.IsActive, product.ImageUrl, product.Color, product.Size,
            product.CategoryId, category.Name,
            product.DiscountPercent                 // <-- eklendi
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

        // önceki durum: stok bitik mi?
        var wasOut = product.StockQuantity <= 0;

        product.Name          = dto.Name;
        product.Brand         = dto.Brand;
        product.Description   = dto.Description;
        product.Price         = dto.Price;
        product.StockQuantity = dto.StockQuantity;
        // Aktiflik stoğa bağlı
        product.IsActive      = product.StockQuantity > 0;
        product.ImageUrl      = dto.ImageUrl;
        product.Color         = dto.Color;
        product.Size          = dto.Size;
        product.CategoryId    = dto.CategoryId;
        product.DiscountPercent = dto.DiscountPercent;   // <-- eklendi

        await _productRepository.UpdateAsync(product);

        // 0 -> >0 olduysa bekleyenlere e-posta
        if (wasOut && product.StockQuantity > 0)
        {
            try
            {
                var waiters = (await _notifyRepo.GetPendingRequestsAsync(product.Id)).ToList();
                _logger.LogInformation("Restock: product {ProductId} - notifying {Count} waiters",
                    product.Id, waiters.Count);

                foreach (var w in waiters)
                {
                    var email = w.AppUser?.Email;
                    if (string.IsNullOrWhiteSpace(email))
                    {
                        _logger.LogWarning("Waiter {UserId} has no email for product {ProductId}",
                            w.UserId, product.Id);
                        continue;
                    }

                    var subject = $"Back in stock: {product.Name}";
                    var url = $"http://localhost:3000/product/{product.Id}";
                    var html = $@"
<p>Good news! <strong>{product.Name}</strong> is back in stock.</p>
<p><a href=""{url}"">Buy now</a></p>";

                    try
                    {
                        await _email.SendAsync(email, subject, html, "Good news! The product is back in stock.");
                        await _notifyRepo.RemoveAsync(w.Id);
                    }
                    catch (Exception exSend)
                    {
                        _logger.LogError(exSend, "Email send failed to {Email} for product {ProductId}",
                            email, product.Id);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Restock notification failed for product {ProductId}", product.Id);
            }
        }

        var productDto = new ProductDto(
            product.Id, product.Name, product.Brand, product.Description, product.Price,
            product.IsActive, product.ImageUrl, product.Color, product.Size,
            product.CategoryId, category.Name,
            product.DiscountPercent                 // <-- eklendi
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
