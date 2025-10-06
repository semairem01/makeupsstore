// src/components/Header.jsx
import React from "react";
import { Link, NavLink } from "react-router-dom";
import { FaShoppingCart, FaUserCircle, FaBars } from "react-icons/fa";

export default function Header({
                                   cartCount = 0,
                                   token,
                                   isAdmin = false,
                                   avatarUrl,
                                   initials = "U",
                                   onLogout
                               }) {
    return (
        <header className="site-header">
            <div className="topbar">
                <Link to="/" className="brand">
                    <span className="brand-logo">💄</span>
                    <span className="brand-text">MakeUp Store</span>
                </Link>

                {/* Search */}
                <div className="search">
                    <input
                        className="search-input"
                        type="search"
                        placeholder="Search products, brands…"
                        aria-label="Search"
                    />
                    <button className="search-btn">Search</button>
                </div>

                {/* Right actions: Cart + Profile */}
                <div className="actions">
                    <Link to="/cart" className="cart-link" aria-label="Cart">
                        <FaShoppingCart className="cart-icon" />
                        {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                        <span className="hide-sm">Cart</span>
                    </Link>

                    {token ? (
                        <div className="profile">
                            <Link to="/profile" className="avatar-link" title="My Profile">
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
                            </Link>
                            {isAdmin && (
                                <Link to="/admin" className="admin-link hide-sm">
                                    Admin Panel
                                </Link>
                            )}
                            <button className="logout-btn hide-sm" onClick={onLogout}>
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className="auth">
                            <Link to="/login" className="link">Login</Link>
                            <span className="dot">·</span>
                            <Link to="/register" className="link">Register</Link>
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
