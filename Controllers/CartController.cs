using System.Security.Claims;
using makeup.Models.Services;
using makeup.Models.Services.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace makeup.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CartController : ControllerBase
{
    private readonly ICartItemService _cartService;

    public CartController(ICartItemService cartService)
    {
        _cartService = cartService;
    }

    private Guid CurrentUserId
    {
        get
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(claim))
                throw new UnauthorizedAccessException("User id claim missing.");

            return Guid.Parse(claim);
        }
    }

    [Authorize]
    [HttpGet]
    public async Task<IActionResult> GetCart()
    {
        var items = await _cartService.GetAllAsync(CurrentUserId);
        return Ok(items);
    }

    [Authorize]
    [HttpPost("sync")]
    public async Task<IActionResult> SyncCart([FromBody] List<CartItemCreateDto> guestItems)
    {
        // istersen burada aynı ürün+varyant birleştirme yapma (sen istemiyorsun)
        foreach (var item in guestItems)
            await _cartService.AddAsync(CurrentUserId, item);

        return Ok(new { success = true, message = "Cart synced successfully" });
    }

    [Authorize]
    [HttpPost("add")]
    public async Task<IActionResult> Add([FromBody] CartItemCreateDto dto)
    {
        var result = await _cartService.AddAsync(CurrentUserId, dto);
        if (!result.Success) return BadRequest(result.Message);
        return Ok(result);
    }

    [Authorize]
    [HttpPut("{id}/quantity/{quantity}")]
    public async Task<IActionResult> UpdateQuantity(int id, int quantity)
    {
        var result = await _cartService.UpdateQuantityAsync(CurrentUserId, id, quantity);
        if (!result.Success) return BadRequest(result.Message);
        return Ok(result);
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Remove(int id)
    {
        var result = await _cartService.RemoveAsync(CurrentUserId, id);
        if (!result.Success) return BadRequest(result.Message);
        return Ok(result);
    }

    [Authorize]
    [HttpDelete("clear")]
    public async Task<IActionResult> Clear()
    {
        var result = await _cartService.ClearAsync(CurrentUserId);
        if (!result.Success) return BadRequest(result.Message);
        return Ok(result);
    }
}
