namespace makeup.Controllers.Admin;

using makeup.Models.Services;
using makeup.Models.Services.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using makeup.Models.Repositories;

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

    // ✅ Admin listesi (stoklu DTO döner)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AdminProductListDto>>> GetAll(
        [FromQuery] string? q, [FromQuery] int? categoryId)
    {
        var all = await _productRepository.GetAllAsync(); // Category Include'lu olmalı
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
                p.Category != null ? p.Category.Name : string.Empty
            ))
            .OrderBy(p => p.Id)
            .ToList();

        return Ok(result);
    }

    // ✅ Admin detay (edit formu) – stok dâhil
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
            p.Category != null ? p.Category.Name : string.Empty
        );

        return Ok(dto);
    }

    // ↓ Aşağıdakiler aynen kalsın (servis üzerinden çalışıyor)
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
        // TODO: burada pending kullanıcılarına e-posta / push gönder
        // gönderildikten sonra pending istekleri repo.RemoveAsync(...) ile temizleyebilirsin

        return Ok(new { notified = pending.Count() });
    }
}
