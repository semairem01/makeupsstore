using Microsoft.AspNetCore.Identity;

namespace makeup.Models.Repositories.Entities;

public class AppUser : IdentityUser<Guid>
{
    public bool IsAdmin { get; set; }
    public string? FirstName { get; set; }
    public string? LastName  { get; set; }
    public string? Phone     { get; set; }
    public string? AvatarUrl { get; set; }
}