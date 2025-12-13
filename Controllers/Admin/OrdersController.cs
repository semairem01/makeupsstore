using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using makeup.Models.Repositories;
using makeup.Models.Repositories.Entities;

namespace makeup.Controllers.Admin;

[ApiController]
[Route("api/admin/[controller]")]
[Authorize(Roles = "Admin")]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _ctx;
    private readonly IOrderRepository _orderRepository;
    
    public OrdersController(AppDbContext ctx, IOrderRepository orderRepository) 
    { 
        _ctx = ctx;
        _orderRepository = orderRepository;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromQuery] string? returnStatus,
        [FromQuery] string? q,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        
        var query = _ctx.Orders
            .AsNoTracking()
            .Include(o => o.AppUser)
            .Include(o => o.OrderItems).ThenInclude(i => i.Product)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<OrderStatus>(status, out var st))
        {
            query = query.Where(o => o.Status == st);
        }

        if (!string.IsNullOrWhiteSpace(returnStatus) &&
            Enum.TryParse<ReturnStatus>(returnStatus, out var rst))
        {
            query = query.Where(o => o.ReturnStatus == rst);
        }

        if (from.HasValue) query = query.Where(o => o.OrderDate >= from.Value);
        if (to.HasValue)   query = query.Where(o => o.OrderDate <  to.Value);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(o =>
                o.Id.ToString().Contains(term) ||
                (o.ReturnCode != null && o.ReturnCode.ToLower().Contains(term)) ||
                (o.AppUser.FirstName + " " + o.AppUser.LastName).ToLower().Contains(term) ||
                o.AppUser.Email!.ToLower().Contains(term));
        }

        var total = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(total / (double)pageSize);
        
        
        var items = await query
            .OrderByDescending(o => o.OrderDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new
            {
                id            = o.Id,
                orderDate     = o.OrderDate,
                customerName  = ((o.AppUser.FirstName ?? "") + " " + (o.AppUser.LastName ?? "")).Trim(),
                customerEmail = o.AppUser.Email,
                productTotal  = o.OrderItems.Sum(i => i.UnitPrice * i.Quantity),
                shipping      = o.ShippingFee,
                grandTotal    = o.OrderItems.Sum(i => i.UnitPrice * i.Quantity) + o.ShippingFee,
                shippingMethod = o.ShippingMethod,
                statusText     = o.Status.ToString(),
                trackingNumber = o.TrackingNumber,
                returnStatus   = o.ReturnStatus.ToString(),
                returnCode     = o.ReturnCode,
                returnReason   = o.ReturnReason,
                returnNotes    = o.ReturnNotes,
                returnRequestDate = o.ReturnRequestDate,
                refundAmount   = o.RefundAmount,
                returnItemsJson = o.ReturnItemsJson
            })
            .ToListAsync();

        return Ok(new
        {
            items,
            total,
            page,
            pageSize,
            totalPages
        });
    }

    public record AdminOrderUpdateDto(string Status, string? TrackingNumber);

    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> SetStatus(int id, [FromBody] AdminOrderUpdateDto dto)
    {
        if (!Enum.TryParse<OrderStatus>(dto.Status, out var newStatus))
            return BadRequest("Invalid order status");

        var order = await _ctx.Orders.FirstOrDefaultAsync(x => x.Id == id);
        if (order == null) return NotFound("Order not found");

        order.Status = newStatus;
        if (!string.IsNullOrWhiteSpace(dto.TrackingNumber))
            order.TrackingNumber = dto.TrackingNumber.Trim();

        await _ctx.SaveChangesAsync();

        return Ok(new
        {
            id = order.Id,
            statusText = order.Status.ToString(),
            trackingNumber = order.TrackingNumber
        });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetDetails(int id)
    {
        var order = await _orderRepository.GetByIdAsync(id);
        if (order == null) return NotFound("Order not found");

        var dto = new
        {
            id = order.Id,
            orderDate = order.OrderDate,
            status = order.Status.ToString(),
            shippingFee = order.ShippingFee,
            shippingMethod = order.ShippingMethod,
            trackingNumber = order.TrackingNumber,
            // iade frontend’inin beklediği item şekli:
            items = order.OrderItems.Select(oi => new
            {
                productId    = oi.ProductId,
                productName  = oi.Product.Name,
                productImage = oi.Product.ImageUrl,
                unitPrice    = oi.UnitPrice,
                quantity     = oi.Quantity,
                totalPrice   = oi.UnitPrice * oi.Quantity,
                variantName  = oi.Variant != null ? oi.Variant.Name     : null,
                variantImage = oi.Variant != null ? oi.Variant.ImageUrl : null,
                orderItemId  = oi.Id
            }).ToList()
        };

        return Ok(dto);
    }

    public record ReturnApprovalDto(bool Approve, string? AdminNotes, string? ReturnAddress, string? ShippingInfo);

    [HttpPost("{id:int}/review-return")]
    public async Task<IActionResult> ReviewReturn(int id, [FromBody] ReturnApprovalDto dto)
    {
        try
        {
            if (dto.Approve)
            {
                if (string.IsNullOrWhiteSpace(dto.ReturnAddress))
                    return BadRequest("Return address is required when approving.");

                var returnCode = await _orderRepository.ApproveReturnAsync(
                    id, 
                    dto.ReturnAddress, 
                    dto.ShippingInfo, 
                    dto.AdminNotes
                );

                return Ok(new 
                { 
                    success = true, 
                    message = "Return approved successfully.",
                    returnCode = returnCode
                });
            }
            else
            {
                await _orderRepository.RejectReturnAsync(id, dto.AdminNotes);
                return Ok(new 
                { 
                    success = true, 
                    message = "Return rejected." 
                });
            }
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{id:int}/return-received")]
    public async Task<IActionResult> MarkReturnReceived(int id)
    {
        try
        {
            await _orderRepository.MarkReturnReceivedAsync(id);
            return Ok(new { success = true, message = "Return marked as received." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    public record RefundDto(decimal RefundAmount, string RefundMethod, string? TransactionId);

    [HttpPost("{id:int}/complete-refund")]
    public async Task<IActionResult> CompleteRefund(int id, [FromBody] RefundDto dto)
    {
        try
        {
            await _orderRepository.CompleteRefundAsync(
                id, 
                dto.RefundAmount, 
                dto.RefundMethod, 
                dto.TransactionId
            );
            
            return Ok(new { 
                success = true, 
                message = $"Refund completed: {dto.RefundAmount:C2}" 
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}