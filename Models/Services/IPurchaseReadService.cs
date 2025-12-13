using makeup.Models.Services.Dtos;

namespace makeup.Models.Services;

public interface IPurchaseReadService
{
    Task<bool> HasPurchasedAsync(Guid userId, int productId);
    Task<bool> HasPurchasedVariantAsync(Guid userId, int variantId);
}