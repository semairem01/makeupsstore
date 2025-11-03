// src/components/CheckoutPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import { useNavigate } from "react-router-dom";
import "./CheckoutPage.css";
import AddressSelect from "./AddressSelect";
import { __INTERNAL__AddressModal as AddressModal } from "./AddressBook";

/* Icons */
const MapPinIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const TruckIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 3h15v13H1z" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
);

export default function CheckoutPage() {
    const token = localStorage.getItem("token");
    const nav = useNavigate();

    const [cart, setCart] = useState([]);
    const [shipping, setShipping] = useState("standard");

    const [selectedAddressId, setSelectedAddressId] = useState(0);
    const [addrListVersion, setAddrListVersion] = useState(0);
    const [addrModalOpen, setAddrModalOpen] = useState(false);

    const [addr, setAddr] = useState({
        fullName: "",
        phone: "",
        city: "",
        district: "",
        postalCode: "",
        addressLine: "",
    });

    const tl = (n) => Number(n || 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

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

    const onAddressPicked = useCallback((obj) => {
        setSelectedAddressId(obj?.id ?? 0);

        if (!obj) {
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

        const line = [obj.street, obj.buildingNo ? `No:${obj.buildingNo}` : null, obj.apartmentNo ? `D:${obj.apartmentNo}` : null]
            .filter(Boolean)
            .join(" ");

        setAddr({
            fullName: obj.fullName || "",
            phone: obj.phone || "",
            city: obj.cityName ?? obj.city ?? "",
            district: obj.districtName ?? obj.district ?? "",
            postalCode: obj.postalCode || "",
            addressLine: line,
        });
    }, []);

    const subtotal = useMemo(() => (cart || []).reduce((s, x) => s + (x.totalPrice ?? x.TotalPrice ?? 0), 0), [cart]);
    const shipBase = shipping === "express" ? 79.9 : 39.9;
    const shippingFee = subtotal >= 600 ? 0 : shipBase;
    const grandTotal = subtotal + shippingFee;

    const validAddress = () =>
        addr.fullName && addr.phone && addr.city && addr.district && addr.postalCode && addr.addressLine;

    const goPayment = () => {
        if (!validAddress()) {
            alert("Lütfen tüm adres bilgilerini doldurun.");
            return;
        }
        nav("/checkout/payment", {
            state: {
                selectedAddressId: selectedAddressId > 0 ? selectedAddressId : null,
                addr,
                shipping,
                shippingFee,
                subtotal,
                grandTotal,
            },
        });
    };

    return (
        <div className="checkout-container">
            {/* Header */}
            <div className="checkout-header">
                <h1>Ödeme</h1>
                <p>Siparişinizi güvenli bir şekilde tamamlayın</p>
            </div>

            <div className="checkout-grid">
                {/* Left Panel */}
                <div>
                    {/* Teslimat Adresi */}
                    <section className="checkout-section">
                        <div className="section-header">
                            <div className="section-icon">
                                <MapPinIcon />
                            </div>
                            <h3>Teslimat Adresi</h3>
                        </div>

                        <div className="address-selector">
                            <AddressSelect
                                key={addrListVersion}
                                value={selectedAddressId}
                                onChange={onAddressPicked}
                                onNew={() => setAddrModalOpen(true)}
                            />
                        </div>

                        <div className="address-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Ad Soyad</label>
                                    <input
                                        type="text"
                                        placeholder="Adınız ve soyadınız"
                                        value={addr.fullName}
                                        onChange={(e) => setAddr({ ...addr, fullName: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Telefon</label>
                                    <input
                                        type="tel"
                                        placeholder="0555 555 55 55"
                                        value={addr.phone}
                                        onChange={(e) => setAddr({ ...addr, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>İl</label>
                                    <input
                                        type="text"
                                        placeholder="İl seçin"
                                        value={addr.city}
                                        onChange={(e) => setAddr({ ...addr, city: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>İlçe</label>
                                    <input
                                        type="text"
                                        placeholder="İlçe seçin"
                                        value={addr.district}
                                        onChange={(e) => setAddr({ ...addr, district: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Posta Kodu</label>
                                    <input
                                        type="text"
                                        placeholder="34000"
                                        value={addr.postalCode}
                                        onChange={(e) => setAddr({ ...addr, postalCode: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Adres</label>
                                <textarea
                                    placeholder="Sokak, mahalle, bina no, daire no..."
                                    rows={3}
                                    value={addr.addressLine}
                                    onChange={(e) => setAddr({ ...addr, addressLine: e.target.value })}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Kargo Seçenekleri */}
                    <section className="checkout-section">
                        <div className="section-header">
                            <div className="section-icon">
                                <TruckIcon />
                            </div>
                            <h3>Kargo Seçenekleri</h3>
                        </div>

                        <div className="shipping-options">
                            <label className={`shipping-option ${shipping === "standard" ? "selected" : ""}`}>
                                <input
                                    type="radio"
                                    name="shipping"
                                    checked={shipping === "standard"}
                                    onChange={() => setShipping("standard")}
                                />
                                <div className="option-content">
                                    <div className="option-header">
                                        <strong>Standart Kargo</strong>
                                        {subtotal >= 600 ? (
                                            <span className="free-badge">Ücretsiz</span>
                                        ) : (
                                            <span className="price">{tl(39.9)}</span>
                                        )}
                                    </div>
                                    <p>3-5 iş günü içinde teslimat • {tl(600)} ve üzeri siparişlerde ücretsiz</p>
                                </div>
                            </label>

                            <label className={`shipping-option ${shipping === "express" ? "selected" : ""}`}>
                                <input
                                    type="radio"
                                    name="shipping"
                                    checked={shipping === "express"}
                                    onChange={() => setShipping("express")}
                                />
                                <div className="option-content">
                                    <div className="option-header">
                                        <strong>Ekspres Kargo</strong>
                                        <span className="price">{tl(79.9)}</span>
                                    </div>
                                    <p>1-2 iş günü içinde hızlı teslimat</p>
                                </div>
                            </label>
                        </div>
                    </section>
                </div>

                {/* Right Panel - Sipariş Özeti */}
                <aside className="checkout-right">
                    <div className="order-summary">
                        <h3>Sipariş Özeti</h3>

                        <div className="summary-items">
                            {(cart || []).map((it, i) => {
                                const imgRaw = it.variantImage ?? it.VariantImage ?? it.imageUrl ?? it.ImageUrl ?? "";
                                const imgSrc = imgRaw?.startsWith?.("http") ? imgRaw : `http://localhost:5011${imgRaw}`;
                                const title =
                                    (it.productName ?? it.ProductName) +
                                    ((it.variantName ?? it.VariantName) ? ` - ${(it.variantName ?? it.VariantName)}` : "");

                                return (
                                    <div key={i} className="summary-item">
                                        <img
                                            src={imgSrc}
                                            alt={title}
                                            onError={(e) => {
                                                e.currentTarget.src = "https://via.placeholder.com/60";
                                            }}
                                        />
                                        <div className="item-details">
                                            <p className="item-title">{title}</p>
                                            <p className="item-quantity">Adet: {it.quantity ?? it.Quantity}</p>
                                        </div>
                                        <div className="item-price">{tl(it.totalPrice ?? it.TotalPrice ?? 0)}</div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="summary-divider"></div>

                        <div className="summary-totals">
                            <div className="total-row">
                                <span>Ara Toplam</span>
                                <span>{tl(subtotal)}</span>
                            </div>
                            <div className="total-row">
                                <span>Kargo ({shipping === "standard" ? "Standart" : "Ekspres"})</span>
                                <span className={shippingFee === 0 ? "free" : ""}>{tl(shippingFee)}</span>
                            </div>
                            <div className="total-row grand-total">
                                <strong>Genel Toplam</strong>
                                <strong>{tl(grandTotal)}</strong>
                            </div>
                        </div>

                        <button className="btn-complete-order" onClick={goPayment} disabled={(cart?.length ?? 0) === 0}>
                            Pay Now
                        </button>
                    </div>
                </aside>
            </div>

            {/* Adres Modal */}
            {addrModalOpen && (
                <AddressModal
                    initial={null}
                    onClose={() => setAddrModalOpen(false)}
                    onSaved={() => {
                        setAddrModalOpen(false);
                        setAddrListVersion((n) => n + 1);
                    }}
                />
            )}
        </div>
    );
}
