using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace makeup.Models.Repositories.Entities
{
    [Index(nameof(ProductId))]
    [Index(nameof(UserId), nameof(ProductId), IsUnique = true)] 
    public class ProductReview
    {
        public enum ReviewStatus { Pending = 0, Approved = 1, Rejected = 2 }
        public int Id { get; set; }

        [Range(1,5)]
        public int Rating { get; set; }            

        [MaxLength(1000)]
        public string? Comment { get; set; }
        
        public bool IsVerifiedPurchase { get; set; } = false; 
        public ReviewStatus Status { get; set; } = ReviewStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // relations
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;

        public Guid UserId { get; set; }
        public AppUser AppUser { get; set; } = null!;
    }
}