using makeup.Models.Repositories;
using makeup.Models.Repositories.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace makeup.Controllers.Admin;

[ApiController]
[Route("api/admin/products")]
[Authorize(Roles = "Admin")]
public class ProductImagesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<ProductImagesController> _logger;

    public ProductImagesController(
        AppDbContext context, 
        IWebHostEnvironment env,
        ILogger<ProductImagesController> logger)
    {
        _context = context;
        _env = env;
        _logger = logger;
    }

    // ✅ Görselleri getir (varyanta göre filtrelenmiş)
    [HttpGet("{productId:int}/images")]
    public async Task<IActionResult> GetImages(int productId, [FromQuery] int? variantId = null)
    {
        _logger.LogInformation("GetImages çağrıldı: ProductId={ProductId}, VariantId={VariantId}", 
            productId, variantId);

        var query = _context.ProductImages
            .Where(i => i.ProductId == productId);

        // Varyant bazlı filtreleme
        if (variantId.HasValue)
            query = query.Where(i => i.VariantId == variantId.Value);
        else
            query = query.Where(i => i.VariantId == null);

        var images = await query
            .OrderBy(i => i.SortOrder)
            .Select(i => new
            {
                i.Id,
                i.Url,
                i.Alt,
                i.SortOrder,
                i.IsPrimary,
                i.VariantId
            })
            .ToListAsync();

        _logger.LogInformation("GetImages sonucu: {Count} görsel bulundu", images.Count);
        return Ok(images);
    }

    // ✅ Çoklu görsel yükleme
    [HttpPost("{productId:int}/images")]
    [RequestSizeLimit(50_000_000)] // 50MB
    public async Task<IActionResult> UploadImages(
        int productId,
        [FromForm] IFormFileCollection files,
        [FromQuery] int? variantId = null)  // ✅ Query string'den al
    {
        try
        {
            _logger.LogInformation(
                "UploadImages başladı: ProductId={ProductId}, VariantId={VariantId}, FileCount={FileCount}", 
                productId, variantId, files?.Count ?? 0);

            // Ürün var mı kontrol et
            var productExists = await _context.Products.AnyAsync(p => p.Id == productId);
            if (!productExists)
            {
                _logger.LogWarning("Ürün bulunamadı: {ProductId}", productId);
                return NotFound(new { message = "Ürün bulunamadı." });
            }

            // Varyant kontrolü (eğer variantId verildiyse)
            if (variantId.HasValue)
            {
                var variantExists = await _context.ProductVariants
                    .AnyAsync(v => v.Id == variantId.Value && v.ProductId == productId);
                if (!variantExists)
                {
                    _logger.LogWarning("Varyant bulunamadı: ProductId={ProductId}, VariantId={VariantId}", 
                        productId, variantId.Value);
                    return NotFound(new { message = "Varyant bulunamadı." });
                }
            }

            if (files == null || files.Count == 0)
            {
                _logger.LogWarning("Dosya bulunamadı");
                return BadRequest(new { message = "Dosya bulunamadı." });
            }

            var relDir = "images/products";
            var absDir = Path.Combine(_env.WebRootPath, relDir);
            Directory.CreateDirectory(absDir);

            var uploadedImages = new List<object>();
            
            // ✅ KRITIK: Sadece ilgili varyant/ana ürünün görsellerini al
            var existingImages = await _context.ProductImages
                .Where(i => i.ProductId == productId && 
                       (variantId.HasValue ? i.VariantId == variantId.Value : i.VariantId == null))
                .ToListAsync();
            
            int currentMaxOrder = existingImages.Any() 
                ? existingImages.Max(i => i.SortOrder) 
                : 0;

            _logger.LogInformation("Mevcut max sıra: {MaxOrder}, Hedef: {Target}", 
                currentMaxOrder, 
                variantId.HasValue ? $"Varyant #{variantId.Value}" : "Ana Ürün");

            foreach (var file in files)
            {
                if (file.Length == 0) continue;

                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                var allowedExts = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
                
                if (!allowedExts.Contains(ext))
                {
                    _logger.LogWarning("Geçersiz dosya uzantısı: {FileName}", file.FileName);
                    continue;
                }

                var fileName = $"{Guid.NewGuid():N}{ext}";
                var absPath = Path.Combine(absDir, fileName);

                await using (var stream = new FileStream(absPath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var relPath = $"/{relDir}/{fileName}".Replace("\\", "/");

                var img = new ProductImage
                {
                    ProductId = productId,
                    VariantId = variantId, // ✅ Null veya spesifik varyant ID'si
                    Url = relPath,
                    Alt = null,
                    SortOrder = ++currentMaxOrder,
                    IsPrimary = false
                };

                _context.ProductImages.Add(img);
                
                _logger.LogInformation(
                    "Görsel eklendi: {FileName} -> ProductId={ProductId}, VariantId={VariantId}, SortOrder={SortOrder}", 
                    fileName, productId, variantId, img.SortOrder);
            }

            await _context.SaveChangesAsync();
            
            // Kaydedilen görselleri döndür
            var savedImages = await _context.ProductImages
                .Where(i => i.ProductId == productId && 
                       (variantId.HasValue ? i.VariantId == variantId.Value : i.VariantId == null))
                .OrderBy(i => i.SortOrder)
                .Select(i => new
                {
                    i.Id,
                    i.Url,
                    i.SortOrder,
                    i.VariantId
                })
                .ToListAsync();

            _logger.LogInformation("Yükleme tamamlandı: {Count} görsel kaydedildi", savedImages.Count);

            return Ok(savedImages);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Görsel yükleme hatası: ProductId={ProductId}, VariantId={VariantId}", 
                productId, variantId);
            return StatusCode(500, new { 
                message = "Görsel yükleme sırasında hata oluştu.", 
                error = ex.Message 
            });
        }
    }

    // ✅ Görsel sıralamasını güncelle
    [HttpPost("{productId:int}/images/reorder")]
    public async Task<IActionResult> ReorderImages(
        int productId,
        [FromBody] ImageOrderRequest req)
    {
        try
        {
            if (req?.Order == null || req.Order.Count == 0)
                return BadRequest("Sıralama verisi bulunamadı.");

            foreach (var item in req.Order)
            {
                var img = await _context.ProductImages
                    .FirstOrDefaultAsync(x => x.Id == item.Id && x.ProductId == productId);
                
                if (img != null)
                {
                    img.SortOrder = item.SortOrder;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Sıralama güncellendi." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Sıralama hatası");
            return StatusCode(500, new { message = "Sıralama güncellenirken hata oluştu.", error = ex.Message });
        }
    }

    // ✅ Görsel sil
    [HttpDelete("images/{id:int}")]
    public async Task<IActionResult> DeleteImage(int id)
    {
        try
        {
            var img = await _context.ProductImages.FindAsync(id);
            if (img == null) 
                return NotFound("Görsel bulunamadı.");

            // Fiziksel dosyayı sil
            var absPath = Path.Combine(_env.WebRootPath, img.Url.TrimStart('/').Replace("/", Path.DirectorySeparatorChar.ToString()));
            if (System.IO.File.Exists(absPath))
            {
                try
                {
                    System.IO.File.Delete(absPath);
                    _logger.LogInformation("Fiziksel dosya silindi: {Path}", absPath);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Fiziksel dosya silinemedi: {Path}", absPath);
                }
            }

            _context.ProductImages.Remove(img);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Görsel silindi: Id={Id}, ProductId={ProductId}, VariantId={VariantId}", 
                img.Id, img.ProductId, img.VariantId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Görsel silme hatası: Id={Id}", id);
            return StatusCode(500, new { message = "Görsel silinirken hata oluştu.", error = ex.Message });
        }
    }

    // DTO'lar
    public record ImageOrderRequest(List<ImageOrderDto> Order);
    public record ImageOrderDto(int Id, int SortOrder);
}