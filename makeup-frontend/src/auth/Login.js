import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import "./Auth.css";
import { Link } from "react-router-dom";

function Login() {
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 📌 İlk mount + bfcache dönüşünde formu temizle
    useEffect(() => {
        const reset = () => {
            setForm({ email: "", password: "" });
            setError("");
            setIsLoading(false);
            setRememberMe(false);
        };

        // İlk yüklemede
        reset();

        // Geri/ileri (bfcache) dönüşünde
        const onPageShow = (e) => {
            if (e.persisted) reset();
        };
        window.addEventListener("pageshow", onPageShow);
        return () => window.removeEventListener("pageshow", onPageShow);
    }, []);

    const handleChange = (e) =>
        setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

    // ✅ DTO'ya uygun merge: List<CartItemCreateDto> => /cart/sync
    const mergeGuestCartToBackend = async (token) => {
        const raw = localStorage.getItem("guestCart");
        if (!raw) return;

        let items = [];
        try {
            items = JSON.parse(raw) || [];
        } catch {
            return;
        }
        if (!Array.isArray(items) || items.length === 0) return;

        // Aynı productId + variantId olanları birleştir
        const mergedMap = new Map();

        for (const it of items) {
            const productId = Number(it.productId);
            const variantId =
                it.variantId === null || it.variantId === undefined
                    ? null
                    : Number(it.variantId);

            const qty = Math.max(1, Number(it.quantity || 1));

            // productId NaN ise atla
            if (!Number.isFinite(productId)) continue;

            const key = `${productId}|${variantId ?? "base"}`;
            const prevQty = mergedMap.get(key) || 0;
            mergedMap.set(key, prevQty + qty);
        }

        const payload = Array.from(mergedMap.entries()).map(([key, quantity]) => {
            const [p, v] = key.split("|");
            return {
                productId: Number(p),
                variantId: v === "base" ? null : Number(v),
                quantity: Number(quantity),
            };
        });

        if (payload.length === 0) return;

        // ✅ Tek istek: /cart/sync
        await axios.post(`${API_ENDPOINTS.CART}/sync`, payload, {
            headers: { Authorization: `Bearer ${token}` },
        });

        localStorage.removeItem("guestCart");

// ✅ DB’den gerçek sepeti çek -> gerçek count
        const res2 = await axios.get(API_ENDPOINTS.CART, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const items2 = Array.isArray(res2.data) ? res2.data : [];
        const totalQty = items2.reduce(
            (s, x) => s + Number(x.quantity ?? x.Quantity ?? 0),
            0
        );

// ✅ UI'ya gerçek count ile haber ver
        window.dispatchEvent(
            new CustomEvent("cart:updated", { detail: { count: totalQty } })
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const res = await axios.post(`${API_ENDPOINTS.AUTH}/login`, {
                email: form.email,
                password: form.password,
                rememberMe,
            });

            if (res.data?.success) {
                const token = res.data.token;
                const isAdmin = !!res.data.user?.isAdmin;

                // ✅ token / role kaydet
                localStorage.setItem("token", token);
                localStorage.setItem("isAdmin", String(isAdmin));

                // ✅ merge (hata olursa login devam)
                try {
                    await mergeGuestCartToBackend(token);
                } catch (mergeErr) {
                    console.error("guestCart merge failed:", mergeErr);
                    // merge başarısızsa guestCart silinmediği için kullanıcı kaybetmez
                }

                // ✅ yönlendirme
                window.location.href = isAdmin ? "/admin" : "/";
                return;
            }

            setError(res.data?.message || "Giriş başarısız");
            setIsLoading(false);
        } catch (err) {
            setError(err.response?.data?.message || "Email veya şifre hatalı");
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            {/* Sol Panel - Form */}
            <div className="auth-left">
                <div className="auth-content">
                    {/* Title */}
                    <div className="auth-header">
                        <h2 className="auth-title">Welcome Back</h2>
                        <p className="auth-subtitle">
                            Sign in to continue your beauty journey
                        </p>
                    </div>

                    {/* Form */}
                    <form
                        onSubmit={handleSubmit}
                        className="auth-form"
                        noValidate
                        autoComplete="off"
                    >
                        {/* Email Input */}
                        <div className="input-group">
                            <label htmlFor="email" className="input-label">
                                Email Address
                            </label>
                            <div className="input-wrapper">
                                <svg
                                    className="input-icon"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                                <input
                                    id="email"
                                    className="auth-input"
                                    type="email"
                                    name="email"
                                    placeholder="you@example.com"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="input-group">
                            <label htmlFor="password" className="input-label">
                                Password
                            </label>
                            <div className="input-wrapper">
                                <svg
                                    className="input-icon"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <input
                                    id="password"
                                    className="auth-input"
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        {/* Remember & Forgot */}
                        <div className="auth-options">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="checkbox-input"
                                />
                                <span className="checkbox-text">Remember me</span>
                            </label>
                            <Link to="/forgot-password" className="forgot-link">
                                Forgot password?
                            </Link>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="auth-error" role="alert">
                                <svg
                                    className="error-icon"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button className="auth-button" type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <svg className="spinner" viewBox="0 0 24 24">
                                        <circle className="spinner-circle" cx="12" cy="12" r="10" />
                                    </svg>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <svg
                                        className="button-arrow"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="auth-divider">
                        <span className="divider-line"></span>
                        <span className="divider-text">or continue with</span>
                        <span className="divider-line"></span>
                    </div>

                    {/* Social Login */}
                    <div className="social-buttons">
                        <button className="social-button" type="button">
                            <svg viewBox="0 0 24 24" className="social-icon">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Google
                        </button>

                        <button className="social-button" type="button">
                            <svg viewBox="0 0 24 24" className="social-icon">
                                <path
                                    fill="currentColor"
                                    d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                                />
                            </svg>
                            Facebook
                        </button>
                    </div>

                    {/* Sign Up Link */}
                    <div className="auth-switch">
                        Don't have an account?{" "}
                        <a href="/register" className="switch-link">
                            Sign up now
                        </a>
                    </div>
                </div>
            </div>

            {/* Sağ Panel - Hero Image */}
            <div className="auth-right">
                <div className="auth-hero">
                    <div className="hero-overlay"></div>
                    <div className="hero-content">
                        <div className="hero-badge">Lunara Beauty</div>
                        <h2 className="hero-title">Discover Your Natural Glow</h2>
                        <p className="hero-text">
                            Join thousands of beauty enthusiasts and explore our curated
                            collection of premium makeup and skincare products.
                        </p>
                        <div className="hero-features">
                            <div className="feature-item">
                                <svg
                                    className="feature-icon"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <span>Free Shipping Over $50</span>
                            </div>

                            <div className="feature-item">
                                <svg
                                    className="feature-icon"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <span>30-Day Returns</span>
                            </div>

                            <div className="feature-item">
                                <svg
                                    className="feature-icon"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <span>Authentic Products</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;
