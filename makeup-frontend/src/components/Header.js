// src/components/Header.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { FaShoppingCart, FaBars } from "react-icons/fa";
import { API_BASE_URL, API_ENDPOINTS } from "../config";
import axios from "axios";

export default function Header({
                                   cartCount = 0,
                                   token,
                                   isAdmin = false,
                                   avatarUrl,
                                   initials = "U",
                                   onLogout,
                               }) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    // ✅ Header içinde gerçek count'u tut
    const [badgeCount, setBadgeCount] = useState(cartCount);

    // prop değişirse badge'i güncelle (sayfa refresh / cart page sonrası vs)
    useEffect(() => {
        setBadgeCount(cartCount);
    }, [cartCount]);

    const refreshCartCount = useCallback(async () => {
        const t = localStorage.getItem("token");

        // ✅ login ise backend'ten say
        if (t) {
            try {
                const res = await axios.get(API_ENDPOINTS.CART, {
                    headers: { Authorization: `Bearer ${t}` },
                });

                const items = Array.isArray(res.data) ? res.data : [];
                const totalQty = items.reduce(
                    (s, x) => s + Number(x.quantity ?? x.Quantity ?? 0),
                    0
                );
                setBadgeCount(totalQty);
                return;
            } catch (e) {
                console.error("Header refreshCartCount failed:", e);
                // backend düşerse 0'a çekme, en azından mevcut kalsın istersen:
                // setBadgeCount(0);
                return;
            }
        }

        // ✅ guest ise localStorage'tan say
        try {
            const guest = JSON.parse(localStorage.getItem("guestCart") || "[]");
            const totalQty = guest.reduce((s, x) => s + Number(x.quantity || 0), 0);
            setBadgeCount(totalQty);
        } catch {
            setBadgeCount(0);
        }
    }, []);

    // ✅ event ile anında güncelle
    useEffect(() => {
        refreshCartCount(); // ilk yüklemede de garanti

        const handler = (e) => {
            const c = e?.detail?.count;
            if (Number.isFinite(c)) setBadgeCount(c);
            else refreshCartCount();
        };
        window.addEventListener("cart:updated", handler);

        // token değişince (login/logout) de güncellensin
        const onStorage = (e) => {
            if (e.key === "token" || e.key === "guestCart") refreshCartCount();
        };
        window.addEventListener("storage", onStorage);

        return () => {
            window.removeEventListener("cart:updated", handler);
            window.removeEventListener("storage", onStorage);
        };
    }, [refreshCartCount]);

    // Dışarı tıklayınca veya ESC ile kapat
    useEffect(() => {
        const onClick = (e) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(e.target)) setOpen(false);
        };
        const onEsc = (e) => e.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onEsc);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onEsc);
        };
    }, []);

    const go = (tab) => {
        setOpen(false);
        if (tab === "logout") return onLogout?.();
        navigate(`/profile?tab=${tab}`);
    };

    return (
        <header className="site-header">
            <div className="topbar">
                <Link to="/" className="brand">
                    <span className="brand-logo">💄</span>
                    <span className="brand-text">Lunara Beauty</span>
                </Link>

                <div className="search">
                    <input
                        className="search-input"
                        type="search"
                        placeholder="Ürün, marka veya kategori ara..."
                        aria-label="Search"
                    />
                    <button className="search-btn">Ara</button>
                </div>

                <div className="actions">
                    <Link to="/cart" className="cart-link" aria-label="Cart">
                        <FaShoppingCart className="cart-icon" />
                        {badgeCount > 0 && <span className="cart-badge">{badgeCount}</span>}
                        <span className="hide-sm">Sepet</span>
                    </Link>

                    {token ? (
                        <div className="profile-wrapper" ref={menuRef}>
                            <button
                                className="avatar-trigger"
                                aria-haspopup="menu"
                                aria-expanded={open}
                                onClick={() => setOpen((v) => !v)}
                                title="Profilim"
                            >
                                {avatarUrl ? (
                                    <img
                                        src={`${API_BASE_URL}${avatarUrl}`}
                                        alt="Profile"
                                        className="avatar"
                                        onError={(e) => {
                                            e.currentTarget.src =
                                                "https://via.placeholder.com/36/ffe3f1/000?text=U";
                                        }}
                                    />
                                ) : (
                                    <div className="avatar placeholder">{initials}</div>
                                )}
                                <span className="avatar-caret">▾</span>
                            </button>

                            {open && (
                                <div className="profile-dropdown-menu" role="menu">
                                    <button className="profile-dropdown-item" onClick={() => go("account")} role="menuitem">
                                        Account
                                    </button>
                                    <button className="profile-dropdown-item" onClick={() => go("addresses")} role="menuitem">
                                        Addresses
                                    </button>
                                    <button className="profile-dropdown-item" onClick={() => go("orders")} role="menuitem">
                                        Orders
                                    </button>
                                    <button className="profile-dropdown-item" onClick={() => go("favorites")} role="menuitem">
                                        Favorites
                                    </button>
                                    <button className="profile-dropdown-item" onClick={() => go("password")} role="menuitem">
                                        Password
                                    </button>
                                    <div className="profile-dropdown-sep" />
                                    <button className="profile-dropdown-item danger" onClick={() => go("logout")} role="menuitem">
                                        Logout
                                    </button>
                                </div>
                            )}

                            {isAdmin && (
                                <Link to="/admin" className="admin-link hide-sm">
                                    Admin Panel
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="auth">
                            <Link to="/login" className="link">Giriş Yap</Link>
                            <span className="dot">·</span>
                            <Link to="/register" className="link">Kayıt Ol</Link>
                        </div>
                    )}

                    <button className="hamburger" aria-label="Open menu">
                        <FaBars />
                    </button>
                </div>
            </div>

            <nav className="subnav">
                <NavLink to="/category/face">Face</NavLink>
                <NavLink to="/category/eyes">Eyes</NavLink>
                <NavLink to="/category/eyebrows">Eyebrows</NavLink>
                <NavLink to="/category/lips">Lips</NavLink>
                <NavLink to="/category/skincare">Skincare</NavLink>
            </nav>
        </header>
    );
}
