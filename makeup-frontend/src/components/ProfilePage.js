// src/components/ProfilePage.js
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { API_ENDPOINTS,API_BASE_URL } from "../config";
import "./ProfilePage.css";
import ProfileOrders from "./ProfileOrders";
import AddressBook from "./AddressBook";
import { Trash2, Heart } from "lucide-react";
// ⬇️ YENİ: URL ile sekme senkronu
import { useLocation, useNavigate } from "react-router-dom";

export default function ProfilePage() {
    const token = localStorage.getItem("token");

    // ⬇️ YENİ: URL'den başlangıç tab'ını al
    const location = useLocation();
    const navigate = useNavigate();
    const getInitialTab = () => new URLSearchParams(location.search).get("tab") || "account";
    const [tab, setTab] = useState(getInitialTab());

    // ⬇️ YENİ: URL değişirse tab'ı güncelle (back/forward destekler)
    useEffect(() => {
        setTab(getInitialTab());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    // ⬇️ YENİ: Sekmeye tıklayınca URL'i de güncelle
    const setTabAndUrl = (name) => {
        const sp = new URLSearchParams(location.search);
        sp.set("tab", name);
        navigate({ pathname: "/profile", search: `?${sp.toString()}` }, { replace: false });
        setTab(name);
    };

    const [me, setMe] = useState(null);
    const [form, setForm] = useState({
        username: "",
        firstName: "",
        lastName: "",
        phone: "",
    });
    const [stats, setStats] = useState({ favorites: 0, orders: 0 });

    useEffect(() => {
        axios
            .get(`${API_ENDPOINTS.PROFILE}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                setMe(res.data);
                setForm({
                    username: res.data.username ?? "",
                    firstName: res.data.firstName ?? "",
                    lastName: res.data.lastName ?? "",
                    phone: res.data.phone ?? "",
                });
            });

        axios
            .get(`${API_ENDPOINTS.PROFILE}/stats`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((r) => setStats(r.data))
            .catch(() => setStats({ favorites: 8, orders: 12 }));
    }, [token]);

    const save = async () => {
        try {
            await axios.put(`${API_ENDPOINTS.PROFILE}`, form, {
                headers: { Authorization: `Bearer ${token}` },
            });
            alert("Your profile has been saved successfully!");
        } catch (error) {
            alert("An error occurred: " + (error.response?.data || "Unknown error"));
        }
    };

    const upload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res = await axios.post(`${API_ENDPOINTS.PROFILE}/avatar`, fd, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });
            setMe((m) => ({ ...m, avatarUrl: res.data.avatarUrl }));
            localStorage.setItem("avatarUrl", res.data.avatarUrl);
        } catch (error) {
            alert("Photo upload failed: " + (error.response?.data || "Error"));
        }
    };

    const refreshStats = useCallback(() => {
        axios
            .get(`${API_ENDPOINTS.PROFILE}/stats`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((r) => setStats(r.data))
            .catch(() => {});
    }, [token]);

    return (
        <div className="lp-profile">
            {/* SOL: Profil Kartı */}
            {me && (
                <aside className="lp-card lp-card--side">
                    <div className="lp-avatar">
                        <div className="lp-avatar-wrapper">
                            <div className="lp-avatar-ring">
                                <img
                                    className="lp-avatar__img"
                                    src={
                                        me.avatarUrl
                                            ? `${API_BASE_URL}${me.avatarUrl}`
                                            : "https://via.placeholder.com/132"
                                    }
                                    onError={(e) => {
                                        e.currentTarget.src = "https://via.placeholder.com/132";
                                    }}
                                    alt="Profile"
                                />
                            </div>
                            <div className="lp-avatar-badge">✓</div>
                        </div>
                        <label className="lp-btn lp-btn--ghost">
                            Upload Photo
                            <input type="file" hidden onChange={upload} accept="image/*" />
                        </label>
                    </div>

                    <div className="lp-identity">
                        <h2 className="lp-identity__name">
                            {form.firstName || form.lastName
                                ? `${form.firstName} ${form.lastName}`
                                : "User"}
                        </h2>
                        <div className="lp-identity__user">@{form.username || "username"}</div>
                    </div>

                    <div className="lp-stats">
                        <div className="lp-stat">
                            <div className="lp-stat__num">{stats.favorites}</div>
                            <div className="lp-stat__label">Favorites</div>
                        </div>
                        <div className="lp-stat">
                            <div className="lp-stat__num">{stats.orders}</div>
                            <div className="lp-stat__label">Orders</div>
                        </div>
                    </div>
                </aside>
            )}

            {/* SAĞ: İçerik */}
            <section className="lp-card lp-card--content">
                <div className="lp-tabs">
                    <button
                        className={`lp-tab ${tab === "account" ? "is-active" : ""}`}
                        onClick={() => setTabAndUrl("account")}
                    >
                        Account
                    </button>
                    <button
                        className={`lp-tab ${tab === "addresses" ? "is-active" : ""}`}
                        onClick={() => setTabAndUrl("addresses")}
                    >
                        Addresses
                    </button>
                    <button
                        className={`lp-tab ${tab === "orders" ? "is-active" : ""}`}
                        onClick={() => setTabAndUrl("orders")}
                    >
                        Orders
                    </button>
                    <button
                        className={`lp-tab ${tab === "favorites" ? "is-active" : ""}`}
                        onClick={() => setTabAndUrl("favorites")}
                    >
                        Favorites
                    </button>
                    <button
                        className={`lp-tab ${tab === "password" ? "is-active" : ""}`}
                        onClick={() => setTabAndUrl("password")}
                    >
                        Password
                    </button>
                </div>

                {tab === "account" && me && (
                    <div className="lp-form">
                        <div className="lp-field">
                            <label>Username</label>
                            <input
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                placeholder="Enter your username"
                            />
                        </div>
                        <div className="lp-grid2">
                            <div className="lp-field">
                                <label>First Name</label>
                                <input
                                    value={form.firstName}
                                    onChange={(e) =>
                                        setForm({ ...form, firstName: e.target.value })
                                    }
                                    placeholder="Enter your first name"
                                />
                            </div>
                            <div className="lp-field">
                                <label>Last Name</label>
                                <input
                                    value={form.lastName}
                                    onChange={(e) =>
                                        setForm({ ...form, lastName: e.target.value })
                                    }
                                    placeholder="Enter your last name"
                                />
                            </div>
                        </div>
                        <div className="lp-grid2">
                            <div className="lp-field">
                                <label>Phone</label>
                                <input
                                    type="tel"
                                    inputMode="tel"
                                    pattern="^\+?\d[\d\s-]{7,}$"
                                    title="Example: +90 507 174 1420"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    placeholder="+90 5xx xxx xx xx"
                                />
                            </div>
                            <div className="lp-field">
                                <label>Email</label>
                                <input value={me.email} readOnly />
                            </div>
                        </div>

                        <div className="lp-actions">
                            <button className="lp-btn lp-btn--secondary" onClick={() => window.location.reload()}>
                                Cancel
                            </button>
                            <button className="lp-btn lp-btn--primary" onClick={save}>
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}

                {tab === "favorites" && <FavoritesList onUpdate={refreshStats} />}
                {tab === "orders" && <ProfileOrders />}
                {tab === "addresses" && <AddressBook />}
                {tab === "password" && <ChangePasswordCard />}
            </section>
        </div>
    );
}

function FavoritesList({ onUpdate }) {
    const token = localStorage.getItem("token");
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadFavorites = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_ENDPOINTS.FAVORITES}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setFavorites(res.data || []);
        } catch (error) {
            console.error("Failed to load favorites:", error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadFavorites();
    }, [loadFavorites]);

    const removeFavorite = async (productId) => {
        if (!window.confirm("Remove this product from favorites?")) return;
        try {
            await axios.delete(`${API_ENDPOINTS.FAVORITES}/${productId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setFavorites((prev) => prev.filter((f) => f.productId !== productId));
            onUpdate?.();
        } catch (error) {
            alert("Failed to remove: " + (error.response?.data || "Error"));
        }
    };

    const goToProduct = (productId) => {
        window.location.href = `/product/${productId}`;
    };

    if (loading) {
        return (
            <div className="lp-form" style={{ textAlign: "center", padding: "40px" }}>
                <p>Loading favorites...</p>
            </div>
        );
    }

    if (favorites.length === 0) {
        return (
            <div className="lp-form" style={{ textAlign: "center", padding: "60px 20px" }}>
                <Heart size={64} style={{ color: "#ddd", margin: "0 auto 20px" }} />
                <h3 style={{ color: "#8b7f85", marginBottom: "8px" }}>No favorite products yet</h3>
                <p style={{ color: "#b5a9af", fontSize: "14px" }}>
                    Start adding products you love to your favorites!
                </p>
            </div>
        );
    }

    return (
        <div className="lp-favorites-grid">
            {favorites.map((fav) => {
                const imgSrc = fav.imageUrl?.startsWith("http")
                    ? fav.imageUrl
                    : `${API_BASE_URL}${fav.imageUrl || ""}`;

                return (
                    <div key={fav.productId} className="lp-fav-card">
                        <div className="lp-fav-img" onClick={() => goToProduct(fav.productId)}>
                            <img
                                src={imgSrc}
                                alt={fav.name}
                                onError={(e) => {
                                    e.currentTarget.src = "https://via.placeholder.com/200";
                                }}
                            />
                        </div>
                        <div className="lp-fav-info">
                            <div className="lp-fav-brand">{fav.brand}</div>
                            <div className="lp-fav-name" onClick={() => goToProduct(fav.productId)}>
                                {fav.name}
                            </div>
                            <div className="lp-fav-price">
                                {Number(fav.price).toLocaleString("tr-TR", {
                                    style: "currency",
                                    currency: "TRY",
                                })}
                            </div>
                        </div>
                        <button
                            className="lp-fav-remove"
                            onClick={() => removeFavorite(fav.productId)}
                            title="Remove from favorites"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

function ChangePasswordCard() {
    const [f, setF] = useState({ old: "", neu: "", confirm: "" });
    const token = localStorage.getItem("token");

    const submit = async () => {
        if (f.neu !== f.confirm) {
            alert("New passwords do not match!");
            return;
        }
        if (f.neu.length < 6) {
            alert("New password must be at least 6 characters!");
            return;
        }
        try {
            await axios.post(
                `${API_ENDPOINTS.PROFILE}/change-password`,
                { oldPassword: f.old, newPassword: f.neu },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert("Your password has been updated!");
            setF({ old: "", neu: "", confirm: "" });
        } catch (error) {
            alert("Error: " + (error.response?.data || "Password could not be updated"));
        }
    };

    return (
        <div className="lp-form">
            <div className="lp-grid2">
                <div className="lp-field">
                    <label>Current Password</label>
                    <input
                        type="password"
                        value={f.old}
                        onChange={(e) => setF({ ...f, old: e.target.value })}
                        placeholder="Enter your current password"
                    />
                </div>
                <div className="lp-field">
                    <label>New Password</label>
                    <input
                        type="password"
                        value={f.neu}
                        onChange={(e) => setF({ ...f, neu: e.target.value })}
                        placeholder="Enter your new password"
                    />
                </div>
            </div>
            <div className="lp-field">
                <label>New Password (Again)</label>
                <input
                    type="password"
                    value={f.confirm}
                    onChange={(e) => setF({ ...f, confirm: e.target.value })}
                    placeholder="Re-enter your new password"
                />
            </div>
            <div className="lp-actions">
                <button
                    className="lp-btn lp-btn--secondary"
                    onClick={() => setF({ old: "", neu: "", confirm: "" })}
                >
                    Cancel
                </button>
                <button className="lp-btn lp-btn--primary" onClick={submit}>
                    Update Password
                </button>
            </div>
        </div>
    );
}
