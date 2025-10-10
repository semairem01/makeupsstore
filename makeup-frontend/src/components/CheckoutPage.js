// src/components/CheckoutPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import { useNavigate } from "react-router-dom";
import "./CheckoutPage.css";

export default function CheckoutPage() {
    const token = localStorage.getItem("token");
    const nav = useNavigate();

    const [cart, setCart] = useState([]);
    const [shipping, setShipping] = useState("standard"); // "standard" | "express"
    const [submitting, setSubmitting] = useState(false);

    // Address form (kept client-side for now)
    const [addr, setAddr] = useState({
        fullName: "",
        phone: "",
        city: "",
        district: "",
        postalCode: "",
        addressLine: "",
    });

    // Card form (compatible with PaymentController/simulate)
    const [card, setCard] = useState({
        cardNumber: "4242 4242 4242 4242",
        expMonth: 12,
        expYear: new Date().getFullYear() + 1,
        cvv: "123",
        nameOnCard: "Test User",
    });

    // ₺ formatter
    const tl = (n) =>
        Number(n || 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

    useEffect(() => {
        if (!token) { nav("/login"); return; }
        axios
            .get(API_ENDPOINTS.CART, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => setCart(r.data || []))
            .catch(() => setCart([]));
    }, [token, nav]);

    // Totals
    const subtotal = useMemo(
        () => (cart || []).reduce((s, x) => s + (x.totalPrice ?? x.TotalPrice ?? 0), 0),
        [cart]
    );
    const shipBase = shipping === "express" ? 79.9 : 39.9;
    const shippingFee = subtotal >= 600 ? 0 : shipBase;
    const grandTotal = subtotal + shippingFee;

    // Simple validation
    const validAddress = () =>
        addr.fullName && addr.phone && addr.city && addr.district && addr.postalCode && addr.addressLine;

    // Pay + create order
    const pay = async () => {
        if (!validAddress()) { alert("Lütfen tüm adres bilgilerini doldurun."); return; }
        const rawCard = (card.cardNumber || "").replace(/\s+/g, "");
        if (rawCard.length < 12 || !card.cvv || !card.nameOnCard) {
            alert("Kart bilgilerini kontrol edin."); return;
        }

        setSubmitting(true);
        try {
            // 1) Simulate payment (send shipping fee for realistic total on BE if used)
            const payRes = await axios.post(
                `${API_ENDPOINTS.PAYMENTS}/simulate`,
                { ...card, cardNumber: rawCard, shippingFee },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!payRes.data?.success) { alert(payRes.data?.message || "Ödeme reddedildi."); return; }

            // 2) Create order from cart — ✅ send shipping info so BE persists it
            const orderRes = await axios.post(
                `${API_ENDPOINTS.ORDERS}/checkout`,
                {
                    shippingFee,
                    shippingMethod: shipping, // "standard" | "express"
                    // Optional: you could also send address snapshot here later
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (orderRes.data?.success === false) {
                alert(orderRes.data?.message || "Sipariş oluşturulamadı.");
                return;
            }

            nav("/orders");
        } catch (e) {
            alert(e?.response?.data || "Ödeme/sipariş sırasında bir hata oluştu.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ maxWidth: 1100, margin: "16px auto", padding: "0 16px", display: "grid", gap: 16 }}>
            <h2 style={{ margin: "8px 0" }}>Ödeme</h2>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
                {/* Left: Address + Shipping + Card */}
                <div style={{ display: "grid", gap: 16 }}>
                    {/* Address */}
                    <section style={cardBox}>
                        <h3 style={secTitle}>Teslimat Adresi</h3>
                        <div style={grid2}>
                            <input placeholder="Ad Soyad" value={addr.fullName} onChange={(e) => setAddr({ ...addr, fullName: e.target.value })} />
                            <input placeholder="Telefon" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} />
                            <input placeholder="İl" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
                            <input placeholder="İlçe" value={addr.district} onChange={(e) => setAddr({ ...addr, district: e.target.value })} />
                            <input placeholder="Posta Kodu" value={addr.postalCode} onChange={(e) => setAddr({ ...addr, postalCode: e.target.value })} />
                            <div />
                            <textarea
                                placeholder="Adres"
                                style={{ gridColumn: "1/-1" }}
                                rows={3}
                                value={addr.addressLine}
                                onChange={(e) => setAddr({ ...addr, addressLine: e.target.value })}
                            />
                        </div>
                    </section>

                    {/* Shipping */}
                    <section style={cardBox}>
                        <h3 style={secTitle}>Kargo</h3>
                        <label style={radioRow}>
                            <input type="radio" name="ship" checked={shipping === "standard"} onChange={() => setShipping("standard")} />
                            <span>Standart ({tl(39.9)}) — {tl(600)}<strong>+ Ücretsiz</strong>{subtotal >= 600 && " (uygulandı)"}</span>
                        </label>
                        <label style={radioRow}>
                            <input type="radio" name="ship" checked={shipping === "express"} onChange={() => setShipping("express")} />
                            <span>Ekspres ({tl(79.9)})</span>
                        </label>
                    </section>

                    {/* Card */}
                    <section style={cardBox}>
                        <h3 style={secTitle}>Card Information</h3>

                        {/* Card form wrapper */}
                        <div className="card-form">
                            {/* Visual card preview */}
                            <div className="card-preview">
                                <div className="chip" />
                                <div className="card-number">{card.cardNumber || "•••• •••• •••• ••••"}</div>
                                <div className="card-footer">
                                    <div>
                                        <label>Card Holder</label>
                                        <div>{card.nameOnCard || "Full Name"}</div>
                                    </div>
                                    <div>
                                        <label>Exp</label>
                                        <div>{card.expMonth || "MM"}/{card.expYear || "YYYY"}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="inputs">
                                <input
                                    placeholder="Name on Card"
                                    value={card.nameOnCard}
                                    onChange={(e) => setCard({ ...card, nameOnCard: e.target.value })}
                                />
                                <input
                                    placeholder="Card Number"
                                    value={card.cardNumber}
                                    onChange={(e) => {
                                        let value = e.target.value.replace(/\D/g, "");
                                        value = value.replace(/(.{4})/g, "$1 ").trim();
                                        setCard({ ...card, cardNumber: value });
                                    }}
                                    maxLength={19}
                                />
                                <div className="row">
                                    <input
                                        placeholder="Month (MM)"
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={card.expMonth}
                                        onChange={(e) => setCard({ ...card, expMonth: Number(e.target.value) })}
                                    />
                                    <input
                                        placeholder="Year (YYYY)"
                                        type="number"
                                        min={new Date().getFullYear()}
                                        value={card.expYear}
                                        onChange={(e) => setCard({ ...card, expYear: Number(e.target.value) })}
                                    />
                                    <input
                                        placeholder="CVV"
                                        type="password"
                                        maxLength={3}
                                        value={card.cvv}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, "").slice(0, 3);
                                            setCard({ ...card, cvv: value });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right: Summary */}
                <aside style={cardBox}>
                    <h3 style={secTitle}>Sipariş Özeti</h3>
                    <div style={{ display: "grid", gap: 8 }}>
                        {(cart || []).map((it, i) => (
                            <div key={i} style={{ display: "grid", gridTemplateColumns: "56px 1fr auto", gap: 10, alignItems: "center" }}>
                                <img
                                    src={(it.imageUrl ?? it.ImageUrl)?.startsWith("http")
                                        ? it.imageUrl ?? it.ImageUrl
                                        : `http://localhost:5011${it.imageUrl ?? it.ImageUrl ?? ""}`}
                                    alt=""
                                    style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10, border: "1px solid #f0d8e6" }}
                                    onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/56"; }}
                                />
                                <div style={{ fontSize: 13, color: "#333" }}>
                                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{it.productName ?? it.ProductName}</div>
                                    <div style={{ opacity: 0.7 }}>Adet: {it.quantity ?? it.Quantity}</div>
                                </div>
                                <div style={{ fontWeight: 700 }}>{tl(it.totalPrice ?? it.TotalPrice ?? 0)}</div>
                            </div>
                        ))}

                        <hr />

                        <div className="summary">
                            <div className="row">
                                <span>Ara Toplam</span>
                                <span>{tl(subtotal)}</span>
                            </div>
                            <div className="row">
                                <span>Kargo ({shipping === "standard" ? "Standart" : "Ekspres"})</span>
                                <span>{tl(shippingFee)}</span>
                            </div>
                            <div className="row total">
                                <strong>Genel Toplam</strong>
                                <strong>{tl(grandTotal)}</strong>
                            </div>
                            <button className="pay-btn" onClick={pay} disabled={submitting || (cart?.length ?? 0) === 0}>
                                {submitting ? "Ödeniyor…" : `Ödemeyi Yap ve Siparişi Oluştur (${tl(grandTotal)})`}
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

const cardBox = {
    background: "#fff",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 8px 26px rgba(0,0,0,.06)",
};
const secTitle = { margin: "0 0 10px", fontSize: 18 };
const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 };
const radioRow = { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 };
