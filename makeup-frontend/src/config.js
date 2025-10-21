// API Base URL configuration
export const API_BASE_URL = "http://localhost:5011";
export const IMAGE_BASE_URL = "http://localhost:5011/images/products";

// Diğer konfigürasyon ayarları
export const API_ENDPOINTS = {
    PRODUCTS: `${API_BASE_URL}/api/product`,
    CATEGORIES: `${API_BASE_URL}/api/category`,
    ADMIN_CATEGORIES: `${API_BASE_URL}/api/admin/categories`,
    ORDERS: `${API_BASE_URL}/api/order`,
    AUTH: `${API_BASE_URL}/api/auth`,
    CART: `${API_BASE_URL}/api/cart`,
    PAYMENTS: `${API_BASE_URL}/api/payment`,
    FAVORITES: `${API_BASE_URL}/api/favorites`,
    PROFILE: `${API_BASE_URL}/api/profile`,
    CHANGE_PASSWORD: `${API_BASE_URL}/api/auth/change-password` ,
    REVIEWS: `${API_BASE_URL}/api/reviews`,
    ADMIN_METRICS: `${API_BASE_URL}/api/admin/metrics`,
    ADMIN_TOP_PRODUCTS: `${API_BASE_URL}/api/admin/metrics/top-products`,
    ADMIN_DAILY_ORDERS: `${API_BASE_URL}/api/admin/metrics/daily-orders`,
    ADMIN_REVIEWS: `${API_BASE_URL}/api/admin/review`,
    ADMIN_PRODUCTS: `${API_BASE_URL}/api/admin/products`,
    ADMIN_ORDERS: `${API_BASE_URL}/api/admin/orders`,
    ADMIN_UPLOAD_IMAGE: `${API_BASE_URL}/api/admin/products/upload-image`,
    NOTIFY_PRODUCT: (id) => `${API_BASE_URL}/api/notify/product/${id}`,
    RECOMMEND_ROUTINE: `${API_BASE_URL}/api/recommend/routine`,
    ADMIN_PRODUCT_VARIANTS: (productId) =>
        `${API_BASE_URL}/api/admin/products/${productId}/variants`,                  
    ADMIN_PRODUCT_VARIANT: (productId, variantId) =>
        `${API_BASE_URL}/api/admin/products/${productId}/variants/${variantId}`,
    PRODUCTS_BROWSE_EXPANDED: `${API_BASE_URL}/api/product/browse-expanded`,
    
    PRODUCT_VARIANTS: (productId) =>
        `${API_BASE_URL}/api/product/${productId}/variants`,                        
    PRODUCT_VARIANT: (productId, variantId) =>
        `${API_BASE_URL}/api/product/${productId}/variant/${variantId}`,
};

// App configuration
export const APP_CONFIG = {
    NAME: 'MakeUp Store',
    VERSION: '1.0.0'
};