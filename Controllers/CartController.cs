using makeup.Models.Services;
using makeup.Models.Services.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace makeup.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // sadece login kullanıcılar erişir
public class CartController : ControllerBase
{
    private readonly ICartItemService _cartService;

    public CartController(ICartItemService cartService)
    {
        _cartService = cartService;
    }

    [HttpGet]
    public async Task<IActionResult> GetCart()
    {
        var items = await _cartService.GetAllAsync();
        return Ok(items);
    }

    [HttpPost("add")]
    public async Task<IActionResult> Add([FromBody] CartItemCreateDto dto)
    {
        var result = await _cartService.AddAsync(dto);
        if (!result.Success)
            return BadRequest(result.Message);

        return Ok(result);
    }

    [HttpPut("{id}/quantity/{quantity}")]
    public async Task<IActionResult> UpdateQuantity(int id, int quantity)
    {
        var result = await _cartService.UpdateQuantityAsync(id, quantity);
        if (!result.Success)
            return BadRequest(result.Message);

        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Remove(int id)
    {
        var result = await _cartService.RemoveAsync(id);
        if (!result.Success)
            return BadRequest(result.Message);

        return Ok(result);
    }

    [HttpDelete("clear")]
    public async Task<IActionResult> Clear()
    {
        var result = await _cartService.ClearAsync();
        if (!result.Success)
            return BadRequest(result.Message);

        return Ok(result);
    }
}