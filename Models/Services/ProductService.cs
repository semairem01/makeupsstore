using makeup.Infrastructure.Email;
using makeup.Models.Repositories;
using makeup.Models.Services.Dtos;
using Microsoft.EntityFrameworkCore;

namespace makeup.Models.Services
{
    public class ProductService : IProductService
    {
        private readonly IProductRepository _productRepository;
        private readonly ICategoryRepository _categoryRepository;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly INotifyRequestRepository _notifyRepo;
        private readonly ILogger<ProductService> _logger;
        private readonly IEmailSender _email;
        private readonly AppDbContext _db;

        public ProductService(
            IProductRepository productRepository,
            ICategoryRepository categoryRepository,
            IHttpContextAccessor httpContextAccessor,
            INotifyRequestRepository notifyRepo,
            ILogger<ProductService> logger,
            IEmailSender email,
            AppDbContext db)
        {
            _productRepository = productRepository;
            _categoryRepository = categoryRepository;
            _httpContextAccessor = httpContextAccessor;
            _notifyRepo = notifyRepo;
            _logger = logger;
            _email = email;
            _db = db;
        }

        // ---- helpers ----
        private static FinishType? ParseFinish(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return null;
            return Enum.TryParse<FinishType>(s, true, out var v) ? v : null;
        }

        private static CoverageLevel? ParseCoverage(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return null;
            return Enum.TryParse<CoverageLevel>(s, true, out var v) ? v : null;
        }

        private static string[] SplitCsv(string[]? arr)
        {
            if (arr is null || arr.Length == 0) return Array.Empty<string>();
            return arr
                .SelectMany(s => (s ?? string.Empty)
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }

        private static ProductDto ToDto(Product p, double? ratingAvg = null, int ratingCount = 0)
            => new(
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
                p.Category?.Name ?? "",
                p.DiscountPercent,
                (int)p.SuitableForSkin,
                p.Finish?.ToString(),
                p.Coverage?.ToString(),
                p.Longwear,
                p.Waterproof,
                p.PhotoFriendly,
                p.HasSpf,
                p.FragranceFree,
                p.NonComedogenic,
                p.ShadeFamily,
                p.Tags,
                ratingAvg,
                ratingCount
            );

        private async Task<Dictionary<int, (double Avg, int Count)>> GetRatingsMapAsync(IEnumerable<int> productIds)
        {
            var ids = productIds.ToList();
            if (!ids.Any()) return new Dictionary<int, (double, int)>();

            var ratingAgg = await _db.ProductReviews
                .Where(r => ids.Contains(r.ProductId))
                .GroupBy(r => r.ProductId)
                .Select(g => new
                {
                    ProductId = g.Key,
                    Avg = g.Average(x => (double)x.Rating),
                    Count = g.Count()
                })
                .ToListAsync();

            return ratingAgg.ToDictionary(x => x.ProductId, x => (x.Avg, x.Count));
        }

        public async Task<IEnumerable<ProductDto>> GetAllAsync()
        {
            var products = await _productRepository.GetAllAsync();
            var ids = products.Select(p => p.Id).ToList();
            var ratings = await GetRatingsMapAsync(ids);

            return products.Select(p =>
            {
                ratings.TryGetValue(p.Id, out var rating);
                return ToDto(p, rating.Avg, rating.Count);
            }).ToList();
        }

        public async Task<IEnumerable<ProductDto>> GetDiscountedAsync()
        {
            var all = await _productRepository.GetAllAsync();
            var filtered = all.Where(p => p.IsActive && (p.DiscountPercent ?? 0) > 0).ToList();

            var ids = filtered.Select(p => p.Id).ToList();
            var ratings = await GetRatingsMapAsync(ids);

            var discounted = filtered
                .Select(p =>
                {
                    ratings.TryGetValue(p.Id, out var rating);
                    return ToDto(p, rating.Avg, rating.Count);
                })
                .OrderByDescending(p => p.DiscountPercent)
                .ThenBy(p => p.Name)
                .ToList();

            return discounted;
        }

        public async Task<ProductDto?> GetByIdAsync(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null) return null;

            var ratings = await GetRatingsMapAsync(new[] { id });
            ratings.TryGetValue(id, out var rating);

            return ToDto(product, rating.Avg, rating.Count);
        }

        public async Task<IEnumerable<ProductDto>> GetByCategoryAsync(int categoryId)
        {
            var category = await _categoryRepository.GetByIdAsync(categoryId);
            if (category == null) return new List<ProductDto>();

            var products = await _productRepository.GetAllAsync();
            var filtered = products.Where(p => p.CategoryId == categoryId).ToList();

            var ids = filtered.Select(p => p.Id).ToList();
            var ratings = await GetRatingsMapAsync(ids);

            return filtered.Select(p =>
            {
                ratings.TryGetValue(p.Id, out var rating);
                return ToDto(p, rating.Avg, rating.Count);
            }).ToList();
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
                        if (wanted.Add(cid))
                            q.Enqueue(cid);
            }

            var all = await _productRepository.GetAllAsync();
            var filtered = all.Where(p => wanted.Contains(p.CategoryId) && p.IsActive).ToList();

            var ids = filtered.Select(p => p.Id).ToList();
            var ratings = await GetRatingsMapAsync(ids);

            return filtered.Select(p =>
            {
                ratings.TryGetValue(p.Id, out var rating);
                return ToDto(p, rating.Avg, rating.Count);
            }).ToList();
        }

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
                IsActive = dto.StockQuantity > 0,
                ImageUrl = dto.ImageUrl,
                Color = dto.Color,
                Size = dto.Size,
                CategoryId = dto.CategoryId,
                DiscountPercent = dto.DiscountPercent,
                SuitableForSkin = (SkinTypeFlags)dto.SuitableForSkin,
                Finish = ParseFinish(dto.Finish),
                Coverage = ParseCoverage(dto.Coverage),
                Longwear = dto.Longwear,
                Waterproof = dto.Waterproof,
                PhotoFriendly = dto.PhotoFriendly,
                HasSpf = dto.HasSpf,
                FragranceFree = dto.FragranceFree,
                NonComedogenic = dto.NonComedogenic,
                ShadeFamily = dto.ShadeFamily,
                Tags = dto.Tags
            };

            await _productRepository.AddAsync(product);

            var productDto = ToDto(product, null, 0);
            return ServiceResult<ProductDto>.Ok(productDto, "Product created successfully!");
        }

        public async Task<ServiceResult<ProductDto>> UpdateAsync(ProductUpdateDto dto)
        {
            var product = await _productRepository.GetByIdAsync(dto.Id);
            if (product == null)
                return ServiceResult<ProductDto>.Fail("Product is not found!");

            var category = await _categoryRepository.GetByIdAsync(dto.CategoryId);
            if (category == null)
                return ServiceResult<ProductDto>.Fail("Category is not valid!");

            var wasOut = product.StockQuantity <= 0;

            product.Name = dto.Name;
            product.Brand = dto.Brand;
            product.Description = dto.Description;
            product.Price = dto.Price;
            product.StockQuantity = dto.StockQuantity;
            product.IsActive = product.StockQuantity > 0;
            product.ImageUrl = dto.ImageUrl;
            product.Color = dto.Color;
            product.Size = dto.Size;
            product.CategoryId = dto.CategoryId;
            product.DiscountPercent = dto.DiscountPercent;

            product.SuitableForSkin = (SkinTypeFlags)dto.SuitableForSkin;
            product.Finish = ParseFinish(dto.Finish);
            product.Coverage = ParseCoverage(dto.Coverage);
            product.Longwear = dto.Longwear;
            product.Waterproof = dto.Waterproof;
            product.PhotoFriendly = dto.PhotoFriendly;
            product.HasSpf = dto.HasSpf;
            product.FragranceFree = dto.FragranceFree;
            product.NonComedogenic = dto.NonComedogenic;
            product.ShadeFamily = dto.ShadeFamily;
            product.Tags = dto.Tags;

            await _productRepository.UpdateAsync(product);

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

            var ratings = await GetRatingsMapAsync(new[] { product.Id });
            ratings.TryGetValue(product.Id, out var rating);

            var productDto = ToDto(product, rating.Avg, rating.Count);
            return ServiceResult<ProductDto>.Ok(productDto, "Product updated successfully!");
        }

        public async Task<ServiceResult<bool>> DeleteAsync(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                return ServiceResult<bool>.Fail("Product is not found!");

            await _productRepository.DeleteAsync(product);
            return ServiceResult<bool>.Ok(true, "Product deleted successfully!");
        }

        public async Task<IEnumerable<ProductDto>> SearchAsync(string? query)
        {
            var list = await _productRepository.SearchAsync(query);
            var ids = list.Select(p => p.Id).ToList();
            var ratings = await GetRatingsMapAsync(ids);

            return list.Select(p =>
            {
                ratings.TryGetValue(p.Id, out var rating);
                return ToDto(p, rating.Avg, rating.Count);
            });
        }

        // ProductService.cs içindeki BrowseAsync metodunu bu şekilde güncelleyin

        // ProductService.cs içindeki BrowseAsync metodunu bu şekilde güncelleyin

        // ProductService.cs içindeki BrowseAsync metodunu tamamen bu şekilde değiştirin

        // ProductService.cs içindeki BrowseAsync metodunu tamamen bu şekilde değiştirin

        public async Task<PagedResult<ProductDto>> BrowseAsync(ProductBrowseQuery q)
        {
            q ??= new ProductBrowseQuery();

            var page = Math.Max(1, q.Page);
            var pageSize = Math.Clamp(q.PageSize, 6, 48);

            // Rating aggregation
            var reviewsAgg = _db.ProductReviews
                .GroupBy(r => r.ProductId)
                .Select(g => new
                {
                    ProductId = g.Key,
                    Avg = g.Average(x => (double)x.Rating),
                    Cnt = g.Count()
                });

            var baseQuery =
                from p in _db.Products.AsNoTracking().Where(p => p.IsActive)
                join r in reviewsAgg on p.Id equals r.ProductId into gj
                from r in gj.DefaultIfEmpty()
                select new
                {
                    Product = p,
                    Category = p.Category,
                    RatingAverage = (double?)(r != null ? r.Avg : null),
                    RatingCount = (int?)(r != null ? r.Cnt : null)
                };

            // Stok filtresi
            if (q.InStock == true)
                baseQuery = baseQuery.Where(x => x.Product.StockQuantity > 0);

            // Kategori filtreleri
            if (q.CategoryId is int cid)
                baseQuery = baseQuery.Where(x => x.Product.CategoryId == cid);

            if (q.CategoryTreeId is int treeId)
            {
                var allCats = await _categoryRepository.GetAllAsync();
                var wanted = new HashSet<int> { treeId };
                var byParent = allCats
                    .GroupBy(c => c.ParentCategoryId ?? 0)
                    .ToDictionary(g => g.Key, g => g.Select(x => x.Id).ToList());

                var bfs = new Queue<int>();
                bfs.Enqueue(treeId);
                while (bfs.Count > 0)
                {
                    var cur = bfs.Dequeue();
                    if (byParent.TryGetValue(cur, out var kids))
                        foreach (var k in kids)
                            if (wanted.Add(k))
                                bfs.Enqueue(k);
                }

                baseQuery = baseQuery.Where(x => wanted.Contains(x.Product.CategoryId));
            }

            // Arama
            if (!string.IsNullOrWhiteSpace(q.Q))
            {
                var term = q.Q.Trim();
                baseQuery = baseQuery.Where(x =>
                    EF.Functions.Like(x.Product.Name, $"%{term}%") ||
                    EF.Functions.Like(x.Product.Brand, $"%{term}%") ||
                    EF.Functions.Like(x.Product.Description, $"%{term}%"));
            }

            // Fiyat filtreleri
            if (q.PriceMin is decimal pmin) baseQuery = baseQuery.Where(x => x.Product.Price >= pmin);
            if (q.PriceMax is decimal pmax) baseQuery = baseQuery.Where(x => x.Product.Price <= pmax);
            if (q.Discounted == true) baseQuery = baseQuery.Where(x => (x.Product.DiscountPercent ?? 0) > 0);

            // Marka filtresi
            var brands = SplitCsv(q.Brands);
            if (brands.Length > 0)
                baseQuery = baseQuery.Where(x => brands.Contains(x.Product.Brand));

            // Cilt tipi (bitmask)
            if (q.SuitableForSkin is int mask && mask > 0)
                baseQuery = baseQuery.Where(x => ((int)x.Product.SuitableForSkin & mask) != 0);

            // ✅ Rating - ÇOKLU SEÇIM (örn: "3,4,5" = 3 VEYA 4 VEYA 5 yıldızlı ürünler)
            if (!string.IsNullOrWhiteSpace(q.SelectedRatings))
            {
                // "4,5" gibi string'i int array'e çevir
                var ratings = q.SelectedRatings
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(s => int.TryParse(s, out var num) ? num : -1)
                    .Where(n => n >= 1 && n <= 5)
                    .ToList();

                if (ratings.Any())
                {
                    baseQuery = baseQuery.Where(x =>
                        x.RatingAverage != null &&
                        ratings.Any(rating =>
                            x.RatingAverage >= rating - 0.5 &&
                            x.RatingAverage < rating + 0.5
                        )
                    );
                }
            }

            // ✅ Yeni özellik filtreleri
            if (q.HasSpf == true)
                baseQuery = baseQuery.Where(x => x.Product.HasSpf);

            if (q.FragranceFree == true)
                baseQuery = baseQuery.Where(x => x.Product.FragranceFree);

            if (q.NonComedogenic == true)
                baseQuery = baseQuery.Where(x => x.Product.NonComedogenic);

            if (q.Longwear == true)
                baseQuery = baseQuery.Where(x => x.Product.Longwear);

            if (q.Waterproof == true)
                baseQuery = baseQuery.Where(x => x.Product.Waterproof);

            if (q.PhotoFriendly == true)
                baseQuery = baseQuery.Where(x => x.Product.PhotoFriendly);

            // ✅ Finish filtresi
            if (!string.IsNullOrWhiteSpace(q.Finish))
            {
                var finishEnum = ParseFinish(q.Finish);
                if (finishEnum.HasValue)
                    baseQuery = baseQuery.Where(x => x.Product.Finish == finishEnum.Value);
            }

            // ✅ Coverage filtresi
            if (!string.IsNullOrWhiteSpace(q.Coverage))
            {
                var coverageEnum = ParseCoverage(q.Coverage);
                if (coverageEnum.HasValue)
                    baseQuery = baseQuery.Where(x => x.Product.Coverage == coverageEnum.Value);
            }

            // Sıralama
            var sort = string.IsNullOrWhiteSpace(q.Sort) ? "best" : q.Sort;

            var orderedQuery = sort switch
            {
                "price_asc" => baseQuery.OrderBy(x => x.Product.Price).ThenBy(x => x.Product.Name),
                "price_desc" => baseQuery.OrderByDescending(x => x.Product.Price).ThenBy(x => x.Product.Name),
                "discount" => baseQuery.OrderByDescending(x => x.Product.DiscountPercent ?? 0)
                    .ThenBy(x => x.Product.Price),
                "new" => baseQuery.OrderByDescending(x => x.Product.Id),
                "best" => baseQuery.OrderByDescending(x => x.RatingAverage ?? 0)
                    .ThenByDescending(x => x.RatingCount ?? 0)
                    .ThenByDescending(x => x.Product.Id),
                _ => baseQuery.OrderBy(x => x.Product.Brand).ThenBy(x => x.Product.Name)
            };

            var total = await orderedQuery.CountAsync();

            var paged = await orderedQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = paged.Select(x =>
            {
                x.Product.Category = x.Category;
                return ToDto(x.Product, x.RatingAverage, x.RatingCount ?? 0);
            }).ToList();

            return new PagedResult<ProductDto>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalItems = total,
                TotalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize))
            };
        }
    }
}