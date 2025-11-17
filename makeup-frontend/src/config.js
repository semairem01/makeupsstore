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
    PAYMENT: `${API_BASE_URL}/api/payment`,
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
    PRODUCT_SUGGESTIONS_FOR_SHIPPING: `${API_BASE_URL}/api/product/suggestions-for-free-shipping`,
    PRODUCT_BY_ID: (id) => `${API_BASE_URL}/api/product/${id}`,
    PRODUCT_BY_CATEGORY: (categoryId) => `${API_BASE_URL}/api/product/by-category/${categoryId}`,
    PRODUCT_VARIANTS: (productId) =>
        `${API_BASE_URL}/api/product/${productId}/variants`,                        
    PRODUCT_VARIANT: (productId, variantId) =>
        `${API_BASE_URL}/api/product/${productId}/variant/${variantId}`,
    ADDRESSES: `${API_BASE_URL}/api/address`,
    ADDRESS_BY_ID: (id) => `${API_BASE_URL}/api/address/${id}`,
    ADDRESS_SET_DEFAULT: (id) => `${API_BASE_URL}/api/address/${id}/default`,
    
    GEO_CITIES: "http://localhost:5011/api/geo/cities",
    GEO_DISTRICTS: (cityId) => `http://localhost:5011/api/geo/districts?cityId=${cityId}`,
    GEO_NBHDS: (distId) => `http://localhost:5011/api/geo/neighborhoods?districtId=${distId}`,
    PRODUCT_IMAGES: (productId) => `${API_BASE_URL}/api/admin/products/${productId}/images`,
    PRODUCT_IMAGES_REORDER: (productId) => `${API_BASE_URL}/api/admin/products/${productId}/images/reorder`,
    DELETE_PRODUCT_IMAGE: (imageId) => `${API_BASE_URL}/api/admin/products/images/${imageId}`,
    ADMIN_RETURNS: `${API_BASE_URL}/api/admin/orders`,
};

// App configuration
export const APP_CONFIG = {
    NAME: 'MakeUp Store',
    VERSION: '1.0.0'
};