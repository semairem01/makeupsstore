using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace makeup.Models.Repositories.Entities
{
    [Index(nameof(ProductId))]
    [Index(nameof(UserId), nameof(ProductId), IsUnique = true)] // ⬅️ 1 kullanıcı 1 ürüne 1 yorum
    public class ProductReview
    {
        public int Id { get; set; }

        [Range(1,5)]
        public int Rating { get; set; }            // 1..5

        [MaxLength(1000)]
        public string? Comment { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // relations
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;

        public Guid UserId { get; set; }
        public AppUser AppUser { get; set; } = null!;
    }
}