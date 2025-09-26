import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import { useNavigate } from "react-router-dom";
import "./CartPage.css";

function CartPage({ onCleared, onCountChange }) {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [payment, setPayment] = useState({
        cardNumber: "4242 4242 4242 4242",
        expMonth: 12,
        expYear: new Date().getFullYear() + 1,
        cvv: "123",
        nameOnCard: "Test User",
    });

    const token = localStorage.getItem("token");
    const navigate = useNavigate();

    const fetchCart = useCallback(() => {
        return axios
            .get(`${API_ENDPOINTS.CART}`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => {
                setCartItems(res.data);
                const totalQty = (res.data || []).reduce(
                    (sum, x) => sum + (x.quantity ?? x.Quantity ?? 0), 0
                );
                onCountChange?.(totalQty);
            })
            .finally(() => setLoading(false));
    }, [token, onCountChange]);

    useEffect(() => { fetchCart(); }, [fetchCart]);

    const total = useMemo(
        () => cartItems.reduce((s, x) => s + (x.totalPrice ?? x.TotalPrice ?? 0), 0),
        [cartItems]
    );

    const updateQty = async (id, qty) => {
        if (qty < 1) return;
        await axios.put(`${API_ENDPOINTS.CART}/${id}/quantity/${qty}`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        });
        fetchCart();
    };

    const inc = (item) => updateQty(item.id, (item.quantity ?? item.Quantity) + 1);
    const dec = (item) => updateQty(item.id, (item.quantity ?? item.Quantity) - 1);

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

    const simulatePayment = async () => {
        setPaying(true);
        try {
            const res = await axios.post(`${API_ENDPOINTS.PAYMENTS}/simulate`, payment, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.data.success) { alert(res.data.message || "Ödeme reddedildi."); return; }

            const order = await axios.post(`${API_ENDPOINTS.ORDERS}/checkout`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (order.data.success) {
                alert("Sipariş başarıyla oluşturuldu!");
                onCleared?.();
                navigate("/orders");
            } else {
                alert(order.data.message || "Sipariş oluşturulamadı.");
            }
        } catch (e) {
            console.error(e);
            alert("Ödeme/sipariş sırasında hata oluştu.");
        } finally {
            setPaying(false);
        }
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
                    {cartItems.map((item) => (
                        <div key={item.id} className="cart-card">
                            <div className="brand-row">
                                <span>{item.brand ?? item.Brand}</span>
                                <span>view brand</span>
                            </div>

                            <img
                                className="product-img"
                                src={
                                    (item.imageUrl ?? item.ImageUrl)?.startsWith("http")
                                        ? (item.imageUrl ?? item.ImageUrl)
                                        : `http://localhost:5011${item.imageUrl ?? item.ImageUrl ?? ""}`
                                }
                                alt=""
                                onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/64"; }}
                            />

                            <div className="info">
                                <h4>{item.productName ?? item.ProductName}</h4>
                                <p>Face / Beauty</p>
                                <div className="price">₺{(item.unitPrice ?? item.UnitPrice)?.toFixed?.(2) ?? (item.unitPrice ?? item.UnitPrice)}</div>
                            </div>

                            <div className="qty-box">
                                <button className="qty-btn" onClick={() => inc(item)}>-</button>
                                <div className="qty-val">{item.quantity ?? item.Quantity}</div>
                                <button className="qty-btn" onClick={() => dec(item)}>+</button>
                                <button className="qty-btn" style={{ marginLeft: 8 }} onClick={() => removeItem(item.id)}>✕</button>
                            </div>
                        </div>
                    ))}

                    {/* Alt sabit toplam / checkout barı */}
                    <div className="checkout-bar">
                        <div className="checkout-inner">
                            <div className="total">
                                Amount Price<br /> ₺{total.toFixed(2)}
                            </div>
                            <button className="checkout-btn" onClick={simulatePayment} disabled={paying}>
                                {paying ? "Ödeniyor..." : "Check Out"}
                                <span className="badge">
                  {(cartItems || []).reduce((s, x) => s + (x.quantity ?? x.Quantity ?? 0), 0)}
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
