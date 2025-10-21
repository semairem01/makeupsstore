// src/components/CartPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import { useNavigate } from "react-router-dom";
import "./CartPage.css";

function CartPage({ onCleared, onCountChange }) {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");
    const navigate = useNavigate();

    // küçük yardımcılar
    const getId = (x) => x.id ?? x.Id;
    const getQty = (x) => x.quantity ?? x.Quantity ?? 0;
    const getUnitPrice = (x) => x.unitPrice ?? x.UnitPrice ?? 0;
    const getTotalPrice = (x) => x.totalPrice ?? x.TotalPrice ?? (getUnitPrice(x) * getQty(x));
    const fmtTRY = (n) =>
        Number(n || 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

    const fetchCart = useCallback(() => {
        return axios
            .get(`${API_ENDPOINTS.CART}`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => {
                setCartItems(res.data || []);
                const totalQty = (res.data || []).reduce((sum, x) => sum + getQty(x), 0);
                onCountChange?.(totalQty);
            })
            .finally(() => setLoading(false));
    }, [token, onCountChange]);

    useEffect(() => {
        fetchCart();
    }, [fetchCart]);

    const total = useMemo(
        () => (cartItems || []).reduce((s, x) => s + getTotalPrice(x), 0),
        [cartItems]
    );

    const updateQty = async (id, qty) => {
        if (qty < 1) return;
        await axios.put(`${API_ENDPOINTS.CART}/${id}/quantity/${qty}`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        });
        fetchCart();
    };

    const inc = (item) => updateQty(getId(item), getQty(item) + 1);
    const dec = (item) => updateQty(getId(item), getQty(item) - 1);

    const removeItem = async (id) => {
        await axios.delete(`${API_ENDPOINTS.CART}/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        fetchCart();
    };

    const clearCart = async () => {
        await axios.delete(`${API_ENDPOINTS.CART}/clear`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setCartItems([]);
        onCountChange?.(0);
        onCleared?.();
    };

    if (loading) return <p>Sepet yükleniyor...</p>;

    return (
        <div className="cart-wrap">
            <div className="cart-header">
                <button className="icon-btn" onClick={() => window.history.back()}>←</button>
                <div className="cart-title">Cart</div>
                <button className="icon-btn" onClick={clearCart}>🗑</button>
            </div>

            {cartItems.length === 0 ? (
                <div style={{ maxWidth: 880, margin: "24px auto", color: "#8a8a8a" }}>
                    Sepetiniz boş.
                </div>
            ) : (
                <>
                    {cartItems.map((item) => {
                        // ⭐ varyant görseli öncelikli
                        const imgRaw =
                            item.variantImage ?? item.VariantImage ?? item.imageUrl ?? item.ImageUrl ?? "";
                        const imgSrc = imgRaw.startsWith("http")
                            ? imgRaw
                            : `http://localhost:5011${imgRaw}`;
                        const title = (item.productName ?? item.ProductName) +
                            ((item.variantName ?? item.VariantName) ? ` - ${(item.variantName ?? item.VariantName)}` : "");

                        return (
                            <div key={getId(item)} className="cart-card">
                                <div className="brand-row">
                                    <span>{item.brand ?? item.Brand}</span>
                                    <span>view brand</span>
                                </div>

                                <img
                                    className="product-img"
                                    src={imgSrc}
                                    alt=""
                                    onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/64"; }}
                                />

                                <div className="info">
                                    <h4>{title}</h4>
                                    <p>Face / Beauty</p>
                                    <div className="price">
                                        {fmtTRY(getUnitPrice(item))}
                                    </div>
                                </div>

                                <div className="qty-box">
                                    <button className="qty-btn" onClick={() => dec(item)}>-</button>
                                    <div className="qty-val">{getQty(item)}</div>
                                    <button className="qty-btn" onClick={() => inc(item)}>+</button>
                                    <button
                                        className="qty-btn"
                                        style={{ marginLeft: 8 }}
                                        onClick={() => removeItem(getId(item))}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {/* Alt sabit toplam / checkout barı */}
                    <div className="checkout-bar">
                        <div className="checkout-inner">
                            <div className="total">
                                Amount Price<br /> {fmtTRY(total)}
                            </div>
                            <button
                                className="checkout-btn"
                                onClick={() => navigate("/checkout")}
                            >
                                Check Out
                                <span className="badge">
                  {(cartItems || []).reduce((s, x) => s + getQty(x), 0)}
                </span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default CartPage;
