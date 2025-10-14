// Services/RecommendService.cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using makeup.Models.Repositories;
using makeup.Models.Services.Dtos;
using Microsoft.EntityFrameworkCore;

namespace makeup.Models.Services
{
    public interface IRecommendService
    {
        Task<RoutineResponseDto> RecommendAsync(Guid? userId, RoutineRequestDto req);
    }

    public class RecommendService : IRecommendService
    {
        private readonly AppDbContext _ctx;
        public RecommendService(AppDbContext ctx) { _ctx = ctx; }

        private static SkinTypeFlags ParseSkin(string s) => s switch
        {
            "Dry" => SkinTypeFlags.Dry,
            "Oily" => SkinTypeFlags.Oily,
            "Combination" => SkinTypeFlags.Combination,
            "Sensitive" => SkinTypeFlags.Sensitive,
            _ => SkinTypeFlags.Normal
        };

        private static string[] ShadeFromTone(string? t) => t switch
        {
            "Warm" => new[] { "coral", "peach", "terracotta", "gold", "bronze", "warm pink" },
            "Cool" => new[] { "rose", "mauve", "berry", "plum", "taupe", "silver" },
            _ => new[] { "nude", "soft pink", "brown", "champagne" }
        };

        private static string[] EyeBoost(string? e) => e switch
        {
            "Brown/Black" => new[] { "emerald", "navy", "bronze" },
            "Hazel/Green" => new[] { "plum", "mauve", "copper" },
            "Blue/Gray"   => new[] { "warm brown", "peach", "gold" },
            _ => Array.Empty<string>()
        };

        // --- BUCKET TANIMLARI (kaş dâhil) ---
        private static readonly Dictionary<string, string[]> BucketNames = new()
        {
            ["Lips"] = new[] { "Lips", "Lipstick", "Lip Gloss", "Lip Balm", "Lip Pencil" },
            ["Eyes"] = new[]
            {
                // GÖZ + KAŞ
                "Eyes", "Eyeshadow", "Mascara", "Eyeliner", "Eye Pencil",
                "Eyebrow", "Eyebrow Pencil", "Eyebrow Gel"
            },
            ["Base"] = new[] { "Face", "Primer", "Foundation", "Concealer", "Powder", "Setting Spray", "BB & CC Cream" },
            ["Cheeks"] = new[] { "Blush", "Highlighter", "Bronzer", "Contour" }
        };
        // -------------------------------------

        private async Task<HashSet<int>> ResolveCategoryIdsAsync(string[] names)
        {
            var cats = await _ctx.Categories
                .Select(c => new { c.Id, c.Name, c.ParentCategoryId })
                .ToListAsync();

            var nameSet = new HashSet<string>(names, StringComparer.OrdinalIgnoreCase);
            var wanted  = new HashSet<int>();

            // İsmi geçenleri ekle
            foreach (var c in cats)
                if (nameSet.Contains(c.Name))
                    wanted.Add(c.Id);

            // Eşleşen parentların çocuklarını da ekle
            var parentIds = cats.Where(c => nameSet.Contains(c.Name))
                                .Select(c => c.Id)
                                .ToHashSet();

            foreach (var c in cats)
                if (c.ParentCategoryId.HasValue && parentIds.Contains(c.ParentCategoryId.Value))
                    wanted.Add(c.Id);

            return wanted;
        }

        public async Task<RoutineResponseDto> RecommendAsync(Guid? userId, RoutineRequestDto r)
        {
            var skin      = ParseSkin(r.Skin);
            var skinMask  = (int)skin; // ✅ EF uyumlu bit-mask
            var shades    = ShadeFromTone(r.Undertone);
            var eyePlus   = EyeBoost(r.EyeColor);

            var lipsIds   = await ResolveCategoryIdsAsync(BucketNames["Lips"]);
            var eyesIds   = await ResolveCategoryIdsAsync(BucketNames["Eyes"]);
            var baseIds   = await ResolveCategoryIdsAsync(BucketNames["Base"]);
            var cheeksIds = await ResolveCategoryIdsAsync(BucketNames["Cheeks"]);

            IQueryable<Product> BaseQuery() => _ctx.Products
                .AsNoTracking()
                .Include(p => p.Category)
                .Where(p => p.IsActive);

            IQueryable<Product> ApplyFilters(IQueryable<Product> q, HashSet<int> catIds, string bucket)
            {
                // kategori
                q = q.Where(p => catIds.Contains(p.CategoryId));

                // cilt uyumu
                q = q.Where(p => (((int)p.SuitableForSkin & skinMask) != 0));

                // vibe
                if (r.Vibe == "Natural")
                    q = q.Where(p => p.Finish == FinishType.Natural || p.Finish == FinishType.Dewy);
                else if (r.Vibe == "Soft Glam")
                    q = q.Where(p => p.Finish != null);
                else if (r.Vibe == "Bold")
                    q = q.Where(p => p.Longwear || p.Coverage == CoverageLevel.Full);

                // ortam
                if (r.Env == "Outdoor/Sunny")
                    q = q.Where(p => p.HasSpf || p.Waterproof);
                else if (r.Env == "Indoor Evening")
                    q = q.Where(p => p.PhotoFriendly || p.Longwear);
                else if (r.Env == "Office/Daylight")
                    q = q.Where(p => !p.Longwear || p.Finish == FinishType.Natural);
                else if (r.Env == "Party")
                    q = q.Where(p =>
                        p.Finish == FinishType.Shimmer
                        || EF.Functions.Like(p.Tags ?? "", "%glitter%")
                        || EF.Functions.Like(p.Tags ?? "", "%metallic%")
                        || EF.Functions.Like(p.Tags ?? "", "%shimmer%")
                        || EF.Functions.Like(p.Tags ?? "", "%neon%")
                        || EF.Functions.Like(p.Tags ?? "", "%vivid%")
                        || p.Longwear
                    );

                // undertone / göz rengi -> shade eşleşmesi (OR'lu)
                var needles = (bucket == "Eyes" ? shades.Concat(eyePlus) : shades)
                              .Where(s => !string.IsNullOrWhiteSpace(s))
                              .Take(4)
                              .Select(s => s.Trim())
                              .ToArray();

                if (needles.Length > 0)
                {
                    var t1 = needles.ElementAtOrDefault(0);
                    var t2 = needles.ElementAtOrDefault(1);
                    var t3 = needles.ElementAtOrDefault(2);
                    var t4 = needles.ElementAtOrDefault(3);

                    q = q.Where(p => p.ShadeFamily != null && (
                        (t1 != null && EF.Functions.Like(p.ShadeFamily!, "%" + t1 + "%")) ||
                        (t2 != null && EF.Functions.Like(p.ShadeFamily!, "%" + t2 + "%")) ||
                        (t3 != null && EF.Functions.Like(p.ShadeFamily!, "%" + t3 + "%")) ||
                        (t4 != null && EF.Functions.Like(p.ShadeFamily!, "%" + t4 + "%"))
                    ));
                }

                return q;
            }

            // ✅ SQL'de karmaşık dizi/VALUES üretme yok; badge'leri bellekte kuruyoruz
            async Task<List<RecommendItemDto>> ProjectScoreAsync(IQueryable<Product> q)
            {
                var rows = await q
                    .Select(p => new
                    {
                        P = p,
                        CategoryName = p.Category.Name,
                        Score =
                            ((((int)p.SuitableForSkin & skinMask) != 0 ? 4 : 0)) +
                            (r.Vibe == "Bold" && (p.Longwear || p.Coverage == CoverageLevel.Full) ? 3 : 0) +
                            (r.Env == "Outdoor/Sunny" && (p.Waterproof || p.HasSpf) ? 2 : 0) +
                            (r.Env == "Indoor Evening" && p.PhotoFriendly ? 1 : 0) +
                            (r.Env == "Party" && (
                                p.Finish == FinishType.Shimmer
                                || EF.Functions.Like(p.Tags ?? "", "%glitter%")
                                || EF.Functions.Like(p.Tags ?? "", "%metallic%")
                                || EF.Functions.Like(p.Tags ?? "", "%shimmer%")
                                || EF.Functions.Like(p.Tags ?? "", "%neon%")
                                || EF.Functions.Like(p.Tags ?? "", "%vivid%")
                            ) ? 3 : 0) +
                            (r.Env == "Party" && p.Longwear ? 2 : 0),
                        Discount = p.DiscountPercent
                    })
                    .OrderByDescending(x => x.Score)
                    .ThenByDescending(x => x.Discount)
                    .Take(12)
                    .ToListAsync();

                return rows.Select(x =>
                {
                    var p = x.P;
                    var badges = new List<string>(4);
                    if (p.HasSpf)        badges.Add("SPF");
                    if (p.Longwear)      badges.Add("Longwear");
                    if (p.Waterproof)    badges.Add("Waterproof");
                    if (p.PhotoFriendly) badges.Add("Photo");

                    return new RecommendItemDto(
                        p.Id,
                        p.Name,
                        p.Brand,
                        x.CategoryName,
                        p.Price,
                        p.ImageUrl ?? "",
                        p.ShadeFamily ?? "",
                        badges
                    );
                }).ToList();
            }

            var lips   = await ProjectScoreAsync(ApplyFilters(BaseQuery(), lipsIds,   "Lips"));
            var eyes   = await ProjectScoreAsync(ApplyFilters(BaseQuery(), eyesIds,   "Eyes"));
            var @base  = await ProjectScoreAsync(ApplyFilters(BaseQuery(), baseIds,   "Base"));
            var cheeks = await ProjectScoreAsync(ApplyFilters(BaseQuery(), cheeksIds, "Cheeks"));

            var title = r.Skin switch
            {
                "Dry"         => "Hydration Glow",
                "Oily"        => "Matte Control",
                "Combination" => "Soft Balance",
                "Sensitive"   => "Calm & Care",
                _             => "Balanced Radiance"
            };

            return new RoutineResponseDto(title, lips, eyes, @base, cheeks);
        }
    }
}
