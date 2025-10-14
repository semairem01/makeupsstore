namespace makeup.Models.Services.Dtos
{
    public class ProductBrowseQuery
    {
        // Sayfalama
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 12;

        // Kategori
        public int? CategoryId { get; set; }          // yalnız o kategori
        public int? CategoryTreeId { get; set; }      // alt dallarıyla birlikte

        // Arama & Sıralama
        public string? Q { get; set; }                // isim/marka/açıklama
        public string Sort { get; set; } = "best";    // best|price_asc|price_desc|new|discount

        // Fiyat
        public decimal? PriceMin { get; set; }
        public decimal? PriceMax { get; set; }

        // Çeşitli filtreler
        public bool? InStock { get; set; }            // stokta olanlar
        public bool? Discounted { get; set; }         // indirimi olanlar
        public string[]? Brands { get; set; }         // "," ile de gelebilir FE'den
        public string[]? Colors { get; set; }         // opsiyonel
        public string[]? Sizes  { get; set; }         // opsiyonel

        // Güzellik-özelleri (opsiyonel)
        public int? SuitableForSkin { get; set; }     // SkinTypeFlags int (bitmask)
        public string? Finish { get; set; }           // FinishType
        public string? Coverage { get; set; }         // CoverageLevel
        public bool? HasSpf { get; set; }
        public bool? FragranceFree { get; set; }
        public bool? NonComedogenic { get; set; }
        public int? MinRating { get; set; }
    }
}