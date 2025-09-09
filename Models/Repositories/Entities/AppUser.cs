using Microsoft.AspNetCore.Identity;

namespace makeup.Models.Repositories.Entities;

public class AppUser : IdentityUser<Guid>
{
    public bool IsAdmin { get; set; }
}