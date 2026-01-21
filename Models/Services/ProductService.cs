using makeup.Infrastructure.Email;
using makeup.Models.Repositories;
using makeup.Models.Repositories.Entities;
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

        private static ImageDto ToImg(ProductImage i) => new(i.Id, i.Url, i.Alt, i.IsPrimary, i.SortOrder);
        private static ProductVariantDto ToVariantDto(ProductVariant v) => new(
            v.Id, v.ProductId, v.Sku, v.Barcode, v.Name, v.ShadeCode, v.ShadeFamily,
            v.HexColor, v.SwatchImageUrl, v.ImageUrl, v.Price, v.DiscountPercent,
            v.StockQuantity, v.IsActive, v.IsDefault, v.Images?
                .OrderBy(i => i.SortOrder)
                .Select(ToImg)
                .ToList() ?? new List<ImageDto>());

        private static ProductDto ToDto(Product p, double? ratingAvg = null, int ratingCount = 0,
            decimal? overridePrice = null,
            string? overrideImage = null,
            decimal? overrideDiscount = null)
            => new(
                p.Id,
                p.Name,
                p.Brand,
                p.Description,
                overridePrice ?? p.Price,
                p.IsActive,
                overrideImage ?? p.ImageUrl,
                p.Color,
                p.Size,
                p.CategoryId,
                p.Category?.Name ?? "",
                overrideDiscount ?? p.DiscountPercent,
                p.Ingredients,
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
                ratingCount,
                p.StockQuantity,
                p.Variants?.OrderByDescending(v => v.IsDefault).ThenBy(v => v.Name)
                    .Select(ToVariantDto).ToList(),
                p.Images?.OrderBy(i => i.SortOrder).Select(ToImg).ToList() 
            );

        private async Task<Dictionary<int, (double Avg, int Count)>> GetRatingsMapAsync(IEnumerable<int> productIds)
        {
            var ids = productIds.ToList();
            if (!ids.Any()) return new Dictionary<int, (double, int)>();

            var ratingAgg = await _db.ProductReviews
                .Where(r => ids.Contains(r.ProductId) &&
                            r.Status == ProductReview.ReviewStatus.Approved &&
                            r.VariantId == null)
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

        // --- Kategori ağacı yardımcı metodu (Seçenek 1) ---
        private async Task<HashSet<int>> GetCategoryTreeIdsAsync(int rootId)
        {
            var allCats = await _db.Categories
                .AsNoTracking()
                .Select(c => new { c.Id, c.ParentCategoryId })
                .ToListAsync();

            var wanted = new HashSet<int> { rootId };
            var lookup = allCats
                .GroupBy(c => c.ParentCategoryId ?? 0)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Id).ToList());

            var q = new Queue<int>();
            q.Enqueue(rootId);

            while (q.Count > 0)
            {
                var cur = q.Dequeue();
                if (lookup.TryGetValue(cur, out var children))
                    foreach (var cid in children)
                        if (wanted.Add(cid))
                            q.Enqueue(cid);
            }
            return wanted;
        }

        // ---------- CRUD & basit sorgular ----------
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
            var wanted = await GetCategoryTreeIdsAsync(categoryId);

            var all = await _productRepository.GetAllAsync();
            var filtered = all.Where(p => wanted.Contains(p.CategoryId)).ToList();

            var ids = filtered.Select(p => p.Id).ToList();
            var ratings = await GetRatingsMapAsync(ids);

            return filtered.Select(p =>
            {
                ratings.TryGetValue(p.Id, out var rating);
                return ToDto(p, rating.Avg, rating.Count);
            }).ToList();
        }

        public async Task<IEnumerable<ProductDto>> GetDiscountedAsync()
        {
            // Ürünleri ve varyantlarını yükle
            var all = await _productRepository.GetAllAsync();
    
            var discountedItems = new List<ProductDto>();
    
            foreach (var p in all.Where(p => p.IsActive))
            {
                var ratings = await GetRatingsMapAsync(new[] { p.Id });
                ratings.TryGetValue(p.Id, out var rating);
        
                // Varyantları var mı kontrol et
                var hasVariants = p.Variants != null && p.Variants.Any();
        
                if (hasVariants)
                {
                    // HER İNDİRİMLİ VARYANTI AYRI EKLE
                    var discountedVariants = p.Variants
                        .Where(v => v.IsActive && (v.DiscountPercent ?? 0) > 0)
                        .ToList();
            
                    foreach (var variant in discountedVariants)
                    {
                        discountedItems.Add(ToDto(
                            p, 
                            rating.Avg, 
                            rating.Count,
                            variant.Price,
                            variant.ImageUrl,
                            variant.DiscountPercent
                        ));
                    }
                }
                else
                {
                    // VARYANT YOKSA VE ÜRÜN İNDİRİMLİYSE ÜRÜNÜ EKLE
                    if ((p.DiscountPercent ?? 0) > 0)
                    {
                        discountedItems.Add(ToDto(
                            p, 
                            rating.Avg, 
                            rating.Count,
                            p.Price,
                            p.ImageUrl,
                            p.DiscountPercent
                        ));
                    }
                }
            }
    
            // İndirim oranına göre sırala
            return discountedItems
                .OrderByDescending(p => p.DiscountPercent)
                .ThenBy(p => p.Name)
                .ToList();
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
                Tags = dto.Tags,
                Ingredients = dto.Ingredients,
                
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
            product.Ingredients = dto.Ingredients;
            
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

            var updated = ToDto(product, rating.Avg, rating.Count);
            return ServiceResult<ProductDto>.Ok(updated, "Product updated successfully!");
        }

        public async Task<ServiceResult<bool>> DeleteAsync(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                return ServiceResult<bool>.Fail("Product is not found!");

            await _productRepository.DeleteAsync(product);
            return ServiceResult<bool>.Ok(true, "Product deleted successfully!");
        }

        // ---------- Klasik browse (paged by product) ----------
        public async Task<PagedResult<ProductDto>> BrowseAsync(ProductBrowseQuery q)
        {
            q ??= new ProductBrowseQuery();
            var page = Math.Max(1, q.Page);
            var pageSize = Math.Clamp(q.PageSize, 6, 48);

            var reviewsAgg =
                _db.ProductReviews
                    .Where(r => r.Status == ProductReview.ReviewStatus.Approved)
                    .GroupBy(r => r.ProductId)
                    .Select(g => new
                    {
                        ProductId = g.Key,
                        Avg = g.Average(x => (double)x.Rating),
                        Cnt = g.Count()
                    });

            var defaultVariants = await _db.ProductVariants
                .Where(v => v.IsDefault)
                .Select(v => new
                {
                    v.ProductId,
                    v.ImageUrl,
                    v.Price,
                    v.DiscountPercent,
                    v.StockQuantity,
                    v.Id
                })
                .ToListAsync();

            var defaultVarMap = defaultVariants
                .GroupBy(v => v.ProductId)
                .ToDictionary(
                    g => g.Key,
                    g => g.OrderByDescending(v => v.StockQuantity).ThenBy(v => v.Id).FirstOrDefault()
                );

            var baseQuery =
                from p in _db.Products.AsNoTracking()
                join r in reviewsAgg on p.Id equals r.ProductId into rj
                from r in rj.DefaultIfEmpty()
                join c in _db.Categories on p.CategoryId equals c.Id
                select new
                {
                    Product = p,
                    CategoryName = c.Name,
                    RatingAverage = (double?)(r != null ? r.Avg : null),
                    RatingCount = (int?)(r != null ? r.Cnt : null)
                };

            // Filters
            if (q.InStock == true)
                baseQuery = baseQuery.Where(x => x.Product.StockQuantity > 0);

            // 🔧 Ağaç bazlı kategori filtresi
            if (q.CategoryId is int cid)
            {
                var tree = await GetCategoryTreeIdsAsync(cid);
                baseQuery = baseQuery.Where(x => tree.Contains(x.Product.CategoryId));
            }

            if (!string.IsNullOrWhiteSpace(q.Q))
            {
                var term = q.Q.Trim();
                baseQuery = baseQuery.Where(x =>
                    EF.Functions.Like(x.Product.Name, $"%{term}%") ||
                    EF.Functions.Like(x.Product.Brand, $"%{term}%") ||
                    EF.Functions.Like(x.Product.Description, $"%{term}%"));
            }

            if (q.PriceMin is decimal pmin)
                baseQuery = baseQuery.Where(x => x.Product.Price >= pmin);
            if (q.PriceMax is decimal pmax)
                baseQuery = baseQuery.Where(x => x.Product.Price <= pmax);
            if (q.Discounted == true)
                baseQuery = baseQuery.Where(x => (x.Product.DiscountPercent ?? 0) > 0);

            var brands = SplitCsv(q.Brands);
            if (brands.Length > 0)
                baseQuery = baseQuery.Where(x => brands.Contains(x.Product.Brand));

            if (q.SuitableForSkin is int mask && mask > 0)
                baseQuery = baseQuery.Where(x => ((int)x.Product.SuitableForSkin & mask) != 0);

            if (!string.IsNullOrWhiteSpace(q.SelectedRatings))
            {
                var ratingsSel = q.SelectedRatings
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(s => int.TryParse(s, out var num) ? num : -1)
                    .Where(n => n >= 1 && n <= 5)
                    .ToList();

                if (ratingsSel.Any())
                {
                    baseQuery = baseQuery.Where(x =>
                        x.RatingAverage != null &&
                        ratingsSel.Any(rating =>
                            x.RatingAverage >= rating - 0.5 &&
                            x.RatingAverage < rating + 0.5
                        )
                    );
                }
            }

            if (q.HasSpf == true) baseQuery = baseQuery.Where(x => x.Product.HasSpf);
            if (q.FragranceFree == true) baseQuery = baseQuery.Where(x => x.Product.FragranceFree);
            if (q.NonComedogenic == true) baseQuery = baseQuery.Where(x => x.Product.NonComedogenic);
            if (q.Longwear == true) baseQuery = baseQuery.Where(x => x.Product.Longwear);
            if (q.Waterproof == true) baseQuery = baseQuery.Where(x => x.Product.Waterproof);
            if (q.PhotoFriendly == true) baseQuery = baseQuery.Where(x => x.Product.PhotoFriendly);

            if (!string.IsNullOrWhiteSpace(q.Finish))
            {
                var finishEnum = ParseFinish(q.Finish);
                if (finishEnum.HasValue)
                    baseQuery = baseQuery.Where(x => x.Product.Finish == finishEnum.Value);
            }

            if (!string.IsNullOrWhiteSpace(q.Coverage))
            {
                var coverageEnum = ParseCoverage(q.Coverage);
                if (coverageEnum.HasValue)
                    baseQuery = baseQuery.Where(x => x.Product.Coverage == coverageEnum.Value);
            }

            var sort = string.IsNullOrWhiteSpace(q.Sort) ? "best" : q.Sort;
            var orderedQuery = sort switch
            {
                "price_asc" => baseQuery.OrderBy(x => x.Product.Price).ThenBy(x => x.Product.Name),
                "price_desc" => baseQuery.OrderByDescending(x => x.Product.Price).ThenBy(x => x.Product.Name),
                "discount" => baseQuery.OrderByDescending(x => x.Product.DiscountPercent ?? 0).ThenBy(x => x.Product.Price),
                "new" => baseQuery.OrderByDescending(x => x.Product.Id),
                "best" => baseQuery.OrderByDescending(x => x.RatingAverage ?? 0)
                    .ThenByDescending(x => x.RatingCount ?? 0)
                    .ThenByDescending(x => x.Product.Id),
                _ => baseQuery.OrderBy(x => x.Product.Brand).ThenBy(x => x.Product.Name)
            };

            var totalList = await orderedQuery.Select(x => x.Product.Id).ToListAsync();
            var total = totalList.Count;

            var tempList = await orderedQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = new List<ProductDto>();

            foreach (var x in tempList)
            {
                var overrideData = await _db.ProductVariants
                    .Where(v => v.ProductId == x.Product.Id && v.IsDefault)
                    .OrderByDescending(v => v.StockQuantity).ThenBy(v => v.Id)
                    .FirstOrDefaultAsync();

                items.Add(ToDto(
                    x.Product,
                    x.RatingAverage,
                    x.RatingCount ?? 0,
                    overrideData?.Price,
                    overrideData?.ImageUrl,
                    overrideData?.DiscountPercent
                ));
            }

            return new PagedResult<ProductDto>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalItems = total,
                TotalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize))
            };
        }

        // ---------- Genişletilmiş liste (varyantlar ayrı satır) ----------
        public async Task<IEnumerable<ProductListItemDto>> BrowseExpandedAsync(ProductBrowseQuery q)
        {
            q ??= new ProductBrowseQuery();

            IQueryable<Product> baseQ = _db.Products
                .AsNoTracking()
                .Include(p => p.Variants);
            
            // 🔧 Ağaç bazlı kategori filtresi
            if (q.CategoryId is int cid)
            {
                var tree = await GetCategoryTreeIdsAsync(cid);
                baseQ = baseQ.Where(p => tree.Contains(p.CategoryId));
            }

            if (!string.IsNullOrWhiteSpace(q.Q))
            {
                var term = q.Q.Trim();
                baseQ = baseQ.Where(p =>
                    EF.Functions.Like(p.Name, $"%{term}%") ||
                    EF.Functions.Like(p.Brand, $"%{term}%") ||
                    EF.Functions.Like(p.Description, $"%{term}%"));
            }
            

            var brands = SplitCsv(q.Brands);
            if (brands.Length > 0) baseQ = baseQ.Where(p => brands.Contains(p.Brand));

            if (q.SuitableForSkin is int mask && mask > 0)
                baseQ = baseQ.Where(p => ((int)p.SuitableForSkin & mask) != 0);

            if (!string.IsNullOrWhiteSpace(q.Finish))
            {
                var finishEnum = ParseFinish(q.Finish);
                if (finishEnum.HasValue) baseQ = baseQ.Where(p => p.Finish == finishEnum.Value);
            }

            if (!string.IsNullOrWhiteSpace(q.Coverage))
            {
                var coverageEnum = ParseCoverage(q.Coverage);
                if (coverageEnum.HasValue) baseQ = baseQ.Where(p => p.Coverage == coverageEnum.Value);
            }

            if (q.HasSpf == true) baseQ = baseQ.Where(p => p.HasSpf);
            if (q.FragranceFree == true) baseQ = baseQ.Where(p => p.FragranceFree);
            if (q.NonComedogenic == true) baseQ = baseQ.Where(p => p.NonComedogenic);
            if (q.Longwear == true) baseQ = baseQ.Where(p => p.Longwear);
            if (q.Waterproof == true) baseQ = baseQ.Where(p => p.Waterproof);
            if (q.PhotoFriendly == true) baseQ = baseQ.Where(p => p.PhotoFriendly);

            var products = await baseQ.ToListAsync();

            if (!string.IsNullOrWhiteSpace(q.SelectedRatings))
            {
                var ratingsSel = q.SelectedRatings
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(s => int.TryParse(s, out var n) ? n : -1)
                    .Where(n => n >= 1 && n <= 5)
                    .ToList();

                if (ratingsSel.Any())
                {
                    var ratingMap = await GetRatingsMapAsync(products.Select(p => p.Id));

                    products = products
                        .Where(p =>
                            ratingMap.TryGetValue(p.Id, out var r) &&
                            ratingsSel.Any(star => r.Avg >= star - 0.5 && r.Avg < star + 0.5)
                        )
                        .ToList();
                }
            }

            // Varyantları ayrı satıra yay
            var items = new List<ProductListItemDto>();

            foreach (var p in products)
            {
                var variants = p.Variants?.Where(v => v.IsActive).ToList() ?? new List<ProductVariant>();

                if (variants.Count == 0)
                {
                    items.Add(new ProductListItemDto(
                        p.Id, null, p.Name, p.Brand, p.ImageUrl,
                        p.Price, p.DiscountPercent,
                        p.DiscountPercent.HasValue && p.DiscountPercent > 0
                            ? p.Price * (1 - p.DiscountPercent.Value / 100m)
                            : p.Price,
                        p.IsActive && p.StockQuantity > 0,
                        p.ShadeFamily, null,
                        p.StockQuantity
                    ));
                }
                else
                {
                    foreach (var v in variants.OrderByDescending(x => x.IsDefault).ThenBy(x => x.Name))
                    {
                        items.Add(new ProductListItemDto(
                            p.Id, v.Id,
                            $"{p.Name} - {v.Name}",
                            p.Brand,
                            v.ImageUrl,
                            v.Price,
                            v.DiscountPercent,
                            v.DiscountPercent.HasValue && v.DiscountPercent > 0
                                ? v.Price * (1 - v.DiscountPercent.Value / 100m)
                                : v.Price,
                            v.IsActive && v.StockQuantity > 0,
                            v.ShadeFamily,
                            v.HexColor,
                            v.StockQuantity 
                        ));
                    }
                }
            }

            items = items.Where(x => x.IsActive).ToList();

            if (q.InStock == true)
                items = items.Where(x => x.StockQuantity > 0).ToList();

            if (q.Discounted == true)
                items = items.Where(x => (x.DiscountPercent ?? 0) > 0).ToList();

            if (q.PriceMin is decimal pmin)
                items = items.Where(x => x.FinalPrice >= pmin).ToList();

            if (q.PriceMax is decimal pmax)
                items = items.Where(x => x.FinalPrice <= pmax).ToList();

            var sort = string.IsNullOrWhiteSpace(q.Sort) ? "best" : q.Sort;
            var sorted = sort switch
            {
                "price_asc" => items.OrderBy(x => x.FinalPrice).ThenBy(x => x.Name).ToList(),
                "price_desc" => items.OrderByDescending(x => x.FinalPrice).ThenBy(x => x.Name).ToList(),
                "discount" => items.OrderByDescending(x => x.DiscountPercent ?? 0).ThenBy(x => x.FinalPrice).ToList(),
                "new" => items.OrderByDescending(x => x.ProductId).ToList(),
                _ => items.OrderByDescending(x => x.IsActive).ThenBy(x => x.Brand).ThenBy(x => x.Name).ToList()
            };

            return sorted;
        }
    }
}