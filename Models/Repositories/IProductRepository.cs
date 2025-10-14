namespace makeup.Models.Repositories;

public interface IProductRepository
{
    Task<List<Product>> GetAllAsync();
    Task<Product?> GetByIdAsync(int id);
    Task AddAsync(Product product);
    Task UpdateAsync(Product product);
    Task DeleteAsync(Product product);
    Task<List<Product>> SearchAsync(string? query);
    IQueryable<Product> Query();
}