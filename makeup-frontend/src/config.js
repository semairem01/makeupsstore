// src/config.js

// Netlify / React build-time env
const API_BASE = (process.env.REACT_APP_API_URL || "http://localhost:5011").replace(/\/$/, "");

// ✅ Eski kodların import { API_BASE_URL } kullanıyorsa bozulmasın:
export const API_BASE_URL = API_BASE;

export const IMAGE_BASE_URL = `${API_BASE}/images/products`;

export const API_ENDPOINTS = {
    PRODUCTS: `${API_BASE}/api/product`,
    CATEGORIES: `${API_BASE}/api/category`,
    ADMIN_CATEGORIES: `${API_BASE}/api/admin/categories`,
    ORDERS: `${API_BASE}/api/order`,
    AUTH: `${API_BASE}/api/auth`,
    CART: `${API_BASE}/api/cart`,
    PAYMENTS: `${API_BASE}/api/payment`,
    PAYMENT: `${API_BASE}/api/payment`,
    FAVORITES: `${API_BASE}/api/favorites`,
    PROFILE: `${API_BASE}/api/profile`,
    CHANGE_PASSWORD: `${API_BASE}/api/auth/change-password`,
    REVIEWS: `${API_BASE}/api/reviews`,
    ADMIN_METRICS: `${API_BASE}/api/admin/metrics`,
    ADMIN_TOP_PRODUCTS: `${API_BASE}/api/admin/metrics/top-products`,
    ADMIN_DAILY_ORDERS: `${API_BASE}/api/admin/metrics/daily-orders`,
    ADMIN_REVIEWS: `${API_BASE}/api/admin/review`,
    ADMIN_PRODUCTS: `${API_BASE}/api/admin/products`,
    ADMIN_ORDERS: `${API_BASE}/api/admin/orders`,
    ADMIN_UPLOAD_IMAGE: `${API_BASE}/api/admin/products/upload-image`,
    NOTIFY_PRODUCT: (id) => `${API_BASE}/api/notify/product/${id}`,
    RECOMMEND_ROUTINE: `${API_BASE}/api/recommend/routine`,
    ADMIN_PRODUCT_VARIANTS: (productId) => `${API_BASE}/api/admin/products/${productId}/variants`,
    ADMIN_PRODUCT_VARIANT: (productId, variantId) =>
        `${API_BASE}/api/admin/products/${productId}/variants/${variantId}`,
    PRODUCTS_BROWSE_EXPANDED: `${API_BASE}/api/product/browse-expanded`,
    PRODUCT_SUGGESTIONS_FOR_SHIPPING: `${API_BASE}/api/product/suggestions-for-free-shipping`,
    PRODUCT_BY_ID: (id) => `${API_BASE}/api/product/${id}`,
    PRODUCT_BY_CATEGORY: (categoryId) => `${API_BASE}/api/product/by-category/${categoryId}`,
    PRODUCT_VARIANTS: (productId) => `${API_BASE}/api/product/${productId}/variants`,
    PRODUCT_VARIANT: (productId, variantId) => `${API_BASE}/api/product/${productId}/variant/${variantId}`,
    ADDRESSES: `${API_BASE}/api/address`,
    ADDRESS_BY_ID: (id) => `${API_BASE}/api/address/${id}`,
    ADDRESS_SET_DEFAULT: (id) => `${API_BASE}/api/address/${id}/default`,

    GEO_CITIES: `${API_BASE}/api/geo/cities`,
    GEO_DISTRICTS: (cityId) => `${API_BASE}/api/geo/districts?cityId=${cityId}`,
    GEO_NBHDS: (distId) => `${API_BASE}/api/geo/neighborhoods?districtId=${distId}`,

    PRODUCT_IMAGES: (productId) => `${API_BASE}/api/admin/products/${productId}/images`,
    PRODUCT_IMAGES_REORDER: (productId) => `${API_BASE}/api/admin/products/${productId}/images/reorder`,
    DELETE_PRODUCT_IMAGE: (imageId) => `${API_BASE}/api/admin/products/images/${imageId}`,
    ADMIN_RETURNS: `${API_BASE}/api/admin/orders`,
};

export const APP_CONFIG = {
    NAME: "MakeUp Store",
    VERSION: "1.0.0",
};
