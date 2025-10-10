import React, { useEffect, useState } from "react";
import ProductList from "./components/ProductList";
import ProductDetail from "./components/ProductDetail";
import Register from "./auth/Register";
import Login from "./auth/Login";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import "./App.css";
import { FaShoppingCart } from "react-icons/fa";
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

// Admin sayfası için basit placeholder
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

    useEffect(() => {
        if (!token) {
            setAvatarUrl(null);
            setInitials("U");
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
                const init =
                    (fn ? fn[0] : "") + (ln ? ln[0] : (!fn && email ? email[0] : ""));
                setInitials((init || "U").toUpperCase());
            })
            .catch(() => {
                setAvatarUrl(null);
                setInitials("U");
                localStorage.removeItem("avatarUrl");
            });
    }, [token]);

    const handleAddedToCart = (qty = 1) =>
        setCartCount((prev) => prev + (Number(qty) || 1));

    const handleCartCleared = () => setCartCount(0);

    return (
        <>
            <header className="navbar">
                {/* Sol: Logo + isim */}
                <Link to="/" className="brand">
                    <img src="/images/logo1.png" alt="Lunara Beauty" className="brand-logo" />
                    <span className="brand-text">Lunara Beauty</span>
                </Link>

                {/* Orta: Arama (şık + ikonlu) */}
                <div className="nav-search pretty">
                    <input
                        id="navSearchInput"
                        className="search-input"
                        type="search"
                        placeholder="Ürün, marka veya kategori ara…"
                        aria-label="Search"
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
                            }
                        }}
                    />

                    <button
                        className="search-btn"
                        onClick={() => {
                            const input = document.getElementById("navSearchInput");
                            const q = input?.value?.trim();
                            if (q) {
                                window.location.href = `/products?q=${encodeURIComponent(q)}`;
                                input.value = "";
                            }
                        }}
                        aria-label="Ara"
                        title="Ara"
                    >
                        <img src="/icons/search.png" alt="" />
                    </button>
                </div>

                {/* Sağ: linkler + sepet + avatar / login-register */}
                <div className="navbar-right">
                    {isAdmin && <Link to="/admin">Admin Panel</Link>}

                    {!token && (
                        <>
                            <Link to="/login" className="btn-pill">Login</Link>
                            <Link to="/register" className="btn-pill">Register</Link>
                        </>
                    )}

                    <div className="cart-container">
                        <Link to="/cart" className="cart-link" aria-label="Cart">
                            <FaShoppingCart className="cart-icon" />
                            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                        </Link>
                    </div>

                    {token && (
                        <>
                            <button
                                className="btn-ghost"
                                onClick={() => {
                                    localStorage.removeItem("token");
                                    localStorage.removeItem("isAdmin");
                                    setCartCount(0);
                                    window.location.href = "/";
                                }}
                            >
                                Logout
                            </button>
                            <Link to="/profile" className="avatar-link" title="Profilim">
                                {avatarUrl ? (
                                    <img
                                        src={`http://localhost:5011${avatarUrl}`}
                                        alt="Profil"
                                        className="nav-avatar"
                                        onError={(e) => {
                                            e.currentTarget.src =
                                                "https://via.placeholder.com/36/ffe3f1/000?text=U";
                                        }}
                                    />
                                ) : (
                                    <div className="nav-avatar placeholder">{initials}</div>
                                )}
                            </Link>
                        </>
                    )}
                </div>
            </header>

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
                    <Route path="/profile" element={<PrivateRoute><ProfilePage/></PrivateRoute>} />
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
                </Routes>
            </main>
        </>
    );
}

export default App;
