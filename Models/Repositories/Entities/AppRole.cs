using Microsoft.AspNetCore.Identity;
namespace makeup.Models.Repositories.Entities;

public class AppRole : IdentityRole<Guid>
{
    public AppRole() : base()
    {
        Id = Guid.NewGuid();
    }
    
    public AppRole(string roleName) : base(roleName)
    {
        Id = Guid.NewGuid();
    }
    
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
}