using makeup.Models.Repositories;                 // AppDbContext / IProductRepository
using makeup.Models.Repositories.Entities;       // Product, ProductVariant, ...
using makeup.Models.Services;                    // IProductService
using makeup.Models.Services.Dtos;               // DTO'lar
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace makeup.Controllers.Admin;

[ApiController]
[Route("api/admin/[controller]")]
[Authorize(Roles = "Admin")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;
    private readonly IWebHostEnvironment _env;
    private readonly IProductRepository _productRepository;

    public ProductsController(
        IProductService productService,
        IWebHostEnvironment env,
        IProductRepository productRepository)
    {
        _productService = productService;
        _env = env;
        _productRepository = productRepository;
    }

    // ✅ Admin listesi (stoklu + yeni alanlar)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AdminProductListDto>>> GetAll(
        [FromQuery] string? q, [FromQuery] int? categoryId)
    {
        var all = await _productRepository.GetAllAsync(); // Category include'lu
        var list = all.AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var s = q.Trim();
            list = list.Where(p =>
                p.Name.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                p.Brand.Contains(s, StringComparison.OrdinalIgnoreCase));
        }

        if (categoryId.HasValue)
            list = list.Where(p => p.CategoryId == categoryId.Value);

        var result = list
            .Select(p => new AdminProductListDto(
                p.Id,
                p.Name,
                p.Brand,
                p.Description,
                p.Price,
                p.StockQuantity,
                p.IsActive,
                p.ImageUrl,
                p.Color,
                p.Size,
                p.CategoryId,
                p.Category != null ? p.Category.Name : string.Empty,
                (int)p.SuitableForSkin,
                p.Finish != null ? p.Finish.ToString() : null,
                p.Coverage != null ? p.Coverage.ToString() : null,
                p.Longwear,
                p.Waterproof,
                p.PhotoFriendly,
                p.HasSpf,
                p.FragranceFree,
                p.NonComedogenic,
                p.ShadeFamily,
                p.Tags,
                p.Ingredients, 
                p.DiscountPercent,
                p.Variants != null
                    ? p.Variants
                        .OrderByDescending(v => v.IsDefault)
                        .ThenBy(v => v.Name)
                        .Select(ToVariantUpsertDto)
                        .ToList()
                    : new List<ProductVariantUpsertDto>()
            ))
            .OrderBy(p => p.Id)
            .ToList();

        return Ok(result);
    }

    // ✅ Admin detay (edit formu)
    [HttpGet("{id:int}")]
    public async Task<ActionResult<AdminProductListDto>> GetById(int id)
    {
        var p = await _productRepository.GetByIdAsync(id);
        if (p is null) return NotFound();

        var dto = new AdminProductListDto(
            p.Id,
            p.Name,
            p.Brand,
            p.Description,
            p.Price,
            p.StockQuantity,
            p.IsActive,
            p.ImageUrl,
            p.Color,
            p.Size,
            p.CategoryId,
            p.Category != null ? p.Category.Name : string.Empty,
            (int)p.SuitableForSkin,
            p.Finish != null ? p.Finish.ToString() : null,
            p.Coverage != null ? p.Coverage.ToString() : null,
            p.Longwear,
            p.Waterproof,
            p.PhotoFriendly,
            p.HasSpf,
            p.FragranceFree,
            p.NonComedogenic,
            p.ShadeFamily,
            p.Tags,
            p.Ingredients, 
            p.DiscountPercent,
            p.Variants != null
                ? p.Variants
                    .OrderByDescending(v => v.IsDefault)
                    .ThenBy(v => v.Name)
                    .Select(ToVariantUpsertDto)
                    .ToList()
                : new List<ProductVariantUpsertDto>()
        );

        return Ok(dto);
    }

    // ---- ÜRÜN CRUD (servis üzerinden) ----

    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create([FromBody] ProductCreateDto dto)
    {
        var result = await _productService.CreateAsync(dto);
        if (!result.Success) return BadRequest(result.Message);
        return CreatedAtAction(nameof(GetById), new { id = result.Data.Id }, result.Data);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ProductDto>> Update(int id, [FromBody] ProductUpdateDto dto)
    {
        if (id != dto.Id) return BadRequest("IDs do not match");
        var result = await _productService.UpdateAsync(dto);
        if (!result.Success) return BadRequest(result.Message);
        return Ok(result.Data);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        var result = await _productService.DeleteAsync(id);
        if (!result.Success) return NotFound(result.Message);
        return NoContent();
    }

    // ---- Görsel yükleme ----

    [HttpPost("upload-image")]
    [RequestSizeLimit(10_000_000)] // ~10MB
    public async Task<IActionResult> UploadImage([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("Dosya bulunamadı.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var ok = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        if (!ok.Contains(ext)) return BadRequest("Sadece jpg, jpeg, png, webp, gif yükleyin.");

        var relDir = "images/products";
        var absDir = Path.Combine(_env.WebRootPath, relDir);
        Directory.CreateDirectory(absDir);

        var fname = $"{Guid.NewGuid():N}{ext}";
        var absPath = Path.Combine(absDir, fname);

        await using (var fs = new FileStream(absPath, FileMode.Create))
            await file.CopyToAsync(fs);

        var relative = $"/{relDir}/{fname}".Replace("\\", "/");
        return Ok(new { path = relative });
    }

    [HttpPost("{id:int}/notify-waiters")]
    public async Task<IActionResult> NotifyWaiters(int id, [FromServices] INotifyRequestRepository notifyRepo)
    {
        var pending = await notifyRepo.GetPendingRequestsAsync(id);
        // TODO: pending kullanıcılara e-posta / push gönder; başarılıysa repo.RemoveAsync(...)
        return Ok(new { notified = pending.Count() });
    }

    // ---- VARYANT CRUD ----

    [HttpGet("{productId:int}/variants")]
    public async Task<IActionResult> AdminListVariants(int productId, [FromServices] AppDbContext db)
    {
        var exists = await db.Products.AnyAsync(p => p.Id == productId);
        if (!exists) return NotFound("Product not found.");

        var list = await db.ProductVariants
            .Where(v => v.ProductId == productId)
            .OrderByDescending(v => v.IsDefault)
            .ThenBy(v => v.Name)
            .Select(v => ToVariantDto(v))
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost("{productId:int}/variants")]
    public async Task<IActionResult> AdminCreateVariant(
        int productId,
        [FromBody] ProductVariantUpsertDto dto,
        [FromServices] AppDbContext db)
    {
        var p = await db.Products.FindAsync(productId);
        if (p is null) return NotFound("Product not found.");

        // SKU benzersizliği (aynı ürün içinde) kontrolü (opsiyonel ama faydalı)
        var skuExists = await db.ProductVariants
            .AnyAsync(x => x.ProductId == productId && x.Sku == dto.Sku);
        if (skuExists) return BadRequest("Aynı ürün için bu SKU zaten mevcut.");

        var v = new ProductVariant
        {
            ProductId = productId,
            Sku = dto.Sku,
            Barcode = dto.Barcode,
            Name = dto.Name,
            ShadeCode = dto.ShadeCode,
            ShadeFamily = dto.ShadeFamily,
            HexColor = dto.HexColor,
            SwatchImageUrl = dto.SwatchImageUrl,
            ImageUrl = dto.ImageUrl,
            Price = dto.Price,
            DiscountPercent = dto.DiscountPercent,
            StockQuantity = dto.StockQuantity,
            IsActive = dto.IsActive,
            IsDefault = dto.IsDefault
        };

        if (v.IsDefault)
        {
            await db.ProductVariants
                .Where(x => x.ProductId == productId && x.IsDefault)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsDefault, false));
        }

        db.ProductVariants.Add(v);
        await db.SaveChangesAsync();

        // CreatedAtAction (istenirse admin variant get ucu eklenip ona link verilebilir)
        return Ok(ToVariantDto(v));
    }

    [HttpPut("{productId:int}/variants/{id:int}")]
    public async Task<IActionResult> AdminUpdateVariant(
        int productId,
        int id,
        [FromBody] ProductVariantUpsertDto dto,
        [FromServices] AppDbContext db)
    {
        var v = await db.ProductVariants
            .FirstOrDefaultAsync(x => x.Id == id && x.ProductId == productId);
        if (v is null) return NotFound();

        // SKU benzersizliği (kendi dışındakiler)
        var skuExists = await db.ProductVariants.AnyAsync(x =>
            x.ProductId == productId && x.Sku == dto.Sku && x.Id != id);
        if (skuExists) return BadRequest("Aynı ürün için bu SKU zaten mevcut.");

        v.Sku = dto.Sku;
        v.Barcode = dto.Barcode;
        v.Name = dto.Name;
        v.ShadeCode = dto.ShadeCode;
        v.ShadeFamily = dto.ShadeFamily;
        v.HexColor = dto.HexColor;
        v.SwatchImageUrl = dto.SwatchImageUrl;
        v.ImageUrl = dto.ImageUrl;
        v.Price = dto.Price;
        v.DiscountPercent = dto.DiscountPercent;
        v.StockQuantity = dto.StockQuantity;
        v.IsActive = dto.IsActive;

        if (dto.IsDefault && !v.IsDefault)
        {
            await db.ProductVariants
                .Where(x => x.ProductId == productId && x.IsDefault)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsDefault, false));
            v.IsDefault = true;
        }
        else if (!dto.IsDefault && v.IsDefault)
        {
            v.IsDefault = false;
        }

        await db.SaveChangesAsync();
        return Ok(ToVariantDto(v));
    }

    [HttpDelete("{productId:int}/variants/{id:int}")]
    public async Task<IActionResult> AdminDeleteVariant(int productId, int id, [FromServices] AppDbContext db)
    {
        var v = await db.ProductVariants.FirstOrDefaultAsync(x => x.Id == id && x.ProductId == productId);
        if (v is null) return NotFound();
        db.ProductVariants.Remove(v);
        await db.SaveChangesAsync();
        return NoContent();
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
    
    private static ProductVariantUpsertDto ToVariantUpsertDto(ProductVariant v) => new(
        v.Id,              // int? Id
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
        v.IsDefault
    );
}
