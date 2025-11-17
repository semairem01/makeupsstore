namespace makeup.Models.Repositories.Entities;

public class DiscountCode
{
    public int Id { get; set; }
    public string Code { get; set; } = "";
    public int DiscountPercentage { get; set; }
    public decimal MinimumOrderAmount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public Guid? UserId { get; set; }
    public bool IsUsed { get; set; }
    public string MoonType { get; set; } = "";
    
    // Navigation
    public AppUser? AppUser { get; set; }
}