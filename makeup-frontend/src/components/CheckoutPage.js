// src/components/CheckoutPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import { useNavigate } from "react-router-dom";
import "./CheckoutPage.css";
import AddressSelect from "./AddressSelect";
// Adres modalını reuse edelim (AddressBook.jsx en sonunda export edilen isim)
import { __INTERNAL__AddressModal as AddressModal } from "./AddressBook";

export default function CheckoutPage() {
    const token = localStorage.getItem("token");
    const nav = useNavigate();

    const [cart, setCart] = useState([]);
    const [shipping, setShipping] = useState("standard");
    const [submitting, setSubmitting] = useState(false);

    // ✔ seçilen adres objesi + id
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [selectedAddressId, setSelectedAddressId] = useState(0);

    // AddressSelect'i yeniden mount etmek için küçük sayaç
    const [addrListVersion, setAddrListVersion] = useState(0);
    const [addrModalOpen, setAddrModalOpen] = useState(false);

    // Form (elle giriş yaparsa yine dursun)
    const [addr, setAddr] = useState({
        fullName: "",
        phone: "",
        city: "",
        district: "",
        postalCode: "",
        addressLine: "",
    });

    // Kart formu
    const [card, setCard] = useState({
        cardNumber: "4242 4242 4242 4242",
        expMonth: 12,
        expYear: new Date().getFullYear() + 1,
        cvv: "123",
        nameOnCard: "Test User",
    });

    const tl = (n) =>
        Number(n || 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

    useEffect(() => {
        if (!token) {
            nav("/login");
            return;
        }
        axios
            .get(API_ENDPOINTS.CART, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => setCart(r.data || []))
            .catch(() => setCart([]));
    }, [token, nav]);

    // ✔ AddressSelect'ten gelen objeyi forma geçir
    const onAddressPicked = useCallback((obj) => {
        setSelectedAddress(obj);
        setSelectedAddressId(obj?.id ?? 0);

        if (!obj) {
            // seçimi temizlediyse formu sıfırlayalım
            setAddr({
                fullName: "",
                phone: "",
                city: "",
                district: "",
                postalCode: "",
                addressLine: "",
            });
            return;
        }

        const line =
            [
                obj.street,
                obj.buildingNo ? `No:${obj.buildingNo}` : null,
                obj.apartmentNo ? `D:${obj.apartmentNo}` : null,
            ].filter(Boolean).join(" ");

        setAddr({
            fullName: obj.fullName || "",
            phone: obj.phone || "",
            city: obj.city || "",
            district: obj.district || "",
            postalCode: obj.postalCode || "",
            addressLine: line,
        });
    }, []);

    const subtotal = useMemo(
        () => (cart || []).reduce((s, x) => s + (x.totalPrice ?? x.TotalPrice ?? 0), 0),
        [cart]
    );
    const shipBase = shipping === "express" ? 79.9 : 39.9;
    const shippingFee = subtotal >= 600 ? 0 : shipBase;
    const grandTotal = subtotal + shippingFee;

    const validAddress = () =>
        addr.fullName && addr.phone && addr.city && addr.district && addr.postalCode && addr.addressLine;

    const pay = async () => {
        if (!validAddress()) {
            alert("Lütfen tüm adres bilgilerini doldurun.");
            return;
        }
        const rawCard = (card.cardNumber || "").replace(/\s+/g, "");
        if (rawCard.length < 12 || !card.cvv || !card.nameOnCard) {
            alert("Kart bilgilerini kontrol edin.");
            return;
        }

        setSubmitting(true);
        try {
            // 1) Ödeme simülasyonu
            const payRes = await axios.post(
                `${API_ENDPOINTS.PAYMENTS}/simulate`,
                { ...card, cardNumber: rawCard, shippingFee },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!payRes.data?.success) {
                alert(payRes.data?.message || "Ödeme reddedildi.");
                return;
            }

            // 2) Siparişi oluştur (✔ addressId gönderiyoruz)
            const orderRes = await axios.post(
                `${API_ENDPOINTS.ORDERS}/checkout`,
                {
                    shippingFee,
                    shippingMethod: shipping,
                    addressId: selectedAddressId > 0 ? selectedAddressId : null,
                    // addressId yoksa backend tarafı body'den okuyor; istersen buraya da formdaki snapshot'ı koyabilirsin.
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
                {/* Left */}
                <div style={{ display: "grid", gap: 16 }}>
                    {/* ✔ Address */}
                    <section style={cardBox}>
                        <h3 style={secTitle}>Teslimat Adresi</h3>

                        {/* Select + Yeni Adres */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 10 }}>
                            <AddressSelect
                                key={addrListVersion}
                                value={selectedAddressId}
                                onChange={onAddressPicked}
                                onNew={() => setAddrModalOpen(true)}
                            />
                            <button
                                type="button"
                                className="lp-btn lp-btn--secondary"
                                onClick={() => setAddrModalOpen(true)}
                                style={{ height: 36, alignSelf: "end" }}
                            >
                                Yeni Adres
                            </button>
                        </div>

                        {/* Form alanlarını seçime göre dolduruyoruz */}
                        <div style={grid2}>
                            <input
                                placeholder="Ad Soyad"
                                value={addr.fullName}
                                onChange={(e) => setAddr({ ...addr, fullName: e.target.value })}
                            />
                            <input
                                placeholder="Telefon"
                                value={addr.phone}
                                onChange={(e) => setAddr({ ...addr, phone: e.target.value })}
                            />
                            <input
                                placeholder="İl"
                                value={addr.city}
                                onChange={(e) => setAddr({ ...addr, city: e.target.value })}
                            />
                            <input
                                placeholder="İlçe"
                                value={addr.district}
                                onChange={(e) => setAddr({ ...addr, district: e.target.value })}
                            />
                            <input
                                placeholder="Posta Kodu"
                                value={addr.postalCode}
                                onChange={(e) => setAddr({ ...addr, postalCode: e.target.value })}
                            />
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
                            <span>
                Standart ({tl(39.9)}) — {tl(600)}<strong>+ Ücretsiz</strong>
                                {subtotal >= 600 && " (uygulandı)"}
              </span>
                        </label>
                        <label style={radioRow}>
                            <input type="radio" name="ship" checked={shipping === "express"} onChange={() => setShipping("express")} />
                            <span>Ekspres ({tl(79.9)})</span>
                        </label>
                    </section>

                    {/* Card */}
                    <section style={cardBox}>
                        <h3 style={secTitle}>Card Information</h3>

                        <div className="card-form">
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
                                        <div>
                                            {card.expMonth || "MM"}/{card.expYear || "YYYY"}
                                        </div>
                                    </div>
                                </div>
                            </div>

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
                        {(cart || []).map((it, i) => {
                            const imgRaw =
                                it.variantImage ?? it.VariantImage ?? it.imageUrl ?? it.ImageUrl ?? "";
                            const imgSrc = imgRaw.startsWith("http") ? imgRaw : `http://localhost:5011${imgRaw}`;
                            const title =
                                (it.productName ?? it.ProductName) +
                                ((it.variantName ?? it.VariantName) ? ` - ${(it.variantName ?? it.VariantName)}` : "");

                            return (
                                <div key={i} style={{ display: "grid", gridTemplateColumns: "56px 1fr auto", gap: 10, alignItems: "center" }}>
                                    <img
                                        src={imgSrc}
                                        alt=""
                                        style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10, border: "1px solid #f0d8e6" }}
                                        onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/56"; }}
                                    />
                                    <div style={{ fontSize: 13, color: "#333" }}>
                                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{title}</div>
                                        <div style={{ opacity: 0.7 }}>Adet: {it.quantity ?? it.Quantity}</div>
                                    </div>
                                    <div style={{ fontWeight: 700 }}>{tl(it.totalPrice ?? it.TotalPrice ?? 0)}</div>
                                </div>
                            );
                        })}

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

            {/* ✔ Yeni Adres Modalı */}
            {addrModalOpen && (
                <AddressModal
                    initial={null}
                    onClose={() => setAddrModalOpen(false)}
                    onSaved={() => {
                        setAddrModalOpen(false);
                        // listeyi tazelemek için AddressSelect'i remount et
                        setAddrListVersion((n) => n + 1);
                    }}
                />
            )}
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
