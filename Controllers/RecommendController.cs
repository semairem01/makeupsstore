// Controllers/RecommendController.cs
using makeup.Models.Services;
using makeup.Models.Services.Dtos;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace makeup.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RecommendController : ControllerBase
{
    private readonly IRecommendService _recommendService;
    private readonly ILogger<RecommendController> _logger;

    public RecommendController(
        IRecommendService recommendService,
        ILogger<RecommendController> logger)
    {
        _recommendService = recommendService;
        _logger = logger;
    }

    [HttpPost("routine")]
    public async Task<ActionResult<RoutineResponseDto>> GetRoutine([FromBody] RoutineRequestDto request)
    {
        try
        {
            // Kullanıcı giriş yapmışsa ID'sini al (opsiyonel)
            Guid? userId = null;
            if (User.Identity?.IsAuthenticated == true)
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var parsed))
                {
                    userId = parsed;
                }
            }

            _logger.LogInformation(
                "Routine request: Skin={Skin}, Vibe={Vibe}, Env={Env}, Must={Must}, User={UserId}",
                request.Skin, request.Vibe, request.Env, request.Must, userId);

            var result = await _recommendService.RecommendAsync(userId, request);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating routine recommendation");
            return StatusCode(500, new { message = "Öneriler oluşturulurken hata oluştu. Lütfen tekrar deneyin." });
        }
    }
}