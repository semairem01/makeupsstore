using makeup.Models.Repositories;
using makeup.Models.Services;
using makeup.Models.Services.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace makeup.Controllers;

[Route("api/[controller]")]
[ApiController]
public class CategoryController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoryController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> GetAll()
    {
        var categories = await _categoryService.GetAllAsync();
        return Ok(categories);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CategoryDto>> GetById(int id)
    {
        var category = await _categoryService.GetByIdAsync(id);
        if (category == null) return NotFound();
        return Ok(category);
    }

    //[Authorize]
    [HttpPost]
    public async Task<ActionResult<CategoryDto>> Create(CategoryCreateDto dto)
    {
        var result = await _categoryService.CreateAsync(dto);
        if (!result.Success) return BadRequest(result.Message);
        return CreatedAtAction(nameof(GetById), new { id = result.Data.Id }, result.Data);
    }
    
    //[Authorize]
    [HttpPut("{id}")]
    public async Task<ActionResult<CategoryDto>> Update(int id, CategoryUpdateDto dto)
    {
        if (id != dto.Id) return BadRequest("Ids do not match");
        var result = await _categoryService.UpdateAsync(dto);
        if (!result.Success) return BadRequest(result.Message);
        return Ok(result.Data);
    }
    
    //[Authorize]
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
        var result = await _categoryService.DeleteAsync(id);
        if (!result.Success) return NotFound(result.Message);
        return NoContent();
    }
}