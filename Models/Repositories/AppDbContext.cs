using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

using makeup.Models.Repositories.Entities;
using Microsoft.EntityFrameworkCore;
namespace makeup.Models.Repositories;
public class AppDbContext : IdentityDbContext<AppUser, AppRole, Guid>
{

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Product> Products { get; set; } = null!;
    public DbSet<Category> Categories { get; set; } = null!;
    public DbSet<Order> Orders { get; set; } = null!;
    public DbSet<OrderItem> OrderItems { get; set; } = null!;
    public DbSet<CartItem> CartItems { get; set; } = null!;
    public DbSet<FavoriteProduct> FavoriteProducts { get; set; } = null!;
    public DbSet<ProductReview> ProductReviews { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Product>(entity =>
            {
                entity.HasKey(p => p.Id);
                entity.Property(p=>p.Name).HasMaxLength(100).IsRequired();
                entity.Property(p=>p.Brand).HasMaxLength(100).IsRequired();
                entity.Property(p => p.Description).HasColumnType("nvarchar(MAX)").IsRequired();
                entity.Property(p => p.Price).HasColumnType("decimal(18,2)");
                entity.Property(p=>p.StockQuantity).HasDefaultValue(0);
                entity.Property(p=>p.IsActive).HasDefaultValue(false);
                entity.Property(p=>p.ImageUrl).HasMaxLength(200).IsRequired();
                
                entity.HasOne(p => p.Category)
                    .WithMany(c => c.Products)
                    .HasForeignKey(p => p.CategoryId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

        modelBuilder.Entity<Category>(entity =>
            {
                entity.HasKey(c => c.Id);
                entity.Property(c => c.Name).HasMaxLength(100).IsRequired();
                
                entity.HasOne(c => c.ParentCategory)
                    .WithMany(p => p.SubCategories)
                    .HasForeignKey(c => c.ParentCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
                
            });

        modelBuilder.Entity<Order>(entity =>
            {
                entity.HasKey(o => o.Id);
                entity.Property(o => o.OrderDate).HasDefaultValueSql("GETDATE()");
                entity.Property(o => o.Status)
                    .HasConversion<string>();
                    
                entity.HasOne(o => o.AppUser)
                    .WithMany()
                    .HasForeignKey(o => o.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
                
                entity.HasMany(o => o.OrderItems)
                    .WithOne(oi => oi.Order)
                    .HasForeignKey(oi => oi.OrderId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
            });
        
        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasKey(oi => oi.Id);
            entity.Property(oi => oi.UnitPrice).HasColumnType("decimal(18,2)");

            entity.HasOne(oi => oi.Product)
                .WithMany()
                .HasForeignKey(oi => oi.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
        });
        
        modelBuilder.Entity<FavoriteProduct>(e =>
        {
            e.HasIndex(f => new { f.UserId, f.ProductId }).IsUnique();
            e.HasOne(f => f.AppUser).WithMany().HasForeignKey(f => f.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(f => f.Product).WithMany().HasForeignKey(f => f.ProductId).OnDelete(DeleteBehavior.Cascade);
        });
        
        modelBuilder.Entity<CartItem>(entity =>
        {
            entity.HasKey(ci => ci.Id);

            entity.HasOne(ci => ci.Product)
                .WithMany()
                .HasForeignKey(ci => ci.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ci => ci.AppUser)
                .WithMany()
                .HasForeignKey(ci => ci.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.Property(u => u.IsAdmin).HasDefaultValue(false);
        });

        modelBuilder.Entity<AppRole>(entity =>
        {
            entity.Property(r => r.Description).HasMaxLength(200);
            entity.Property(r => r.IsActive).HasDefaultValue(true);
        });
        
        modelBuilder.Entity<ProductReview>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.Rating).IsRequired();
            e.HasOne(r => r.Product).WithMany().HasForeignKey(r => r.ProductId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.AppUser).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}