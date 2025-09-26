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
    
};

// App configuration
export const APP_CONFIG = {
    NAME: 'MakeUp Store',
    VERSION: '1.0.0'
};