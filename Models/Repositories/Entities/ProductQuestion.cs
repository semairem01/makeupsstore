using System.ComponentModel.DataAnnotations;

namespace makeup.Models.Repositories.Entities;

public class ProductQuestion
{
    public int Id { get; set; }
    
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    
    public Guid UserId { get; set; }
    public AppUser AppUser { get; set; } = null!;
    
    [Required]
    [MaxLength(500)]
    public string Question { get; set; } = null!;
    
    [MaxLength(1000)]
    public string? Answer { get; set; }
    
    public Guid? AnsweredByUserId { get; set; }
    public AppUser? AnsweredByUser { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AnsweredAt { get; set; }
    
    public bool IsPublished { get; set; } = false;
    public bool IsDeleted { get; set; } = false;
}