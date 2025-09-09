using makeup.Models.Services;
using makeup.Models.Services.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace makeup.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ProductController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductController(IProductService productService)
    {
        _productService = productService;
    }
    
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetAll()
    {
        var products = await _productService.GetAllAsync();
        return Ok(products);
    }
    
    [HttpGet("{id}")]
    public async Task<ActionResult<ProductDto>> GetById(int id)
    {
        var product = await _productService.GetByIdAsync(id);
        if(product == null) return NotFound();
        return Ok(product);
    }

    //[Authorize]
    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create(ProductCreateDto dto)
    {
        var result = await _productService.CreateAsync(dto);
        if(!result.Success) return BadRequest(result.Message);
        return CreatedAtAction(nameof(GetById), new {id = result.Data.Id}, result.Data);
    }

    //[Authorize]
    [HttpPut("{id}")]
    public async Task<ActionResult<ProductDto>> Update(int id, ProductUpdateDto dto)
    {
        if(id != dto.Id) return BadRequest("Ids do not match");
        var result = await _productService.UpdateAsync(dto);
        if(!result.Success) return BadRequest(result.Message);
        return Ok(result.Data);
    }

    //[Authorize]
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
        var result = await _productService.DeleteAsync(id);
        if(!result.Success) return NotFound(result.Message);
        return NoContent();
    }
}