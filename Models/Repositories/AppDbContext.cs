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
    public DbSet<ProductVariant> ProductVariants { get; set; } = null!;
    public DbSet<Category> Categories { get; set; } = null!;
    public DbSet<Order> Orders { get; set; } = null!;
    public DbSet<OrderItem> OrderItems { get; set; } = null!;
    public DbSet<CartItem> CartItems { get; set; } = null!;
    public DbSet<FavoriteProduct> FavoriteProducts { get; set; } = null!;
    public DbSet<ProductReview> ProductReviews { get; set; } = null!;
    public DbSet<NotifyRequest> NotifyRequests => Set<NotifyRequest>();
    public DbSet<Address> Addresses { get; set; } = null!;
    public DbSet<DiscountCode> DiscountCodes { get; set; } = null!;
    public DbSet<ProductImage> ProductImages { get; set; } = null!;
    
    public DbSet<ProductQuestion> ProductQuestions { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Product>(entity =>
            {
                entity.HasKey(p => p.Id);
                entity.Property(p=>p.Name).HasMaxLength(100).IsRequired();
                entity.Property(p=>p.Brand).HasMaxLength(100).IsRequired();
                entity.Property(p => p.Description).HasColumnType("text").IsRequired();
                entity.Property(p => p.DiscountPercent)
                    .HasColumnType("decimal(5,2)")  
                    .IsRequired(false);
                entity.Property(p => p.Price).HasColumnType("decimal(18,2)");
                entity.Property(p=>p.StockQuantity).HasDefaultValue(0);
                entity.Property(p=>p.IsActive).HasDefaultValue(false);
                entity.Property(p=>p.ImageUrl).HasMaxLength(200).IsRequired();
                entity.Property(p => p.Ingredients).HasMaxLength(2000);
                
                entity.HasOne(p => p.Category)
                    .WithMany(c => c.Products)
                    .HasForeignKey(p => p.CategoryId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                entity.HasMany(p => p.Variants)
                    .WithOne(v => v.Product)
                    .HasForeignKey(v => v.ProductId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        
        modelBuilder.Entity<ProductVariant>(v =>
        {
            v.HasKey(x => x.Id);

            v.Property(x => x.Sku).HasMaxLength(64).IsRequired();
            v.Property(x => x.Barcode).HasMaxLength(64);
            v.Property(x => x.Name).HasMaxLength(120).IsRequired();
            v.Property(x => x.ShadeCode).HasMaxLength(32);
            v.Property(x => x.ShadeFamily).HasMaxLength(64);
            v.Property(x => x.HexColor).HasMaxLength(7); // "#RRGGBB"
            v.Property(x => x.SwatchImageUrl).HasMaxLength(200);
            v.Property(x => x.ImageUrl).HasMaxLength(200).IsRequired();

            v.Property(x => x.Price).HasColumnType("decimal(18,2)");
            v.Property(x => x.DiscountPercent).HasColumnType("decimal(5,2)").IsRequired(false);

            v.Property(x => x.StockQuantity).HasDefaultValue(0);
            v.Property(x => x.IsActive).HasDefaultValue(false);
            v.Property(x => x.IsDefault).HasDefaultValue(false);

            // Aynı ürün içinde SKU benzersiz
            v.HasIndex(x => new { x.ProductId, x.Sku }).IsUnique();

            // Her üründe en fazla 1 default varyant (SQL Server filtered unique index)
            v.HasIndex(x => new { x.ProductId, x.IsDefault })
                .IsUnique()
                .HasFilter("\"IsDefault\" = true");
        });

        modelBuilder.Entity<ProductQuestion>(e =>
        {
            e.HasKey(q => q.Id);
            e.Property(q => q.Question).HasMaxLength(500).IsRequired();
            e.Property(q => q.Answer).HasMaxLength(1000);
    
            e.HasOne(q => q.Product)
                .WithMany()
                .HasForeignKey(q => q.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
    
            e.HasOne(q => q.AppUser)
                .WithMany()
                .HasForeignKey(q => q.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        
            e.HasOne(q => q.AnsweredByUser)
                .WithMany()
                .HasForeignKey(q => q.AnsweredByUserId)
                .OnDelete(DeleteBehavior.NoAction)
                .IsRequired(false);
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
                entity.Property(o => o.OrderDate);
                entity.Property(o => o.Status)
                    .HasConversion<string>();
                
                entity.Property(o => o.ShippingFee).HasColumnType("decimal(18,2)").HasDefaultValue(0);
                entity.Property(o => o.ShippingMethod).HasMaxLength(20).HasDefaultValue("standard");
                
                entity.Property(o => o.ShipFullName).HasMaxLength(100).HasDefaultValue("");
                entity.Property(o => o.ShipPhone).HasMaxLength(20).HasDefaultValue("");
                entity.Property(o => o.ShipCity).HasMaxLength(64).HasDefaultValue("");
                entity.Property(o => o.ShipDistrict).HasMaxLength(64).HasDefaultValue("");
                entity.Property(o => o.ShipNeighborhood).HasMaxLength(64).HasDefaultValue("");
                entity.Property(o => o.ShipLine).HasMaxLength(240).HasDefaultValue("");
                entity.Property(o => o.ShipPostalCode).HasMaxLength(10).HasDefaultValue("");
                    
                entity.Property(o => o.ReturnStatus).HasConversion<string>().HasDefaultValue(ReturnStatus.None);
                entity.Property(o => o.ReturnCode).HasMaxLength(50);
                entity.Property(o => o.ReturnReason).HasMaxLength(500);
                entity.Property(o => o.ReturnNotes).HasMaxLength(1000);
                entity.Property(o => o.ReturnItemsJson).HasMaxLength(2000);
                entity.Property(o => o.ReturnAdminNotes).HasMaxLength(1000);
                entity.Property(o => o.ReturnAddress).HasMaxLength(500);
                entity.Property(o => o.ReturnShippingInfo).HasMaxLength(1000);
                entity.Property(o => o.ReturnTrackingNumber).HasMaxLength(100);
                entity.Property(o => o.RefundAmount).HasColumnType("decimal(18,2)");
                entity.Property(o => o.RefundMethod).HasMaxLength(50);
                entity.Property(o => o.RefundTransactionId).HasMaxLength(100);
                entity.Property(o => o.DiscountCode).HasMaxLength(100);
                entity.Property(o => o.DiscountAmount).HasColumnType("decimal(18,2)").HasDefaultValue(0);
                entity.Property(o => o.DiscountPercentage).HasDefaultValue(0);

                entity.HasIndex(o => o.ReturnCode).IsUnique().HasFilter("\"ReturnCode\" IS NOT NULL");
                
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
            
            entity.HasOne(oi => oi.Variant)
                .WithMany()
                .HasForeignKey(oi => oi.VariantId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);
            
        });
        
        modelBuilder.Entity<FavoriteProduct>(e =>
        {
            e.HasKey(f => f.Id);
            
            e.HasIndex(f => new { f.UserId, f.ProductId, f.VariantId }).IsUnique();

            e.HasIndex(f => new { f.UserId, f.ProductId })
                .IsUnique()
                .HasFilter("\"VariantId\" IS NULL");
            
            e.HasOne(f => f.AppUser)
                .WithMany()
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(f => f.Product)
                .WithMany()
                .HasForeignKey(f => f.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            // ✅ Variant ilişkisi
            e.HasOne(f => f.Variant)
                .WithMany()
                .HasForeignKey(f => f.VariantId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);
        });
        
        modelBuilder.Entity<ProductImage>(b =>
        {
            b.HasOne(pi => pi.Product)
                .WithMany(p => p.Images)
                .HasForeignKey(pi => pi.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(pi => pi.Variant)
                .WithMany(v => v.Images)
                .HasForeignKey(pi => pi.VariantId)
                .OnDelete(DeleteBehavior.NoAction);

            b.Property(p => p.Url).IsRequired();
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
            
            entity.HasOne(ci => ci.Variant)
                .WithMany()
                .HasForeignKey(ci => ci.VariantId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);
            entity.HasIndex(ci => new { ci.UserId, ci.ProductId, ci.VariantId }).IsUnique();
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
        
        modelBuilder.Entity<NotifyRequest>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserId, x.ProductId }).IsUnique();
            e.HasOne(x => x.Product)
                .WithMany()
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.AppUser)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<ReturnRequest>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Reason).HasMaxLength(500).IsRequired();
            entity.Property(r => r.Description).HasMaxLength(1000);
            entity.Property(r => r.Status).HasConversion<string>().HasDefaultValue(ReturnStatus.Requested);
            entity.Property(r => r.AdminNote).HasMaxLength(1000);
    
            entity.HasOne(r => r.Order)
                .WithMany()
                .HasForeignKey(r => r.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
    
            entity.HasOne(r => r.AppUser)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<Address>(e =>
        {
            e.HasKey(a => a.Id);
    
            e.Property(a => a.Title).HasMaxLength(50).HasDefaultValue("Ev");
            e.Property(a => a.FullName).HasMaxLength(100).IsRequired();
            e.Property(a => a.Phone).HasMaxLength(20).IsRequired();
            e.Property(a => a.Street).HasMaxLength(120).IsRequired();
            e.Property(a => a.BuildingNo).HasMaxLength(20);
            e.Property(a => a.ApartmentNo).HasMaxLength(20);
            e.Property(a => a.PostalCode).HasMaxLength(10).IsRequired();
            e.Property(a => a.Notes).HasMaxLength(200);
    
            e.Property(a => a.CityId).IsRequired();
            e.Property(a => a.DistrictId).IsRequired();
            e.Property(a => a.NeighborhoodId).IsRequired();
            e.Property(a => a.IsDefault).HasDefaultValue(false);
            
            e.HasOne(a => a.AppUser)
                .WithMany()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Her kullanıcıda en fazla 1 default adres
            e.HasIndex(a => new { a.UserId, a.IsDefault })
                .HasFilter("\"IsDefault\" = true")
                .IsUnique();
        });
    }
}