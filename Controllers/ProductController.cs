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
}
