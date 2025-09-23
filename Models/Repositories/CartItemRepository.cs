using Microsoft.EntityFrameworkCore;

namespace makeup.Models.Repositories;

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
            .FirstOrDefaultAsync(ci => ci.Id == id);
    }

    public async Task<IEnumerable<CartItem>> GetByUserIdAsync(Guid userId)
    {
        return await _context.CartItems
            .Where(ci => ci.UserId == userId)
            .Include(ci => ci.Product)
            .ToListAsync();
    }

    public async Task<CartItem?> GetByUserAndProductAsync(Guid userId, int productId)
    {
        return await _context.CartItems
            .Include(ci => ci.Product)
            .FirstOrDefaultAsync(ci => ci.UserId == userId && ci.ProductId == productId);
    }
    
    public async Task AddAsync(CartItem cartItem)
    {
        // Sepette aynı ürün zaten varsa, quantity artır
        var existingItem = await _context.CartItems
            .FirstOrDefaultAsync(ci => ci.UserId == cartItem.UserId && ci.ProductId == cartItem.ProductId);

        if (existingItem != null)
        {
            existingItem.Quantity += cartItem.Quantity;
            _context.CartItems.Update(existingItem);
            await _context.SaveChangesAsync();

            // 🔧 EK: Servis tarafında GetByIdAsync(cartItem.Id) çalışsın diye id’yi geçir
            cartItem.Id = existingItem.Id;   // *** kritik satır ***
        }
        else
        {
            await _context.CartItems.AddAsync(cartItem);
            await _context.SaveChangesAsync();
            // not: burada EF zaten cartItem.Id’yi doldurur
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
        var items = _context.CartItems
            .Where(ci => ci.UserId == userId);
        _context.CartItems.RemoveRange(items);
        await _context.SaveChangesAsync();
    }
    
}