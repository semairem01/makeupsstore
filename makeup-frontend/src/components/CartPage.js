// src/components/CartPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import { useNavigate } from "react-router-dom";
import "./CartPage.css";
import { API_BASE_URL } from "../config";

function CartPage({ onCleared, onCountChange }) {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [discount, setDiscount] = useState(null);
    const [discountApplied, setDiscountApplied] = useState(false);

    const token = localStorage.getItem("token");
    const navigate = useNavigate();

    const getId = (x) => x.id ?? x.Id;
    const getQty = (x) => x.quantity ?? x.Quantity ?? 0;
    const getUnitPrice = (x) => x.unitPrice ?? x.UnitPrice ?? 0;
    const getTotalPrice = (x) => x.totalPrice ?? x.TotalPrice ?? (getUnitPrice(x) * getQty(x));
    const fmtTRY = (n) =>
        Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "TRY" });

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

        // Check for Lunara discount in localStorage
        const savedDiscount = localStorage.getItem('lunaraDiscount');
        if (savedDiscount) {
            try {
                const discountData = JSON.parse(savedDiscount);
                console.log('💎 Loaded discount from localStorage:', discountData);
                setDiscount(discountData);
                setDiscountApplied(true); // Otomatik uygula
            } catch (e) {
                console.error('Invalid discount data:', e);
                localStorage.removeItem('lunaraDiscount');
            }
        }
    }, [fetchCart]);

    const subtotal = useMemo(
        () => (cartItems || []).reduce((s, x) => s + getTotalPrice(x), 0),
        [cartItems]
    );

    // Calculate discount amount
    const discountAmount = useMemo(() => {
        if (!discount || !discountApplied) return 0;

        const minAmount = discount.minimumOrderAmount ||
            parseFloat(discount.condition?.match(/[\d,]+/)?.[0]?.replace(',', '') || '0');

        if (subtotal < minAmount) {
            console.log(`⚠️ Cart total ${subtotal} is less than minimum ${minAmount}`);
            return 0;
        }

        const amount = (subtotal * discount.value) / 100;
        console.log(`✅ Discount applied: ${discount.value}% = ${amount}`);
        return amount;
    }, [discount, discountApplied, subtotal]);

    const total = subtotal - discountAmount;

    const removeDiscount = () => {
        setDiscountApplied(false);
        setDiscount(null);
        localStorage.removeItem('lunaraDiscount');
        console.log('🗑️ Discount removed');
    };

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

    const goToCheckout = () => {
        if (discountApplied && discount) {
            console.log('🚀 Going to checkout with discount:', {
                code: discount.code,
                amount: discountAmount,
                percentage: discount.value
            });
        }
        navigate("/checkout");
    };

    if (loading) return <p>Loading cart...</p>;

    return (
        <div className="cart-wrap">
            <div className="cart-header">
                <button className="icon-btn" onClick={() => window.history.back()}>←</button>
                <div className="cart-title">Cart</div>
                <button className="icon-btn" onClick={clearCart}>🗑</button>
            </div>

            {cartItems.length === 0 ? (
                <div style={{ maxWidth: 880, margin: "24px auto", color: "#8a8a8a" }}>
                    Your cart is empty.
                </div>
            ) : (
                <>
                    {cartItems.map((item) => {
                        const imgRaw =
                            item.variantImage ?? item.VariantImage ?? item.imageUrl ?? item.ImageUrl ?? "";
                        const imgSrc = imgRaw.startsWith("http")
                            ? imgRaw
                            : `${API_BASE_URL}${imgRaw}`;
                        const title = (item.productName ?? item.ProductName) +
                            ((item.variantName ?? item.VariantName) ? ` - ${(item.variantName ?? item.VariantName)}` : "");

                        return (
                            <div key={getId(item)} className="cart-card">
                                <div className="brand-row">
                                    <span>{item.brand ?? item.Brand}</span>
                                </div>

                                <img
                                    className="product-img"
                                    src={imgSrc}
                                    alt=""
                                    onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/64"; }}
                                />

                                <div className="info">
                                    <h4>{title}</h4>
                                    <p>Beauty</p>
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

                    {/* Discount Section */}
                    {discount && (
                        <div className="discount-section">
                            <div className="discount-card">
                                <div className="discount-icon">🌙</div>
                                <div className="discount-info">
                                    <div className="discount-name">{discount.name}</div>
                                    <div className="discount-detail">
                                        {discount.value}% off • {discount.condition}
                                    </div>
                                    {discount.code && (
                                        <div className="discount-code">Code: {discount.code}</div>
                                    )}
                                </div>
                                <button className="remove-btn" onClick={removeDiscount}>
                                    Remove
                                </button>
                            </div>
                            {discountAmount === 0 && subtotal > 0 && (
                                <div className="discount-warning">
                                    ⚠️ Add {fmtTRY(parseFloat(discount.condition?.match(/[\d,]+/)?.[0]?.replace(',', '') || '0') - subtotal)} more to use this discount
                                </div>
                            )}
                        </div>
                    )}

                    {/* Checkout Bar */}
                    <div className="checkout-bar">
                        <div className="checkout-inner">
                            <div className="total-breakdown">
                                <div className="total-row">
                                    <span>Subtotal:</span>
                                    <span>{fmtTRY(subtotal)}</span>
                                </div>
                                {discountApplied && discountAmount > 0 && (
                                    <div className="total-row discount-row">
                                        <span>🌙 {discount.name} ({discount.value}%):</span>
                                        <span className="discount-value">-{fmtTRY(discountAmount)}</span>
                                    </div>
                                )}
                                <div className="total-row total-final">
                                    <span>Total:</span>
                                    <span>{fmtTRY(total)}</span>
                                </div>
                            </div>
                            <button
                                className="checkout-btn"
                                onClick={goToCheckout}
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