namespace makeup.Models.Services.Dtos
{
    public class PagedResult<T>
    {
        public required IEnumerable<T> Items { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages { get; set; }
        public bool HasPrev => Page > 1;
        public bool HasNext => Page < TotalPages;
    }
}

