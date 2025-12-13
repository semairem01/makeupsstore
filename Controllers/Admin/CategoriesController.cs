using makeup.Models.Services;
using makeup.Models.Services.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace makeup.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Roles = "Admin")]
    public class CategoriesController : ControllerBase
    {
        private readonly ICategoryService _categoryService;

        public CategoriesController(ICategoryService categoryService)
        {
            _categoryService = categoryService;
        }

        /// <summary>
        /// Kategori listesi (admin panelinde de kullanılır)
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CategoryDto>>> GetAll([FromQuery] string? q)
        {
            var list = await _categoryService.GetAllAsync();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var s = q.Trim();
                list = list.Where(c =>
                    c.Name.Contains(s, StringComparison.OrdinalIgnoreCase)
                ).ToList();
            }

            return Ok(list);
        }

        /// <summary>
        /// Tek kategori (detay/düzenleme modalları için)
        /// </summary>
        [HttpGet("{id:int}")]
        public async Task<ActionResult<CategoryDto>> GetById(int id)
        {
            var cat = await _categoryService.GetByIdAsync(id);
            return cat is null ? NotFound() : Ok(cat);
        }

        /// <summary>
        /// Yeni kategori oluştur
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<CategoryDto>> Create([FromBody] CategoryCreateDto dto)
        {
            var result = await _categoryService.CreateAsync(dto);
            if (!result.Success) return BadRequest(result.Message);

            return CreatedAtAction(nameof(GetById), new { id = result.Data.Id }, result.Data);
        }

        /// <summary>
        /// Kategori güncelle
        /// </summary>
        [HttpPut("{id:int}")]
        public async Task<ActionResult<CategoryDto>> Update(int id, [FromBody] CategoryUpdateDto dto)
        {
            if (id != dto.Id) return BadRequest("Ids do not match");

            var result = await _categoryService.UpdateAsync(dto);
            if (!result.Success) return BadRequest(result.Message);

            return Ok(result.Data);
        }

        /// <summary>
        /// Kategori sil
        /// </summary>
        [HttpDelete("{id:int}")]
        public async Task<ActionResult> Delete(int id)
        {
            var result = await _categoryService.DeleteAsync(id);
            if (!result.Success) return NotFound(result.Message);

            return NoContent();
        }
    }
}