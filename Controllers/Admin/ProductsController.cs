namespace makeup.Controllers.Admin;
using makeup.Models.Services;
using makeup.Models.Services.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/[controller]")]
[Authorize(Roles = "Admin")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    // Tüm ürünleri listele (admin için arama ve kategori opsiyonel)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetAll([FromQuery] string? q, [FromQuery] int? categoryId)
    {
        var products = await _productService.GetAllAsync();

        if (!string.IsNullOrWhiteSpace(q))
            products = products.Where(p => p.Name.Contains(q, StringComparison.OrdinalIgnoreCase) 
                                        || p.Brand.Contains(q, StringComparison.OrdinalIgnoreCase));

        if (categoryId.HasValue)
            products = products.Where(p => p.CategoryName == categoryId.ToString());

        return Ok(products);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProductDto>> GetById(int id)
    {
        var product = await _productService.GetByIdAsync(id);
        if (product == null) return NotFound();
        return Ok(product);
    }

    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create(ProductCreateDto dto)
    {
        var result = await _productService.CreateAsync(dto);
        if (!result.Success) return BadRequest(result.Message);
        return CreatedAtAction(nameof(GetById), new { id = result.Data.Id }, result.Data);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ProductDto>> Update(int id, ProductUpdateDto dto)
    {
        if (id != dto.Id) return BadRequest("IDs do not match");
        var result = await _productService.UpdateAsync(dto);
        if (!result.Success) return BadRequest(result.Message);
        return Ok(result.Data);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
        var result = await _productService.DeleteAsync(id);
        if (!result.Success) return NotFound(result.Message);
        return NoContent();
    }
}