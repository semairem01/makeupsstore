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

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetAll()
    {
        var orders = await _orderService.GetAllAsync(CurrentUserId);
        return Ok(orders);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<OrderDto>> GetById(int id)
    {
        var order = await _orderService.GetByIdAsync(id, CurrentUserId);
        if (order == null) return NotFound();
        return Ok(order);
    }

    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create(OrderCreateDto dto)
    {
        var result = await _orderService.CreateAsync(dto, CurrentUserId);
        if (!result.Success) return BadRequest(result.Message);
        return CreatedAtAction(nameof(GetById), new { id = result.Data.Id }, result.Data);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
        var result = await _orderService.DeleteAsync(id, CurrentUserId);
        if (!result.Success) return NotFound(result.Message);
        return NoContent();
    }
    
    [HttpPost("checkout")]
    public async Task<ActionResult<OrderDto>> Checkout()
    {
        var result = await _orderService.CheckoutAsync();
        if (!result.Success) return BadRequest(result.Message);
        return Ok(result);
    }
}