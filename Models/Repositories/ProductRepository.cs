using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace makeup.Models.Repositories
{
    public class ProductRepository : IProductRepository
    {
        private readonly AppDbContext _context;

        public ProductRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Product>> GetAllAsync()
        {
            return await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Variants).ThenInclude(v => v.Images) // ✅
                .Include(p => p.Images)                              // ✅
                .ToListAsync();
        }

        public async Task<Product?> GetByIdAsync(int id)
        {
            return await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Variants)
                .ThenInclude(v => v.Images)  
                .Include(p => p.Images)       
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task AddAsync(Product product)
        {
            await _context.Products.AddAsync(product);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Product product)
        {
            _context.Products.Update(product);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Product product)
        {
            _context.Products.Remove(product);
            await _context.SaveChangesAsync();
        }

        public async Task<List<Product>> SearchAsync(string? query)
        {
            // Boşsa sadece aktif ürünleri dön
            if (string.IsNullOrWhiteSpace(query))
                return await _context.Products
                    .Include(p => p.Category)
                    .Where(p => p.IsActive)
                    .OrderBy(p => p.Brand).ThenBy(p => p.Name)
                    .ToListAsync();

            
            var orGroups = Regex.Split(query, @"\s+\|\s+|(\sOR\s)", RegexOptions.IgnoreCase)
                                .Where(s => !string.IsNullOrWhiteSpace(s) && !Regex.IsMatch(s, @"^\s*OR\s*$", RegexOptions.IgnoreCase))
                                .Select(s => s.Trim())
                                .ToList();

            if (orGroups.Count == 0)
                orGroups.Add(query.Trim());
            
            string coll = "Turkish_CI_AI"; // MSSQL için uygun

           
            IQueryable<Product> baseQuery = _context.Products
                .Include(p => p.Category)
                .Where(p => p.IsActive);

            var finalQuery = baseQuery.Where(p => false); // Başlangıçta boş (OR için)

            foreach (var group in orGroups)
            {
                var terms = group
                    .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(t => t.ToLower())
                    .ToArray();

                IQueryable<Product> subQuery = baseQuery;

                foreach (var term in terms)
                {
                    subQuery = subQuery.Where(p =>
                        EF.Functions.Like(EF.Functions.Collate(p.Name, coll), $"%{term}%") ||
                        EF.Functions.Like(EF.Functions.Collate(p.Brand, coll), $"%{term}%") ||
                        EF.Functions.Like(EF.Functions.Collate(p.Description, coll), $"%{term}%")
                    );
                }

                finalQuery = finalQuery.Union(subQuery); // OR gruplarını birleştir
            }
            
            return await finalQuery
                .OrderBy(p => p.Brand)
                .ThenBy(p => p.Name)
                .ToListAsync();
        }
        
        public IQueryable<Product> Query()
        {
            return _context.Products
                .Include(p => p.Category)
                .AsQueryable();
        }
    }
}
