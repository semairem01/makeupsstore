using Microsoft.EntityFrameworkCore;

namespace makeup.Models.Repositories
{
    public class CartItemRepository : ICartItemRepository
    {
        private readonly AppDbContext _context;

        public CartItemRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<CartItem?> GetByIdAsync(int id)
        {
            return await _context.CartItems
                .Include(ci => ci.Product)
                .Include(ci => ci.Variant)
                .FirstOrDefaultAsync(ci => ci.Id == id);
        }

        public async Task<IEnumerable<CartItem>> GetByUserIdAsync(Guid userId)
        {
            return await _context.CartItems
                .Where(ci => ci.UserId == userId)
                .Include(ci => ci.Product)
                .Include(ci => ci.Variant)
                .ToListAsync();
        }

        // Aynı kullanıcı + aynı ürün + aynı varyant (null dahil) satırını getir
        public async Task<CartItem?> GetByUserProductVariantAsync(Guid userId, int productId, int? variantId)
        {
            return await _context.CartItems
                .Include(ci => ci.Product)
                .Include(ci => ci.Variant)
                .FirstOrDefaultAsync(ci =>
                    ci.UserId == userId &&
                    ci.ProductId == productId &&
                    ci.VariantId == variantId);
        }

        public async Task AddAsync(CartItem cartItem)
        {
            // ⭐ Artık birleştirme anahtarı: (UserId, ProductId, VariantId)
            var existingItem = await _context.CartItems.FirstOrDefaultAsync(ci =>
                ci.UserId == cartItem.UserId &&
                ci.ProductId == cartItem.ProductId &&
                ci.VariantId == cartItem.VariantId);

            if (existingItem != null)
            {
                existingItem.Quantity += cartItem.Quantity;
                _context.CartItems.Update(existingItem);
                await _context.SaveChangesAsync();

                // Serviste tekrar okumak gerekirse id aynı kalsın
                cartItem.Id = existingItem.Id;
            }
            else
            {
                await _context.CartItems.AddAsync(cartItem);
                await _context.SaveChangesAsync();
            }
        }

        public async Task UpdateAsync(CartItem cartItem)
        {
            _context.CartItems.Update(cartItem);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveAsync(int id)
        {
            var item = await _context.CartItems.FindAsync(id);
            if (item != null)
            {
                _context.CartItems.Remove(item);
                await _context.SaveChangesAsync();
            }
        }

        public async Task ClearCartAsync(Guid userId)
        {
            var items = _context.CartItems.Where(ci => ci.UserId == userId);
            _context.CartItems.RemoveRange(items);
            await _context.SaveChangesAsync();
        }
    }
}
