namespace makeup.Models.Services.Dtos
{
    public class ProductBrowseQuery
    {
        // Sayfalama
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 12;

        // Kategori
        public int? CategoryId { get; set; }
        public int? CategoryTreeId { get; set; }

        // Arama & Sıralama
        public string? Q { get; set; }
        public string Sort { get; set; } = "best";

        // Fiyat
        public decimal? PriceMin { get; set; }
        public decimal? PriceMax { get; set; }

        // Çeşitli filtreler
        public bool? InStock { get; set; }
        public bool? Discounted { get; set; }
        public string[]? Brands { get; set; }
        public string[]? Colors { get; set; }
        public string[]? Sizes  { get; set; }

        // Cilt tipi (bitmask)
        public int? SuitableForSkin { get; set; }

        // ✅ Rating - Çoklu seçim için (virgülle ayrılmış string: "4,5")
        public string? SelectedRatings { get; set; }

        // ✅ Yeni özellik filtreleri
        public bool? HasSpf { get; set; }
        public bool? FragranceFree { get; set; }
        public bool? NonComedogenic { get; set; }
        public bool? Longwear { get; set; }
        public bool? Waterproof { get; set; }
        public bool? PhotoFriendly { get; set; }
        
        // ✅ Finish & Coverage
        public string? Finish { get; set; }      // "Dewy", "Natural", "Matte", "Shimmer"
        public string? Coverage { get; set; }    // "Sheer", "Medium", "Full"
        
    }
}