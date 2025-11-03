// RoutineRequestDto.cs
namespace makeup.Models.Services.Dtos
{
    public class RoutineRequestDto
    {
        public string Skin { get; set; } = string.Empty;
        public string Vibe { get; set; } = string.Empty;
        public string Env { get; set; } = string.Empty;
        public string Must { get; set; } = string.Empty;
        public string? Undertone { get; set; }
        public string? EyeColor { get; set; }
    }

    public class RoutineResponseDto
    {
        public string Title { get; set; }
        public IEnumerable<RecommendItemDto> Lips { get; set; }
        public IEnumerable<RecommendItemDto> Eyes { get; set; }
        public IEnumerable<RecommendItemDto> Base { get; set; }
        public IEnumerable<RecommendItemDto> Cheeks { get; set; }
        
        // Yeni persona bilgileri
        public string PersonaName { get; set; }
        public string PersonaDescription { get; set; }
        public string PersonaIcon { get; set; }
        public string PersonaColor { get; set; }

        public RoutineResponseDto(
            string title,
            IEnumerable<RecommendItemDto> lips,
            IEnumerable<RecommendItemDto> eyes,
            IEnumerable<RecommendItemDto> baseProducts,
            IEnumerable<RecommendItemDto> cheeks,
            string personaName = "",
            string personaDescription = "",
            string personaIcon = "",
            string personaColor = "")
        {
            Title = title;
            Lips = lips;
            Eyes = eyes;
            Base = baseProducts;
            Cheeks = cheeks;
            PersonaName = personaName;
            PersonaDescription = personaDescription;
            PersonaIcon = personaIcon;
            PersonaColor = personaColor;
        }
    }

    public class RecommendItemDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Brand { get; set; }
        public string Category { get; set; }
        public decimal Price { get; set; }
        public string ImageUrl { get; set; }
        public string ShadeFamily { get; set; }
        public List<string> Badges { get; set; }
        public string MatchReason { get; set; } // Neden önerildiği

        public RecommendItemDto(
            int id,
            string name,
            string brand,
            string category,
            decimal price,
            string imageUrl,
            string shadeFamily,
            List<string> badges,
            string matchReason = "")
        {
            Id = id;
            Name = name;
            Brand = brand;
            Category = category;
            Price = price;
            ImageUrl = imageUrl;
            ShadeFamily = shadeFamily;
            Badges = badges ?? new List<string>();
            MatchReason = matchReason;
        }
    }
}