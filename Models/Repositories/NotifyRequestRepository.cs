using Microsoft.EntityFrameworkCore;

namespace makeup.Models.Repositories;

public class NotifyRequestRepository : INotifyRequestRepository
{
    private readonly AppDbContext _context;
    
    public NotifyRequestRepository(AppDbContext context)
    {
        _context = context;
    }
    
    public async Task<NotifyRequest?> GetByIdAsync(int id)
        {
            return await _context.Set<NotifyRequest>()
                .Include(r => r.Product)
                .Include(r => r.AppUser)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<IEnumerable<NotifyRequest>> GetByProductIdAsync(int productId)
        {
            return await _context.Set<NotifyRequest>()
                .Where(r => r.ProductId == productId)
                .Include(r => r.AppUser)
                .ToListAsync();
        }

        public async Task<IEnumerable<NotifyRequest>> GetByUserIdAsync(Guid userId)
        {
            return await _context.Set<NotifyRequest>()
                .Where(r => r.UserId == userId)
                .Include(r => r.Product)
                .ToListAsync();
        }

        public async Task AddAsync(NotifyRequest request)
        {
            // Aynı kullanıcı aynı ürüne birden fazla request bırakmasın diye kontrol
            var existing = await _context.Set<NotifyRequest>()
                .FirstOrDefaultAsync(r => r.UserId == request.UserId && r.ProductId == request.ProductId);

            if (existing == null)
            {
                await _context.Set<NotifyRequest>().AddAsync(request);
                await _context.SaveChangesAsync();
            }
        }

        public async Task RemoveAsync(int id)
        {
            var req = await _context.Set<NotifyRequest>().FindAsync(id);
            if (req != null)
            {
                _context.Set<NotifyRequest>().Remove(req);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<NotifyRequest>> GetPendingRequestsAsync(int productId)
        {
            // Bu ürün stoklandığında bildirim gönderilecek kullanıcılar
            return await _context.Set<NotifyRequest>()
                .Where(r => r.ProductId == productId)
                .Include(r => r.AppUser)
                .ToListAsync();
        }
    }
