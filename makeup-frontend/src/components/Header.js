// src/components/Header.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { FaShoppingCart, FaBars } from "react-icons/fa";

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

    // Menü navigasyonları
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

                {/* Search */}
                <div className="search">
                    <input
                        className="search-input"
                        type="search"
                        placeholder="Ürün, marka veya kategori ara..."
                        aria-label="Search"
                    />
                    <button className="search-btn">Ara</button>
                </div>

                {/* Right actions: Cart + Profile */}
                <div className="actions">
                    <Link to="/cart" className="cart-link" aria-label="Cart">
                        <FaShoppingCart className="cart-icon" />
                        {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                        <span className="hide-sm">Sepet</span>
                    </Link>

                    {token ? (
                        <div className="profile-wrapper" ref={menuRef}>
                            {/* Avatar - dropdown'ı açan buton */}
                            <button
                                className="avatar-trigger"
                                aria-haspopup="menu"
                                aria-expanded={open}
                                onClick={() => {
                                    console.log('Avatar clicked, open was:', open);
                                    setOpen((v) => !v);
                                }}
                                title="Profilim"
                            >
                                {avatarUrl ? (
                                    <img
                                        src={`http://localhost:5011${avatarUrl}`}
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

                            {/* DROPDOWN MENÜ */}
                            {open && (
                                <div className="profile-dropdown-menu" role="menu">
                                    <button
                                        className="profile-dropdown-item"
                                        onClick={() => go("account")}
                                        role="menuitem"
                                    >
                                        Account
                                    </button>
                                    <button
                                        className="profile-dropdown-item"
                                        onClick={() => go("addresses")}
                                        role="menuitem"
                                    >
                                        Addresses
                                    </button>
                                    <button
                                        className="profile-dropdown-item"
                                        onClick={() => go("orders")}
                                        role="menuitem"
                                    >
                                        Orders
                                    </button>
                                    <button
                                        className="profile-dropdown-item"
                                        onClick={() => go("favorites")}
                                        role="menuitem"
                                    >
                                        Favorites
                                    </button>
                                    <button
                                        className="profile-dropdown-item"
                                        onClick={() => go("password")}
                                        role="menuitem"
                                    >
                                        Password
                                    </button>
                                    <div className="profile-dropdown-sep" />
                                    <button
                                        className="profile-dropdown-item danger"
                                        onClick={() => go("logout")}
                                        role="menuitem"
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}

                            {/* Admin linki (opsiyonel) */}
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

            {/* Category nav */}
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