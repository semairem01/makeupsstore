namespace makeup.Models.Repositories;

public class Category 
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    
    //Alt kategori 
    public int? ParentCategoryId { get; set; }
    public Category? ParentCategory { get; set; }
    public ICollection<Category> SubCategories { get; set; } = new List<Category>();
    
    public ICollection<Product> Products { get; set; } = new List<Product>();
}