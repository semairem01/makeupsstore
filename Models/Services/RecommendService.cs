using makeup.Models.Repositories;
using makeup.Models.Repositories.Entities;
using makeup.Models.Services.Dtos;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace makeup.Models.Services
{
    public interface IRecommendService
    {
        Task<RoutineResponseDto> RecommendAsync(Guid? userId, RoutineRequestDto request);
    }

    public class RecommendService : IRecommendService
    {
        private readonly AppDbContext _db;
        private readonly ILogger<RecommendService> _logger;

        public RecommendService(AppDbContext db, ILogger<RecommendService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<RoutineResponseDto> RecommendAsync(Guid? userId, RoutineRequestDto req)
        {
            // 1️⃣ Kişilik profili belirleme
            var persona = DeterminePersona(req);
            
            // 2️⃣ Scoring kurallarını oluştur
            var rules = BuildScoringRules(req);
            
            _logger.LogInformation("User Persona: {Persona}, Rules: {Rules}", 
                persona.Name,
                string.Join(", ", rules.Select(r => $"{r.Key}={r.Value}")));

            // 3️⃣ Tüm aktif ürünleri getir
            var allProducts = await _db.Products
                .Include(p => p.Category)
                .Include(p => p.Variants)
                .Where(p => p.IsActive && p.StockQuantity > 0)
                .ToListAsync();

            // 4️⃣ Ürünleri puanla ve sırala
            var scored = allProducts
                .Select(p => new
                {
                    Product = p,
                    Score = CalculateScore(p, rules),
                    Category = GetProductCategory(p),
                    MatchReason = GetMatchReason(p, rules)
                })
                .Where(x => x.Score > 0)
                .OrderByDescending(x => x.Score)
                .ToList();

            _logger.LogInformation("Total scored products: {Count}", scored.Count);

            // 5️⃣ Kategorilere göre grupla (top 6 her kategoriden)
            var lips = scored.Where(x => x.Category == "Lips").Take(6).ToList();
            var eyes = scored.Where(x => x.Category == "Eyes").Take(6).ToList();
            var baseProducts = scored.Where(x => x.Category == "Base").Take(6).ToList();
            var cheeks = scored.Where(x => x.Category == "Cheeks").Take(6).ToList();

            // 6️⃣ Rutin başlığı oluştur
            var title = GenerateTitle(persona, req);

            return new RoutineResponseDto(
                title,
                lips.Select(x => ToDto(x.Product, x.Score, x.MatchReason)),
                eyes.Select(x => ToDto(x.Product, x.Score, x.MatchReason)),
                baseProducts.Select(x => ToDto(x.Product, x.Score, x.MatchReason)),
                cheeks.Select(x => ToDto(x.Product, x.Score, x.MatchReason)),
                persona.Name,
                persona.Description,
                persona.Icon,
                persona.Color
            );
        }

        // ✨ KİŞİLİK PROFİLİ BELİRLEME
        private BeautyPersona DeterminePersona(RoutineRequestDto req)
        {
            var skin = req.Skin.ToLower();
            var vibe = req.Vibe.ToLower();
            var env = req.Env.ToLower();

            // Vibe + Environment kombinasyonu
            if (vibe == "bold" && (env.Contains("party") || env.Contains("evening")))
            {
                return new BeautyPersona(
                    "The Showstopper",
                    "You live for the spotlight! Bold, confident, and always camera-ready. Your makeup is a statement.",
                    "💃",
                    "#FF1744"
                );
            }

            if (vibe == "natural" && env.Contains("office"))
            {
                return new BeautyPersona(
                    "The Minimalist",
                    "Less is more is your mantra. You love effortless, skin-like finishes that enhance your natural beauty.",
                    "🌿",
                    "#81C784"
                );
            }

            if (vibe == "soft glam" && skin == "dry")
            {
                return new BeautyPersona(
                    "The Dewy Dream",
                    "You're all about that healthy glow! Hydration and luminosity are your best friends.",
                    "✨",
                    "#FFD700"
                );
            }

            if (skin == "oily" && vibe == "bold")
            {
                return new BeautyPersona(
                    "The Matte Maven",
                    "You've mastered the art of shine-free perfection. Matte, long-lasting, and flawless all day.",
                    "🎯",
                    "#9C27B0"
                );
            }

            if (env.Contains("outdoor") || env.Contains("sunny"))
            {
                return new BeautyPersona(
                    "The Sun Goddess",
                    "SPF is your BFF! You need makeup that can keep up with your active, outdoor lifestyle.",
                    "☀️",
                    "#FF6F00"
                );
            }

            if (vibe == "soft glam")
            {
                return new BeautyPersona(
                    "The Romantic",
                    "You love soft, elegant looks with a touch of shimmer. Think: date night perfection.",
                    "💕",
                    "#EC407A"
                );
            }

            // Default
            return new BeautyPersona(
                "The Trendsetter",
                "You're always ahead of the curve! Versatile and adaptable, you can pull off any look.",
                "🌟",
                "#3F51B5"
            );
        }

        // ✨ SCORING KURALLARI (Geliştirilmiş)
        private Dictionary<string, int> BuildScoringRules(RoutineRequestDto req)
        {
            var rules = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

            // 🎨 Cilt tipine göre (+20 puan - artırıldı)
            switch (req.Skin.ToLower())
            {
                case "dry":
                    rules["dewy"] = 20;
                    rules["hydrating"] = 20;
                    rules["hyaluronic"] = 15;
                    rules["glow"] = 15;
                    rules["luminous"] = 15;
                    rules["moisture"] = 12;
                    rules["nourishing"] = 12;
                    rules["creamy"] = 10;
                    rules["oil-free"] = -8; // Negatif puan
                    break;
                case "oily":
                    rules["matte"] = 20;
                    rules["mattifying"] = 20;
                    rules["oil-control"] = 15;
                    rules["powder"] = 12;
                    rules["shine-free"] = 12;
                    rules["pore-minimizing"] = 10;
                    rules["dewy"] = -8; // Negatif puan
                    break;
                case "combination":
                    rules["balancing"] = 15;
                    rules["natural"] = 12;
                    rules["satin"] = 12;
                    rules["semi-matte"] = 10;
                    rules["buildable"] = 10;
                    break;
                case "sensitive":
                    rules["fragrance-free"] = 20;
                    rules["hypoallergenic"] = 15;
                    rules["soothing"] = 12;
                    rules["gentle"] = 12;
                    rules["mineral"] = 10;
                    rules["dermatologist-tested"] = 10;
                    break;
                case "normal":
                    rules["natural"] = 12;
                    rules["skin-like"] = 12;
                    rules["radiant"] = 10;
                    rules["lightweight"] = 10;
                    break;
            }

            // 💄 Vibe'a göre (+15 puan)
            switch (req.Vibe.ToLower())
            {
                case "natural":
                    rules["no-makeup"] = 15;
                    rules["sheer"] = 12;
                    rules["tinted"] = 12;
                    rules["nude"] = 10;
                    rules["skin-like"] = 10;
                    rules["glitter"] = -5; // Negatif puan
                    break;
                case "soft glam":
                    rules["soft-focus"] = 15;
                    rules["glow"] = 12;
                    rules["shimmer"] = 12;
                    rules["defined"] = 10;
                    rules["satin"] = 10;
                    rules["pearl"] = 8;
                    break;
                case "bold":
                    rules["bold"] = 15;
                    rules["high pigment"] = 15;
                    rules["vibrant"] = 12;
                    rules["dramatic"] = 12;
                    rules["statement"] = 10;
                    rules["intense"] = 10;
                    break;
            }

            // 🌍 Ortam/Işık (+12 puan)
            switch (req.Env.ToLower())
            {
                case "outdoor/sunny":
                    rules["spf"] = 15;
                    rules["waterproof"] = 12;
                    rules["sweat-resistant"] = 12;
                    rules["long-lasting"] = 10;
                    rules["fade-resistant"] = 8;
                    break;
                case "indoor evening":
                case "party":
                    rules["photo-friendly"] = 15;
                    rules["longwear"] = 12;
                    rules["shimmer"] = 12;
                    rules["glitter"] = 10;
                    rules["metallic"] = 10;
                    break;
                case "office/daylight":
                    rules["lightweight"] = 12;
                    rules["fresh"] = 10;
                    rules["natural"] = 10;
                    rules["breathable"] = 8;
                    break;
            }

            // 🎨 Undertone (+10 puan)
            if (!string.IsNullOrEmpty(req.Undertone))
            {
                switch (req.Undertone.ToLower())
                {
                    case "warm":
                        rules["coral"] = 10;
                        rules["peach"] = 10;
                        rules["gold"] = 8;
                        rules["bronze"] = 8;
                        rules["terracotta"] = 6;
                        break;
                    case "cool":
                        rules["rose"] = 10;
                        rules["mauve"] = 10;
                        rules["berry"] = 8;
                        rules["plum"] = 8;
                        rules["taupe"] = 6;
                        break;
                    case "neutral":
                        rules["nude"] = 10;
                        rules["beige"] = 8;
                        rules["champagne"] = 6;
                        break;
                }
            }

            // 👁️ Göz rengi (+8 puan)
            if (!string.IsNullOrEmpty(req.EyeColor))
            {
                switch (req.EyeColor.ToLower())
                {
                    case "brown/black":
                        rules["emerald"] = 8;
                        rules["navy"] = 8;
                        rules["bronze"] = 6;
                        break;
                    case "hazel/green":
                        rules["plum"] = 8;
                        rules["mauve"] = 8;
                        rules["copper"] = 6;
                        break;
                    case "blue/gray":
                        rules["warm brown"] = 8;
                        rules["peach"] = 8;
                        rules["gold"] = 6;
                        break;
                }
            }

            return rules;
        }

        // ✨ PUANLAMA MOTORU (Geliştirilmiş)
        private static readonly Dictionary<string, string[]> Syn = new(StringComparer.OrdinalIgnoreCase)
        {
            ["matte"] = new[] { "mattifying", "shine-free", "oil-control" },
            ["hydrating"] = new[] { "moisturizing", "moisture", "nourishing", "creamy", "luminous", "glow" },
            ["photo-friendly"] = new[] { "photo friendly", "photo-ready", "camera-ready" },
            ["full-coverage"] = new[] { "full coverage", "high pigment", "high-pigment" },
            ["spf"] = new[] { "sun protection", "uv shield", "uv protection" },
            ["longwear"] = new[] { "long-lasting", "long lasting", "all-day", "fade-resistant" },
        };

        private static HashSet<string> Tokenize(params string?[] fields)
        {
            var text = string.Join(" ", fields.Where(f => !string.IsNullOrWhiteSpace(f))).ToLowerInvariant();
            var raw = Regex.Split(text, @"[^a-z0-9+#]+").Where(s => s.Length > 0);
            var set = new HashSet<string>(raw);
            foreach (var kv in Syn)
                if (set.Contains(kv.Key))
                    foreach (var alt in kv.Value)
                        set.Add(alt.ToLower());
            return set;
        }

        private int CalculateScore(Product product, Dictionary<string, int> rules)
        {
            int score = 0;
            var tokens = Tokenize(product.Name, product.Description, product.Tags, product.ShadeFamily);

            foreach (var (key, weight) in rules)
            {
                if (tokens.Contains(key.ToLower()) ||
                    (Syn.TryGetValue(key, out var alts) && alts.Any(a => tokens.Contains(a.ToLower()))))
                {
                    score += weight;
                }
            }

            // Finish & Coverage
            var finish = product.Finish?.ToString()?.ToLower();
            var coverage = product.Coverage?.ToString()?.ToLower();
            if (finish != null && rules.TryGetValue(finish, out var wf)) score += wf;
            if (coverage != null && rules.TryGetValue(coverage, out var wc)) score += wc;

            // Boolean özellikler
            if (product.HasSpf && rules.ContainsKey("spf")) score += rules["spf"];
            if (product.Longwear && rules.ContainsKey("longwear")) score += rules["longwear"];
            if (product.Waterproof && rules.ContainsKey("waterproof")) score += rules["waterproof"];
            if (product.FragranceFree && rules.ContainsKey("fragrance-free")) score += rules["fragrance-free"];
            if (product.NonComedogenic && rules.ContainsKey("non-comedogenic")) score += 5;

            // İndirim bonusu
            if (product.DiscountPercent is decimal d && d > 0)
                score += (int)Math.Round(Math.Min(d, 50) / 10m);

            // Stok bonusu/cezası
            if (product.StockQuantity > 20) score += 3;
            else if (product.StockQuantity <= 3) score -= 2;

            return Math.Max(0, score);
        }

        // ✨ EŞLEŞME NEDENİ
        private string GetMatchReason(Product product, Dictionary<string, int> rules)
        {
            var reasons = new List<string>();
            var tokens = Tokenize(product.Name, product.Description, product.Tags, product.ShadeFamily);

            // En yüksek puanlı 2-3 eşleşmeyi bul
            var topMatches = rules
                .Where(r => tokens.Contains(r.Key.ToLower()) || 
                           (Syn.TryGetValue(r.Key, out var alts) && alts.Any(a => tokens.Contains(a.ToLower()))))
                .OrderByDescending(r => r.Value)
                .Take(3)
                .Select(r => r.Key)
                .ToList();

            if (topMatches.Any())
                return $"Perfect match for: {string.Join(", ", topMatches)}";

            if (product.HasSpf) return "SPF protection";
            if (product.Longwear) return "Long-lasting formula";
            if (product.DiscountPercent > 0) return $"{product.DiscountPercent}% off!";

            return "Great quality product";
        }

        // ✨ KATEGORİ BELİRLEME
        private string GetProductCategory(Product p)
        {
            var catName = p.Category?.Name?.ToLower() ?? "";
            var pName = p.Name.ToLower();

            if (catName.Contains("lip") || pName.Contains("lipstick") || pName.Contains("gloss"))
                return "Lips";
            if (catName.Contains("eye") || pName.Contains("mascara") || pName.Contains("shadow") || pName.Contains("liner"))
                return "Eyes";
            if (catName.Contains("face") || catName.Contains("foundation") || pName.Contains("primer") || pName.Contains("concealer"))
                return "Base";
            if (catName.Contains("cheek") || pName.Contains("blush") || pName.Contains("bronzer") || pName.Contains("highlighter"))
                return "Cheeks";

            return "Other";
        }

        // ✨ BAŞLIK OLUŞTURMA
        private string GenerateTitle(BeautyPersona persona, RoutineRequestDto req)
        {
            return $"Your {persona.Name} Routine";
        }

        // ✨ DTO DÖNÜŞÜMÜ
        private RecommendItemDto ToDto(Product p, int score, string matchReason)
        {
            var badges = new List<string>();

            if (p.HasSpf) badges.Add("SPF");
            if (p.Longwear) badges.Add("Longwear");
            if (p.Waterproof) badges.Add("Waterproof");
            if (p.FragranceFree) badges.Add("Fragrance Free");
            if (p.NonComedogenic) badges.Add("Non-Comedogenic");
            if (p.DiscountPercent > 0) badges.Add($"{p.DiscountPercent}% OFF");

            return new RecommendItemDto(
                p.Id,
                p.Name,
                p.Brand,
                p.Category?.Name ?? "Uncategorized",
                p.Price,
                p.ImageUrl,
                p.ShadeFamily ?? "",
                badges,
                matchReason
            );
        }
    }

    // ✨ BEAUTY PERSONA MODEL
    public record BeautyPersona(
        string Name,
        string Description,
        string Icon,
        string Color
    );
}

// DTO güncellemesi gerekli (RecommendItemDto'ya matchReason ekle)
public record RecommendItemDto(
    int Id,
    string Name,
    string Brand,
    string Category,
    decimal Price,
    string ImageUrl,
    string ShadeFamily,
    List<string> Badges,
    string MatchReason = ""
);

// RoutineResponseDto güncellemesi
public record RoutineResponseDto(
    string Title,
    IEnumerable<RecommendItemDto> Lips,
    IEnumerable<RecommendItemDto> Eyes,
    IEnumerable<RecommendItemDto> Base,
    IEnumerable<RecommendItemDto> Cheeks,
    string PersonaName = "",
    string PersonaDescription = "",
    string PersonaIcon = "",
    string PersonaColor = ""
);