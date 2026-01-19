// src/components/CartPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "./Toast";
import "./CartPage.css";
import { API_BASE_URL, API_ENDPOINTS } from "../config";
import axios from "axios";

function CartPage({ onCleared, onCountChange }) {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [discount, setDiscount] = useState(null);
    const [discountApplied, setDiscountApplied] = useState(false);
    const [toast, setToast] = useState(null);

    const navigate = useNavigate();

    const showToast = (message, type = "success") => setToast({ message, type });

    const fmtTRY = (n) =>
        Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "TRY" });

    const isLoggedIn = () => !!localStorage.getItem("token");

    const normalizeBackendItems = (items) => {
        // Backend service'in döndürdüğüne göre field isimleri değişebilir.
        // Ama en kritik: id (cartItemId) ve quantity/unitPrice
        return (items || []).map((x) => ({
            // ✅ backend item id (Update/Remove için gerekli)
            id: x.id ?? x.Id,

            productId: x.productId ?? x.ProductId,
            variantId: x.variantId ?? x.VariantId ?? null,
            quantity: Number(x.quantity ?? x.Quantity ?? 1),
            price: Number(x.unitPrice ?? x.UnitPrice ?? x.price ?? x.Price ?? 0),

            name: x.productName ?? x.ProductName ?? x.name ?? x.Name,
            brand: x.brand ?? x.Brand,
            imageUrl: x.imageUrl ?? x.ImageUrl,
        }));
    };

    const loadCart = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");

            // ✅ login varsa backend cart
            if (token) {
                const res = await axios.get(`${API_ENDPOINTS.CART}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const backendItems = normalizeBackendItems(res.data);
                setCartItems(backendItems);

                const totalQty = backendItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
                onCountChange?.(totalQty);
                return;
            }

            // ✅ guest cart
            const guestCart = JSON.parse(localStorage.getItem("guestCart") || "[]");
            setCartItems(guestCart);

            const totalQty = guestCart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
            onCountChange?.(totalQty);
        } catch (e) {
            console.error("Cart load error:", e);
            setCartItems([]);
        } finally {
            setLoading(false);
        }
    }, [onCountChange]);

    useEffect(() => {
        loadCart();

        // login sonrası sync bittiyse cart page yenilensin
        const onUpdated = () => loadCart();
        window.addEventListener("cart:updated", onUpdated);
        return () => window.removeEventListener("cart:updated", onUpdated);
    }, [loadCart]);

    useEffect(() => {
        const savedDiscount = localStorage.getItem("lunaraDiscount");
        if (savedDiscount) {
            try {
                const discountData = JSON.parse(savedDiscount);
                setDiscount(discountData);
                setDiscountApplied(true);
            } catch (e) {
                console.error("Invalid discount data:", e);
                localStorage.removeItem("lunaraDiscount");
            }
        }
    }, []);

    const subtotal = useMemo(
        () => cartItems.reduce((s, item) => s + (Number(item.price) * Number(item.quantity)), 0),
        [cartItems]
    );

    const discountAmount = useMemo(() => {
        if (!discount || !discountApplied) return 0;

        const minAmount =
            discount.minimumOrderAmount ||
            parseFloat(discount.condition?.match(/[\d,]+/)?.[0]?.replace(",", "") || "0");

        if (subtotal < minAmount) return 0;

        return (subtotal * discount.value) / 100;
    }, [discount, discountApplied, subtotal]);

    const total = subtotal - discountAmount;

    const removeDiscount = () => {
        setDiscountApplied(false);
        setDiscount(null);
        localStorage.removeItem("lunaraDiscount");
        showToast("Discount removed", "info");
    };

    const updateQty = async (index, qty) => {
        if (qty < 1) return;

        // ✅ login: backend PUT /api/cart/{id}/quantity/{quantity}
        if (isLoggedIn()) {
            const token = localStorage.getItem("token");
            const item = cartItems[index];

            if (!item?.id) {
                showToast("Cart item id missing (backend response).", "error");
                return;
            }

            try {
                await axios.put(
                    `${API_ENDPOINTS.CART}/${item.id}/quantity/${qty}`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const updated = [...cartItems];
                updated[index] = { ...updated[index], quantity: qty };
                setCartItems(updated);

                const totalQty = updated.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
                onCountChange?.(totalQty);
                window.dispatchEvent(new Event("cart:updated"));
            } catch (e) {
                console.error(e);
                showToast("Could not update quantity.", "error");
            }
            return;
        }

        // ✅ guest: localStorage
        const updatedCart = [...cartItems];
        updatedCart[index].quantity = qty;
        localStorage.setItem("guestCart", JSON.stringify(updatedCart));
        setCartItems(updatedCart);

        const totalQty = updatedCart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        onCountChange?.(totalQty);
        window.dispatchEvent(new Event("cart:updated"));
    };

    const inc = (index) => updateQty(index, Number(cartItems[index].quantity) + 1);
    const dec = (index) => updateQty(index, Number(cartItems[index].quantity) - 1);

    const removeItem = async (index) => {
        // ✅ login: backend DELETE /api/cart/{id}
        if (isLoggedIn()) {
            const token = localStorage.getItem("token");
            const item = cartItems[index];

            if (!item?.id) {
                showToast("Cart item id missing (backend response).", "error");
                return;
            }

            try {
                await axios.delete(`${API_ENDPOINTS.CART}/${item.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const updatedCart = cartItems.filter((_, i) => i !== index);
                setCartItems(updatedCart);

                const totalQty = updatedCart.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
                onCountChange?.(totalQty);
                showToast("Item removed from cart", "info");
                window.dispatchEvent(new Event("cart:updated"));
            } catch (e) {
                console.error(e);
                showToast("Could not remove item.", "error");
            }
            return;
        }

        // ✅ guest: localStorage
        const updatedCart = cartItems.filter((_, i) => i !== index);
        localStorage.setItem("guestCart", JSON.stringify(updatedCart));
        setCartItems(updatedCart);

        const totalQty = updatedCart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        onCountChange?.(totalQty);
        showToast("Item removed from cart", "info");
        window.dispatchEvent(new Event("cart:updated"));
    };

    const clearCart = async () => {
        // ✅ login: backend DELETE /api/cart/clear
        if (isLoggedIn()) {
            const token = localStorage.getItem("token");
            try {
                await axios.delete(`${API_ENDPOINTS.CART}/clear`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            } catch (e) {
                console.error(e);
                showToast("Could not clear cart.", "error");
                return;
            }
        } else {
            localStorage.removeItem("guestCart");
        }

        setCartItems([]);
        onCountChange?.(0);
        onCleared?.();
        showToast("Cart cleared", "info");
        window.dispatchEvent(new Event("cart:updated"));
    };

    const goToCheckout = () => {
        const token = localStorage.getItem("token");

        if (!token) {
            showToast("Please sign in to continue checkout", "warning");
            setTimeout(() => {
                navigate("/login", { state: { from: "/checkout" } });
            }, 1000);
            return;
        }

        navigate("/checkout");
    };

    if (loading) return <p>Loading cart...</p>;

    return (
        <div className="cart-wrap">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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
                    {cartItems.map((item, index) => {
                        const raw = item.imageUrl || "";
                        const imgSrc = raw.startsWith("http") ? raw : `${API_BASE_URL}${raw}`;

                        return (
                            <div key={`${item.productId}-${item.variantId}-${item.id ?? index}`} className="cart-card">
                                <div className="brand-row">
                                    <span>{item.brand}</span>
                                </div>

                                <img
                                    className="product-img"
                                    src={imgSrc}
                                    alt={item.name}
                                    onError={(e) => {
                                        e.currentTarget.src = "https://via.placeholder.com/64";
                                    }}
                                />

                                <div className="info">
                                    <h4>{item.name}</h4>
                                    <p>Beauty</p>
                                    <div className="price">{fmtTRY(item.price)}</div>
                                </div>

                                <div className="qty-box">
                                    <button className="qty-btn" onClick={() => dec(index)}>-</button>
                                    <div className="qty-val">{item.quantity}</div>
                                    <button className="qty-btn" onClick={() => inc(index)}>+</button>
                                    <button className="qty-btn" style={{ marginLeft: 8 }} onClick={() => removeItem(index)}>
                                        ✕
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {discount && (
                        <div className="discount-section">
                            <div className="discount-card">
                                <div className="discount-icon">🌙</div>
                                <div className="discount-info">
                                    <div className="discount-name">{discount.name}</div>
                                    <div className="discount-detail">
                                        {discount.value}% off • {discount.condition}
                                    </div>
                                    {discount.code && <div className="discount-code">Code: {discount.code}</div>}
                                </div>
                                <button className="remove-btn" onClick={removeDiscount}>Remove</button>
                            </div>

                            {discountAmount === 0 && subtotal > 0 && (
                                <div className="discount-warning">
                                    ⚠️ Add{" "}
                                    {fmtTRY(
                                        parseFloat(discount.condition?.match(/[\d,]+/)?.[0]?.replace(",", "") || "0") - subtotal
                                    )}{" "}
                                    more to use this discount
                                </div>
                            )}
                        </div>
                    )}

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

                            <button className="checkout-btn" onClick={goToCheckout}>
                                Check Out
                                <span className="badge">
                  {cartItems.reduce((s, item) => s + (Number(item.quantity) || 0), 0)}
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
