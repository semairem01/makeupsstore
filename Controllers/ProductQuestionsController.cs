using makeup.Models.Repositories;
using makeup.Models.Repositories.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace makeup.Controllers;

[ApiController]
[Route("api/products/{productId:int}/questions")]
public class ProductQuestionsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProductQuestionsController(AppDbContext db)
    {
        _db = db;
    }

    // DTO'lar
    public record QuestionDto(
        int Id,
        int ProductId,
        string Question,
        string? Answer,
        string UserName,
        DateTime CreatedAt,
        DateTime? AnsweredAt,
        bool IsPublished
    );

    public record AskQuestionDto(string Question);
    public record AnswerQuestionDto(int QuestionId, string Answer);

    // ========== PUBLIC ENDPOINTS ==========

    /// <summary>
    /// Ürüne ait yayınlanmış (cevaplanmış) soruları getir
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<QuestionDto>>> GetPublishedQuestions(int productId)
    {
        var exists = await _db.Products.AnyAsync(p => p.Id == productId);
        if (!exists) return NotFound("Ürün bulunamadı.");

        var questions = await _db.ProductQuestions
            .Where(q => q.ProductId == productId && q.IsPublished && q.Answer != null)
            .OrderByDescending(q => q.AnsweredAt)
            .Select(q => new QuestionDto(
                q.Id,
                q.ProductId,
                q.Question,
                q.Answer,
                q.AppUser != null ? q.AppUser.UserName ?? "Anonim" : "Anonim",
                q.CreatedAt,
                q.AnsweredAt,
                q.IsPublished
            ))
            .ToListAsync();

        return Ok(questions);
    }

    /// <summary>
    /// Kullanıcı soru sorar
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<QuestionDto>> AskQuestion(int productId, [FromBody] AskQuestionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Question))
            return BadRequest("Soru boş olamaz.");

        if (dto.Question.Length > 500)
            return BadRequest("Soru en fazla 500 karakter olabilir.");

        var exists = await _db.Products.AnyAsync(p => p.Id == productId);
        if (!exists) return NotFound("Ürün bulunamadı.");

        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var user = await _db.Users.FindAsync(userId);
        if (user == null) return Unauthorized();

        var question = new ProductQuestion
        {
            ProductId = productId,
            UserId = userId,
            Question = dto.Question.Trim(),
            CreatedAt = DateTime.UtcNow,
            IsPublished = false
        };

        _db.ProductQuestions.Add(question);
        await _db.SaveChangesAsync();

        return Ok(new QuestionDto(
            question.Id,
            question.ProductId,
            question.Question,
            question.Answer,
            user.UserName ?? "Anonim",
            question.CreatedAt,
            question.AnsweredAt,
            question.IsPublished
        ));
    }

    // ========== ADMIN ENDPOINTS ==========

    /// <summary>
    /// Admin: Ürüne ait tüm soruları getir (cevaplanmış + cevaplanmamış)
    /// </summary>
    [HttpGet("admin/all")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IEnumerable<QuestionDto>>> GetAllQuestionsAdmin(int productId)
    {
        var exists = await _db.Products.AnyAsync(p => p.Id == productId);
        if (!exists) return NotFound("Ürün bulunamadı.");

        var questions = await _db.ProductQuestions
            .Include(q => q.AppUser)
            .Where(q => q.ProductId == productId)
            .OrderByDescending(q => q.CreatedAt)
            .Select(q => new QuestionDto(
                q.Id,
                q.ProductId,
                q.Question,
                q.Answer,
                q.AppUser != null ? q.AppUser.UserName ?? "Anonim" : "Anonim",
                q.CreatedAt,
                q.AnsweredAt,
                q.IsPublished
            ))
            .ToListAsync();

        return Ok(questions);
    }

    /// <summary>
    /// Admin: Soruyu cevapla ve yayınla
    /// </summary>
    [HttpPost("{questionId:int}/answer")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<QuestionDto>> AnswerQuestion(
        int productId,
        int questionId,
        [FromBody] AnswerQuestionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Answer))
            return BadRequest("Cevap boş olamaz.");

        if (dto.Answer.Length > 1000)
            return BadRequest("Cevap en fazla 1000 karakter olabilir.");

        var question = await _db.ProductQuestions
            .Include(q => q.AppUser)
            .FirstOrDefaultAsync(q => q.Id == questionId && q.ProductId == productId);

        if (question == null)
            return NotFound("Soru bulunamadı.");

        var adminIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? adminId = null;
        if (!string.IsNullOrEmpty(adminIdStr) && Guid.TryParse(adminIdStr, out var parsedId))
            adminId = parsedId;

        question.Answer = dto.Answer.Trim();
        question.AnsweredAt = DateTime.UtcNow;
        question.AnsweredByUserId = adminId;
        question.IsPublished = true;

        await _db.SaveChangesAsync();

        return Ok(new QuestionDto(
            question.Id,
            question.ProductId,
            question.Question,
            question.Answer,
            question.AppUser?.UserName ?? "Anonim",
            question.CreatedAt,
            question.AnsweredAt,
            question.IsPublished
        ));
    }

    /// <summary>
    /// Admin: Soruyu sil
    /// </summary>
    [HttpDelete("{questionId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeleteQuestion(int productId, int questionId)
    {
        var question = await _db.ProductQuestions
            .FirstOrDefaultAsync(q => q.Id == questionId && q.ProductId == productId);

        if (question == null)
            return NotFound("Soru bulunamadı.");

        _db.ProductQuestions.Remove(question);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Admin: Soruyu yayından kaldır/yayınla
    /// </summary>
    [HttpPatch("{questionId:int}/toggle-publish")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<QuestionDto>> TogglePublish(int productId, int questionId)
    {
        var question = await _db.ProductQuestions
            .Include(q => q.AppUser)
            .FirstOrDefaultAsync(q => q.Id == questionId && q.ProductId == productId);

        if (question == null)
            return NotFound("Soru bulunamadı.");

        question.IsPublished = !question.IsPublished;
        await _db.SaveChangesAsync();

        return Ok(new QuestionDto(
            question.Id,
            question.ProductId,
            question.Question,
            question.Answer,
            question.AppUser?.UserName ?? "Anonim",
            question.CreatedAt,
            question.AnsweredAt,
            question.IsPublished
        ));
    }
}