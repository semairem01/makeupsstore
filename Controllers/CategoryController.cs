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
    private readonly ICategoryRepository _categoryRepository;
    public CategoryController(ICategoryService categoryService, ICategoryRepository categoryRepository)
    {
        _categoryService = categoryService;
        _categoryRepository = categoryRepository;
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
    
}