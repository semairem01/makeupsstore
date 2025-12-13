using makeup.Models.Services;
using makeup.Models.Services.Dtos;
using makeup.Models.Repositories;                 // AppDbContext
using makeup.Models.Repositories.Entities;       // ProductVariant
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace makeup.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductController(IProductService productService)
    {
        _productService = productService;
    }

    // Tüm ürünler
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetAll()
    {
        var products = await _productService.GetAllAsync();
        return Ok(products);
    }

    // Kategoriye göre ürünler
    [HttpGet("by-category/{categoryId:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetByCategory(int categoryId)
    {
        var products = await _productService.GetByCategoryAsync(categoryId);
        if (products == null || !products.Any())
            return NotFound("Bu kategoriye ait ürün bulunamadı");
        return Ok(products);
    }

    [HttpGet("by-category-tree/{categoryId:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetByCategoryTree(int categoryId)
    {
        var products = await _productService.GetByCategoryTreeAsync(categoryId);
        // Boşsa bile 200 dön ki FE kolayca göstersin
        return Ok(products ?? Enumerable.Empty<ProductDto>());
    }

    // Tek ürün
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProductDto>> GetById(int id)
    {
        var product = await _productService.GetByIdAsync(id);
        if (product == null) return NotFound();
        return Ok(product);
    }

    // Yeni ürün
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductDto>> Create([FromBody] ProductCreateDto dto)
    {
        var result = await _productService.CreateAsync(dto);
        if (!result.Success) return BadRequest(result.Message);
        return CreatedAtAction(nameof(GetById), new { id = result.Data.Id }, result.Data);
    }

    // Güncelle
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductDto>> Update(int id, [FromBody] ProductUpdateDto dto)
    {
        if (id != dto.Id) return BadRequest("Ids do not match");
        var result = await _productService.UpdateAsync(dto);
        if (!result.Success) return BadRequest(result.Message);
        return Ok(result.Data);
    }

    // Sil
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> Delete(int id)
    {
        var result = await _productService.DeleteAsync(id);
        if (!result.Success) return NotFound(result.Message);
        return NoContent();
    }

    [HttpGet("discounted")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetDiscounted()
    {
        var products = await _productService.GetDiscountedAsync();
        return Ok(products);
    }

    [HttpGet("search")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ProductDto>>> Search([FromQuery] string q)
    {
        var items = await _productService.SearchAsync(q);
        return Ok(items);
    }

    [HttpGet("browse")]
    [AllowAnonymous]
    public async Task<ActionResult<PagedResult<ProductDto>>> Browse([FromQuery] ProductBrowseQuery query)
    {
        var result = await _productService.BrowseAsync(query);
        return Ok(result);
    }

    [HttpGet("suggestions-for-free-shipping")]
[AllowAnonymous]
public async Task<ActionResult<IEnumerable<ProductDto>>> GetSuggestionsForFreeShipping(
    [FromServices] AppDbContext db,
    [FromQuery] decimal maxPrice,
    [FromQuery] int limit = 4)
{
    if (limit <= 0) limit = 4;

    // ---- Ortak base sorgu: aktif + stokta
    var baseQuery = db.Products
        .AsNoTracking()
        .Include(p => p.Category)
        .Include(p => p.Variants).ThenInclude(v => v.Images)
        .Include(p => p.Images)
        .Where(p => p.IsActive && p.StockQuantity > 0 && p.Price > 0);

    // 1) Önce maxPrice altındakiler
    var inBudget = await baseQuery
        .Where(p => maxPrice > 0 ? p.Price <= maxPrice : true)
        .OrderBy(p => p.Price)
        .ThenByDescending(p => p.DiscountPercent ?? 0)
        .Take(limit)
        .ToListAsync();

    // 2) Yeterli değilse, bütçe üstünden en ucuzlarla doldur (duplikasyon yok)
    if (inBudget.Count < limit)
    {
        var missing = limit - inBudget.Count;
        var takenIds = inBudget.Select(p => p.Id).ToHashSet();

        var topUp = await baseQuery
            .Where(p => !takenIds.Contains(p.Id))
            .OrderBy(p => p.Price)                       // en ucuzlardan
            .ThenByDescending(p => p.DiscountPercent ?? 0)
            .Take(missing)
            .ToListAsync();

        inBudget.AddRange(topUp);
    }

    // ---- Rating toplama
    var productIds = inBudget.Select(p => p.Id).ToList();
    var ratingsAgg = await db.ProductReviews
        .Where(r => productIds.Contains(r.ProductId) &&
                    r.Status == ProductReview.ReviewStatus.Approved)
        .GroupBy(r => r.ProductId)
        .Select(g => new { ProductId = g.Key, Avg = g.Average(x => (double)x.Rating), Count = g.Count() })
        .ToListAsync();
    var ratingsMap = ratingsAgg.ToDictionary(x => x.ProductId, x => (x.Avg, x.Count));

    // ---- DTO map
    var result = inBudget.Select(p =>
    {
        ratingsMap.TryGetValue(p.Id, out var rating);
        var defaultVariant = p.Variants?
            .Where(v => v.IsDefault && v.IsActive && v.StockQuantity > 0)
            .OrderByDescending(v => v.StockQuantity)
            .FirstOrDefault();

        return new ProductDto(
            p.Id, p.Name, p.Brand, p.Description,
            defaultVariant?.Price ?? p.Price,
            p.IsActive,
            defaultVariant?.ImageUrl ?? p.ImageUrl,
            p.Color, p.Size, p.CategoryId, p.Category?.Name ?? "",
            defaultVariant?.DiscountPercent ?? p.DiscountPercent,
            p.Ingredients,
            (int)p.SuitableForSkin,
            p.Finish?.ToString(), p.Coverage?.ToString(),
            p.Longwear, p.Waterproof, p.PhotoFriendly, p.HasSpf,
            p.FragranceFree, p.NonComedogenic, p.ShadeFamily, p.Tags,
            rating.Avg, rating.Count, p.StockQuantity,
            p.Variants?.OrderByDescending(v => v.IsDefault).ThenBy(v => v.Name)
                .Select(v => new ProductVariantDto(
                    v.Id, v.ProductId, v.Sku, v.Barcode, v.Name,
                    v.ShadeCode, v.ShadeFamily, v.HexColor,
                    v.SwatchImageUrl, v.ImageUrl, v.Price,
                    v.DiscountPercent, v.StockQuantity, v.IsActive, v.IsDefault,
                    v.Images?.OrderBy(i => i.SortOrder)
                        .Select(i => new ImageDto(i.Id, i.Url, i.Alt, i.IsPrimary, i.SortOrder))
                        .ToList() ?? new List<ImageDto>()
                )).ToList(),
            p.Images?.OrderBy(i => i.SortOrder)
                .Select(i => new ImageDto(i.Id, i.Url, i.Alt, i.IsPrimary, i.SortOrder))
                .ToList()
        );
    }).ToList();

    return Ok(result);
}
    
    // ---- VARYANTLAR ----

    [HttpGet("{id:int}/variants")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ProductVariantDto>>> GetVariants(
        int id,
        [FromServices] AppDbContext db)
    {
        // Ürün var mı kontrolü (opsiyonel ama faydalı)
        var exists = await db.Products.AnyAsync(p => p.Id == id);
        if (!exists) return NotFound("Ürün bulunamadı.");

        var list = await db.ProductVariants
            .Where(v => v.ProductId == id && v.IsActive)
            .OrderByDescending(v => v.IsDefault)
            .ThenBy(v => v.Name)
            .Select(v => ToVariantDto(v))
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id:int}/variant/{variantId:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProductVariantDto>> GetVariant(
        int id,
        int variantId,
        [FromServices] AppDbContext db)
    {
        var v = await db.ProductVariants
            .FirstOrDefaultAsync(x => x.Id == variantId && x.ProductId == id);

        if (v is null) return NotFound();
        return Ok(ToVariantDto(v));
    }

    // ---- Expanded (varyantlar ayrı satır) ----
    // Düz array (FE hem array hem paged objeyi destekliyor)
    [HttpGet("browse-expanded")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ProductListItemDto>>> BrowseExpanded([FromQuery] ProductBrowseQuery query)
    {
        var items = await _productService.BrowseExpandedAsync(query);
        return Ok(items);
    }

    
    // ---- Local helper: Entity -> DTO map ----
    private static ProductVariantDto ToVariantDto(ProductVariant v) => new(
        v.Id,
        v.ProductId,
        v.Sku,
        v.Barcode,
        v.Name,
        v.ShadeCode,
        v.ShadeFamily,
        v.HexColor,
        v.SwatchImageUrl,
        v.ImageUrl,
        v.Price,
        v.DiscountPercent,
        v.StockQuantity,
        v.IsActive,
        v.IsDefault,
        v.Images?
            .OrderBy(i => i.SortOrder)
            .Select(i => new ImageDto(i.Id, i.Url, i.Alt, i.IsPrimary, i.SortOrder))
            .ToList() ?? new List<ImageDto>()
        
    );
    
    [HttpGet("recently-added")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetRecentlyAdded(
        [FromServices] AppDbContext db,
        [FromQuery] int days = 30,
        [FromQuery] int limit = 12)
    {
    var cutoffDate = DateTime.UtcNow.AddDays(-days);
    
    var products = await db.Products
        .AsNoTracking()
        .Include(p => p.Category)
        .Include(p => p.Variants).ThenInclude(v => v.Images)
        .Include(p => p.Images)
        .Where(p => p.IsActive && 
                    p.StockQuantity > 0 && 
                    p.CreatedAt >= cutoffDate)
        .OrderByDescending(p => p.CreatedAt)
        .Take(limit)
        .ToListAsync();

    // Rating hesaplama...
    var productIds = products.Select(p => p.Id).ToList();
    var ratingsAgg = await db.ProductReviews
        .Where(r => productIds.Contains(r.ProductId) &&
                    r.Status == ProductReview.ReviewStatus.Approved)
        .GroupBy(r => r.ProductId)
        .Select(g => new { ProductId = g.Key, Avg = g.Average(x => (double)x.Rating), Count = g.Count() })
        .ToListAsync();
    var ratingsMap = ratingsAgg.ToDictionary(x => x.ProductId, x => (x.Avg, x.Count));

    // DTO mapping (suggestions-for-free-shipping'dekine benzer)
    var result = products.Select(p => {
        ratingsMap.TryGetValue(p.Id, out var rating);
        var defaultVariant = p.Variants?
            .Where(v => v.IsDefault && v.IsActive && v.StockQuantity > 0)
            .OrderByDescending(v => v.StockQuantity)
            .FirstOrDefault();

        return new ProductDto(
            p.Id, p.Name, p.Brand, p.Description,
            defaultVariant?.Price ?? p.Price,
            p.IsActive,
            defaultVariant?.ImageUrl ?? p.ImageUrl,
            p.Color, p.Size, p.CategoryId, p.Category?.Name ?? "",
            defaultVariant?.DiscountPercent ?? p.DiscountPercent,
            p.Ingredients,
            (int)p.SuitableForSkin,
            p.Finish?.ToString(), p.Coverage?.ToString(),
            p.Longwear, p.Waterproof, p.PhotoFriendly, p.HasSpf,
            p.FragranceFree, p.NonComedogenic, p.ShadeFamily, p.Tags,
            rating.Avg, rating.Count, p.StockQuantity,
            p.Variants?.OrderByDescending(v => v.IsDefault).ThenBy(v => v.Name)
                .Select(v => new ProductVariantDto(
                    v.Id, v.ProductId, v.Sku, v.Barcode, v.Name,
                    v.ShadeCode, v.ShadeFamily, v.HexColor,
                    v.SwatchImageUrl, v.ImageUrl, v.Price,
                    v.DiscountPercent, v.StockQuantity, v.IsActive, v.IsDefault,
                    v.Images?.OrderBy(i => i.SortOrder)
                        .Select(i => new ImageDto(i.Id, i.Url, i.Alt, i.IsPrimary, i.SortOrder))
                        .ToList() ?? new List<ImageDto>()
                )).ToList(),
            p.Images?.OrderBy(i => i.SortOrder)
                .Select(i => new ImageDto(i.Id, i.Url, i.Alt, i.IsPrimary, i.SortOrder))
                .ToList()
        );
    }).ToList();

    return Ok(result);
}
}
