﻿using System.ComponentModel.DataAnnotations;

namespace makeup.Models.Repositories;

[Flags]
public enum SkinTypeFlags
{
    None = 0,
    Dry = 1 << 0,
    Oily = 1 << 1,
    Combination = 1 << 2,
    Sensitive = 1 << 3,
    Normal = 1 << 4,
    All = Dry | Oily | Combination | Sensitive | Normal
}

public enum FinishType
{
    Dewy,
    Natural,
    Matte,
    Shimmer 
}

public enum CoverageLevel
{
    Sheer,
    Medium,
    Full
}

public class Product 
{
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = null!;

    [Required]
    public string Brand { get; set; } = null!;

    [Required]
    public string Description { get; set; } = null!;

    public decimal Price { get; set; }

    public int StockQuantity { get; set; } 
    public bool IsActive { get; set; }    
    public string ImageUrl { get; set; } = null!;

    public string? Color { get; set; }
    public string? Size { get; set; }

    public decimal? DiscountPercent { get; set; }

    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    
    // Cilt tipi uyumu (birden fazla olabilir)
    public SkinTypeFlags SuitableForSkin { get; set; } = SkinTypeFlags.All;

    // Ürün bitiş tipi (mat / parlak / doğal / ışıltılı)
    public FinishType? Finish { get; set; }

    // Kapatıcılık seviyesi (baz ürünler için)
    public CoverageLevel? Coverage { get; set; }

    // Fonksiyonel etiketler (dayanıklılık, SPF, vb.)
    public bool Longwear { get; set; } = false;
    public bool Waterproof { get; set; } = false;
    public bool PhotoFriendly { get; set; } = false;
    public bool HasSpf { get; set; } = false;
    public bool FragranceFree { get; set; } = false;
    public bool NonComedogenic { get; set; } = false;

    // Ürün renk ailesi (örn: “coral|peach|mauve|gold”)
    public string? ShadeFamily { get; set; }

    // Anahtar kelime/tags (örn: “glitter,shimmer,matte,longwear”)
    public string? Tags { get; set; }
}
