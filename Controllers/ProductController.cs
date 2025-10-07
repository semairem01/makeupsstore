using makeup.Models.Services;
using makeup.Models.Services.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetAll()
    {
        var products = await _productService.GetAllAsync();
        return Ok(products);
    }

    // Kategoriye göre ürünler
    [HttpGet("by-category/{categoryId}")]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetByCategory(int categoryId)
    {
        var products = await _productService.GetByCategoryAsync(categoryId);

        if (products == null || !products.Any())
            return NotFound("Bu kategoriye ait ürün bulunamadı");

        return Ok(products);
    }

    [HttpGet("by-category-tree/{categoryId}")]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetByCategoryTree(int categoryId)
    {
        var products = await _productService.GetByCategoryTreeAsync(categoryId);
        // Boşsa bile 200 dön ki FE kolayca göstersin
        return Ok(products ?? Enumerable.Empty<ProductDto>());
    }
    // Tek ürün
    [HttpGet("{id}")]
    public async Task<ActionResult<ProductDto>> GetById(int id)
    
    {
        var product = await _productService.GetByIdAsync(id);
        if (product == null) return NotFound();
        return Ok(product);
    }

    // Yeni ürün
    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create(ProductCreateDto dto)
    {
        var result = await _productService.CreateAsync(dto);
        if (!result.Success) return BadRequest(result.Message);
        return CreatedAtAction(nameof(GetById), new { id = result.Data.Id }, result.Data);
    }

    // Güncelle
    [HttpPut("{id}")]
    public async Task<ActionResult<ProductDto>> Update(int id, ProductUpdateDto dto)
    {
        if (id != dto.Id) return BadRequest("Ids do not match");
        var result = await _productService.UpdateAsync(dto);
        if (!result.Success) return BadRequest(result.Message);
        return Ok(result.Data);
    }

    // Sil
    [HttpDelete("{id}")]
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
}
