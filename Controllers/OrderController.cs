using System.Security.Claims;
using makeup.Models.Services;
using makeup.Models.Services.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace makeup.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class OrderController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrderController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    // Current authenticated user id
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

    /// <summary>
    /// Returns all orders of the current user.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetAll()
    {
        var orders = await _orderService.GetAllAsync(CurrentUserId);
        return Ok(orders);
    }

    /// <summary>
    /// Returns a single order if it belongs to the current user.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<OrderDto>> GetById(int id)
    {
        var order = await _orderService.GetByIdAsync(id, CurrentUserId);
        if (order == null) return NotFound();
        return Ok(order);
    }

    /// <summary>
    /// Creates an order from the user's cart.
    /// Accepts shipping information to be persisted with the order.
    /// </summary>
    [HttpPost("checkout")]
    public async Task<ActionResult<OrderDto>> Checkout([FromBody] CheckoutRequestDto? dto)
    {
        // Defensive defaults if body is null or fields are missing
        var shippingFee = dto?.ShippingFee ?? 0m;
        var shippingMethod = string.IsNullOrWhiteSpace(dto?.ShippingMethod) ? "standard" : dto!.ShippingMethod;

        var result = await _orderService.CheckoutAsync(CurrentUserId, shippingFee, shippingMethod);

        if (!result.Success)
            return BadRequest(result.Message);

        return Ok(result);
    }

    /// <summary>
    /// Creates an order directly from a provided item list (bypasses cart).
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create([FromBody] OrderCreateDto dto)
    {
        var result = await _orderService.CreateAsync(dto, CurrentUserId);
        if (!result.Success) return BadRequest(result.Message);

        return CreatedAtAction(nameof(GetById), new { id = result.Data.Id }, result.Data);
    }

    /// <summary>
    /// Deletes an order if it belongs to the current user.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
        var result = await _orderService.DeleteAsync(id, CurrentUserId);
        if (!result.Success) return NotFound(result.Message);

        return NoContent();
    }

    /// <summary>
    /// Cancels an order if status allows (e.g., Received/Preparing).
    /// </summary>
    [HttpPost("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var result = await _orderService.CancelOrderAsync(id, CurrentUserId);
        if (!result.Success)
            return BadRequest(result.Message);

        return Ok(new { success = true, message = result.Message });
    }
}
