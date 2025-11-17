using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using makeup.Models.Repositories;
using makeup.Models.Repositories.Entities;
using System.Security.Claims;

namespace makeup.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DiscountController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<DiscountController> _logger;

    public DiscountController(AppDbContext db, ILogger<DiscountController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private Guid? CurrentUserId
    {
        get
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return claim != null ? Guid.Parse(claim) : null;
        }
    }

    // DTO Models
    public class GenerateDiscountRequest
    {
        public int DiscountPercentage { get; set; }
        public decimal MinimumOrderAmount { get; set; }
        public string MoonType { get; set; } = "";
    }

    public class ApplyDiscountRequest
    {
        public string Code { get; set; } = "";
        public decimal OrderTotal { get; set; }
    }

    /// <summary>
    /// Generate a unique discount code (called when user claims discount from popup)
    /// </summary>
    [HttpPost("generate")]
    public async Task<IActionResult> GenerateDiscount([FromBody] GenerateDiscountRequest request)
    {
        try
        {
            // Generate unique code (e.g., LUNARA-BLUEMOON-ABC123)
            string code = $"LUNARA-{request.MoonType.Replace(" ", "").ToUpper()}-{Guid.NewGuid().ToString()[..6].ToUpper()}";

            var discount = new DiscountCode
            {
                Code = code,
                DiscountPercentage = request.DiscountPercentage,
                MinimumOrderAmount = request.MinimumOrderAmount,
                CreatedAt = DateTime.UtcNow,
                UserId = CurrentUserId,
                IsUsed = false,
                MoonType = request.MoonType
            };

            _db.DiscountCodes.Add(discount);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                code = discount.Code,
                discountPercentage = discount.DiscountPercentage,
                minimumOrderAmount = discount.MinimumOrderAmount,
                moonType = discount.MoonType,
                message = $"Your {request.MoonType} discount has been generated!"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating discount code");
            return StatusCode(500, new { success = false, message = "Error generating discount code" });
        }
    }

    /// <summary>
    /// Validate and apply discount code to order
    /// </summary>
    [HttpPost("apply")]
    public async Task<IActionResult> ApplyDiscount([FromBody] ApplyDiscountRequest request)
    {
        try
        {
            var discount = await _db.DiscountCodes
                .FirstOrDefaultAsync(d => d.Code == request.Code && !d.IsUsed);

            if (discount == null)
            {
                return Ok(new
                {
                    success = false,
                    message = "Invalid or already used discount code"
                });
            }

            // Check if discount belongs to current user (if userId is set)
            if (discount.UserId.HasValue && discount.UserId != CurrentUserId)
            {
                return Ok(new
                {
                    success = false,
                    message = "This discount code doesn't belong to you"
                });
            }

            if (request.OrderTotal < discount.MinimumOrderAmount)
            {
                return Ok(new
                {
                    success = false,
                    message = $"Minimum order amount is ₺{discount.MinimumOrderAmount:N2}"
                });
            }

            decimal discountAmount = (request.OrderTotal * discount.DiscountPercentage) / 100;
            decimal finalTotal = request.OrderTotal - discountAmount;

            return Ok(new
            {
                success = true,
                message = $"{discount.DiscountPercentage}% {discount.MoonType} discount applied!",
                discountAmount = discountAmount,
                finalTotal = finalTotal,
                discountPercentage = discount.DiscountPercentage,
                code = discount.Code
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying discount");
            return StatusCode(500, new { success = false, message = "Error applying discount" });
        }
    }

    /// <summary>
    /// Mark discount as used (call this after successful order)
    /// </summary>
    [HttpPost("mark-used")]
    public async Task<IActionResult> MarkDiscountUsed([FromBody] string code)
    {
        try
        {
            var discount = await _db.DiscountCodes
                .FirstOrDefaultAsync(d => d.Code == code);

            if (discount == null)
            {
                return NotFound(new { success = false, message = "Discount code not found" });
            }

            discount.IsUsed = true;
            discount.UsedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Discount marked as used" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking discount as used");
            return StatusCode(500, new { success = false, message = "Error updating discount" });
        }
    }

    /// <summary>
    /// Get user's available discounts
    /// </summary>
    [HttpGet("my-discounts")]
    public async Task<IActionResult> GetMyDiscounts()
    {
        try
        {
            if (CurrentUserId == null)
            {
                return Unauthorized(new { success = false, message = "User not authenticated" });
            }

            var discounts = await _db.DiscountCodes
                .Where(d => d.UserId == CurrentUserId && !d.IsUsed)
                .OrderByDescending(d => d.CreatedAt)
                .Select(d => new
                {
                    d.Code,
                    d.DiscountPercentage,
                    d.MinimumOrderAmount,
                    d.MoonType,
                    d.CreatedAt
                })
                .ToListAsync();

            return Ok(discounts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user discounts");
            return StatusCode(500, new { success = false, message = "Error retrieving discounts" });
        }
    }

    /// <summary>
    /// Validate discount code without applying
    /// </summary>
    [HttpGet("validate/{code}")]
    public async Task<IActionResult> ValidateDiscount(string code)
    {
        try
        {
            var discount = await _db.DiscountCodes
                .FirstOrDefaultAsync(d => d.Code == code && !d.IsUsed);

            if (discount == null)
            {
                return Ok(new { valid = false, message = "Invalid or expired discount code" });
            }

            // Check if discount belongs to current user (if userId is set)
            if (discount.UserId.HasValue && discount.UserId != CurrentUserId)
            {
                return Ok(new { valid = false, message = "This discount code doesn't belong to you" });
            }

            return Ok(new
            {
                valid = true,
                discountPercentage = discount.DiscountPercentage,
                minimumOrderAmount = discount.MinimumOrderAmount,
                moonType = discount.MoonType
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating discount");
            return StatusCode(500, new { success = false, message = "Error validating discount" });
        }
    }
}