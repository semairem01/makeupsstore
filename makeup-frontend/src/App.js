// src/App.js
import React, { useEffect, useState, useRef } from "react";
import ProductList from "./components/ProductList";
import ProductDetail from "./components/ProductDetail";
import Register from "./auth/Register";
import Login from "./auth/Login";
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import "./App.css";
import { FaShoppingCart, FaSignInAlt } from "react-icons/fa";
import { FaUser } from "react-icons/fa";
import CategoryMenu from "./components/CategoryMenu";
import CartPage from "./components/CartPage";
import OrdersPage from "./components/OrdersPage";
import ProfilePage from "./components/ProfilePage";
import axios from "axios";
import { API_ENDPOINTS } from "./config";
import AdminApp from "./admin/AdminApp";
import Home from "./components/Home";
import SalePage from "./components/SalePage";
import CheckoutPage from "./components/CheckoutPage";
import RoutineFinder from "./components/RoutineFinder";
import Footer from "./components/Footer";
import ContactPage from "./components/ContactPage";
import ScrollToTop from "./components/ScrollToTop";
import PaymentPage from "./components/PaymentPage";
import PromoStrip from "./components/PromoStrip";
import BeautyTips from "./components/BeautyTips";
import LunaraDiscountPopup from "./components/LunaraDiscountPopup";
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import NewArrivals from "./components/NewArrivals";


function AdminDashboard() {
    return <h1>Admin Dashboard - Sadece Admin görebilir</h1>;
}

// Route koruma
function PrivateRoute({ children, adminOnly }) {
    const token = localStorage.getItem("token");
    const isAdmin = localStorage.getItem("isAdmin") === "true";

    if (!token) return <Navigate to="/login" />;
    if (adminOnly && !isAdmin) return <Navigate to="/" />;
    return children;
}

function App() {
    const token = localStorage.getItem("token");
    const isAdmin = localStorage.getItem("isAdmin") === "true";

    const [cartCount, setCartCount] = useState(0);
    const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem("avatarUrl"));
    const [initials, setInitials] = useState("U");
    const [userName, setUserName] = useState("");

    // Dropdown için state / ref / navigate
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    // Sepet sayısını yükle
    useEffect(() => {
        if (!token) {
            setCartCount(0);
            return;
        }
        axios
            .get("http://localhost:5011/api/cart", {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                const totalQty = (res.data || []).reduce(
                    (sum, x) => sum + (x.quantity ?? x.Quantity ?? 0),
                    0
                );
                setCartCount(totalQty);
            })
            .catch((err) => console.error("Sepet yüklenemedi:", err));
    }, [token]);

    // Profile bilgisi yükle (avatar + isim)
    useEffect(() => {
        if (!token) {
            setAvatarUrl(null);
            setInitials("U");
            setUserName("");
            localStorage.removeItem("avatarUrl");
            return;
        }
        axios
            .get(`${API_ENDPOINTS.PROFILE}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                const avatar = res.data?.avatarUrl || null;
                setAvatarUrl(avatar);
                if (avatar) localStorage.setItem("avatarUrl", avatar);

                const fn = (res.data?.firstName || "").trim();
                const ln = (res.data?.lastName || "").trim();
                const email = res.data?.email || "";

                // İsmi kaydet
                setUserName(fn || email.split('@')[0] || "User");

                const init = (fn ? fn[0] : "") + (ln ? ln[0] : (!fn && email ? email[0] : ""));
                setInitials((init || "U").toUpperCase());
            })
            .catch(() => {
                setAvatarUrl(null);
                setInitials("U");
                setUserName("");
                localStorage.removeItem("avatarUrl");
            });
    }, [token]);

    // Dışarı tıklayınca / ESC ile menüyü kapat
    useEffect(() => {
        const onClick = (e) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(e.target)) setMenuOpen(false);
        };
        const onEsc = (e) => e.key === "Escape" && setMenuOpen(false);
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onEsc);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onEsc);
        };
    }, []);

    useEffect(() => {
        const input = document.getElementById('premiumSearchInput');
        const clearBtn = document.querySelector('.search-clear-btn');

        if (input && clearBtn) {
            const handleInput = () => {
                clearBtn.style.display = input.value ? 'flex' : 'none';
            };

            input.addEventListener('input', handleInput);
            return () => input.removeEventListener('input', handleInput);
        }
    }, []);
    
    const handleAddedToCart = (qty = 1) =>
        setCartCount((prev) => prev + (Number(qty) || 1));

    const handleCartCleared = () => setCartCount(0);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("isAdmin");
        localStorage.removeItem("avatarUrl");
        setCartCount(0);
        setAvatarUrl(null);
        setInitials("U");
        setUserName("");
        window.location.href = "/";
    };

    return (
        <>
            {/* SABİT ARKA PLAN */}
            <div className="page-bg" aria-hidden />

            {/* ALTTAN YUKARI GEÇİŞLİ BLUR */}
            <div className="page-bottom-blur" aria-hidden />
            
            <ScrollToTop />
            <PromoStrip />
            <header className="navbar">
                {/* Sol: Logo + isim */}
                <Link to="/" className="brand">
                    <img src="/images/logo1.png" alt="Lunara Beauty" className="brand-logo" />
                    <span className="brand-text">Lunara Beauty</span>
                </Link>

                {/* Orta: Premium Arama */}
                
                <div className="elegant-search-wrapper">
                    <div className="elegant-search-container">

                        <input
                            id="elegantSearchInput"
                            className="elegant-search-input"
                            type="search"
                            placeholder="Search for products, brands or categories..."
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    const q = e.currentTarget.value?.trim();
                                    if (q) {
                                        window.location.href = `/products?q=${encodeURIComponent(q)}`;
                                        e.currentTarget.value = "";
                                    }
                                }
                                if (e.key === "Escape") {
                                    e.currentTarget.value = "";
                                    e.currentTarget.blur();
                                }
                            }}
                        />

                        <button
                            className="elegant-search-btn"
                            onClick={() => {
                                const input = document.getElementById("elegantSearchInput");
                                const q = input?.value?.trim();
                                if (q) {
                                    window.location.href = `/products?q=${encodeURIComponent(q)}`;
                                    input.value = "";
                                }
                            }}
                            aria-label="Search"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.5"/>
                                <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Sağ: linkler + sepet + avatar / login-register */}
                <div className="navbar-right">
                    {isAdmin && <Link to="/admin">Admin Panel</Link>}

                    
                    {!token && (
                        <>
                            {/* Desktop: yazılar */}
                            <div className="auth-desktop">
                                <Link to="/login" className="btn-pill">Login</Link>
                                <Link to="/register" className="btn-pill">Register</Link>
                            </div>

                            {/* Mobile: ikon */}
                            <Link to="/login" className="auth-mobile" aria-label="Giriş Yap">
                                <FaSignInAlt className="auth-mobile-icon" />
                            </Link>
                        </>
                    )}

                    <div className="cart-container">
                        <Link to="/cart" className="cart-link" aria-label="Cart">
                            <FaShoppingCart className="cart-icon" />
                            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                        </Link>
                    </div>
                    
                    
                    {/* Avatar & Dropdown */}
                    {token && (
                        <div
                            ref={menuRef}
                            style={{ position: "relative", display: "flex", alignItems: "center" }}
                        >
                            {/* Trigger */}
                            <button
                                onClick={() => setMenuOpen((v) => !v)}
                                aria-haspopup="menu"
                                aria-expanded={menuOpen}
                                className="user-trigger"
                                title="Profil menüsü"
                            >
                                {avatarUrl ? (
                                    <img
                                        src={`http://localhost:5011${avatarUrl}`}
                                        alt="Profil"
                                        className="nav-avatar"
                                        onError={(e) => {
                                            e.currentTarget.src = "https://via.placeholder.com/36/ffe3f1/000?text=U";
                                        }}
                                    />
                                ) : (
                                    <div className="nav-avatar placeholder">{initials}</div>
                                )}
                                <span className="caret">▾</span>
                            </button>

                            {/* Menü */}
                            {(() => {
                                const items = [
                                    { label: "Account",   tab: "account",   icon: "/icons/user.png" },
                                    { label: "Addresses", tab: "addresses", icon: "/icons/location.png" },
                                    { label: "Orders",    tab: "orders",    icon: "/icons/orders.png" },
                                    { label: "Favorites", tab: "favorites", icon: "/icons/heart.png" },
                                    { label: "Password",  tab: "password",  icon: "/icons/lock.png" },
                                ];

                                if (isAdmin) {
                                    items.unshift({
                                        label: "Admin Panel",
                                        link: "/admin",
                                        icon: "/icons/admin.png" // veya başka bir ikon
                                    });
                                }

                                return (
                                    <div
                                        role="menu"
                                        className={`user-menu ${menuOpen ? "open" : ""}`}
                                    >
                                        {/* Üst mini profil */}
                                        <div className="user-menu-header">
                                            <div className="avatar-wrap">
                                                {avatarUrl ? (
                                                    <img
                                                        src={`http://localhost:5011${avatarUrl}`}
                                                        alt="Profil"
                                                        className="avatar-img"
                                                        onError={(e) => {
                                                            e.currentTarget.src =
                                                                "https://via.placeholder.com/64/ffe3f1/000?text=U";
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="avatar-img placeholder">{initials}</div>
                                                )}
                                            </div>
                                            <div className="user-info">
                                                <div className="u-greeting">Welcome back</div>
                                                <div className="u-name">{userName} !</div>
                                            </div>
                                        </div>

                                        <div className="menu-sep" />

                                        {/* Liste */}
                                        <ul className="user-menu-list">
                                            {items.map((it) => (
                                                <li key={it.tab || it.link}>
                                                    <button
                                                        role="menuitem"
                                                        className="menu-item"
                                                        onClick={() => {
                                                            setMenuOpen(false);
                                                            if (it.link) {
                                                                navigate(it.link);
                                                            } else {
                                                                navigate(`/profile?tab=${it.tab}`);
                                                            }
                                                        }}
                                                    >
                                                        <img src={it.icon} alt="" className="mi-icon" />
                                                        <span className="mi-label">{it.label}</span>
                                                        <span className="mi-right">›</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="menu-sep" />

                                        {/* Çıkış */}
                                        <button
                                            role="menuitem"
                                            className="menu-item danger"
                                            onClick={() => {
                                                setMenuOpen(false);
                                                handleLogout();
                                            }}
                                        >
                                            <img
                                                src="/icons/logout.png"
                                                alt=""
                                                className="mi-icon"
                                                onError={(e) => (e.currentTarget.style.display = "none")}
                                            />
                                            <span className="mi-label">Logout</span>
                                        </button>

                                        {/* küçük ok */}
                                        <span className="menu-pointer" aria-hidden="true" />
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                </div>
            </header>
            
            <LunaraDiscountPopup />
            <CategoryMenu />

            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Home onAdded={handleAddedToCart} />} />
                    <Route path="/products" element={<ProductList onAdded={handleAddedToCart} />} />
                    <Route path="/product/:id" element={<ProductDetail onAdded={handleAddedToCart} />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/category/:id" element={<ProductList onAdded={handleAddedToCart} />} />
                    <Route
                        path="/cart"
                        element={<CartPage onCleared={handleCartCleared} onCountChange={setCartCount} />}
                    />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                    <Route
                        path="/admin/*"
                        element={
                            <PrivateRoute adminOnly={true}>
                                <AdminApp />
                            </PrivateRoute>
                        }
                    />
                    <Route path="/sale" element={<SalePage onAdded={handleAddedToCart} />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/routine" element={<RoutineFinder />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/checkout/payment" element={<PaymentPage />} />
                    <Route path="/beauty-tips" element={<BeautyTips />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/new-arrivals" element={<NewArrivals onAdded={handleAddedToCart} />} />
                </Routes>
            </main>
            <Footer />
        </>
    );
}

export default App;