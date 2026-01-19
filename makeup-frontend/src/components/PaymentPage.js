// src/components/PaymentPage.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import "./CheckoutPage.css";

// 📱 PaymentPage Mobile Premium Styles (CheckoutPage.css'i bozmadan)
const paymentMobileStyles = `
@media (max-width: 768px) {
    /* Kart - daha kompakt */
    .pm-card {
        height: 170px !important;
        margin-bottom: 16px !important;
    }
    
    .pm-card-face {
        padding: 16px 18px !important;
    }
    
    .pm-card-number {
        font-size: 1.15rem !important;
        margin: 6px 0 8px !important;
    }
    
    .pm-card-chip {
        width: 40px !important;
        height: 26px !important;
        margin-bottom: 12px !important;
    }
    
    .pm-card-footer-info .value {
        font-size: 0.8rem !important;
    }
    
    .pm-card-footer-info label {
        font-size: 0.65rem !important;
    }
    
    /* Form inputları - daha kompakt */
    .card-form-inputs {
        gap: 10px !important;
    }
    
    .card-form-inputs .form-group input {
        padding: 11px 14px !important;
        font-size: 15px !important;
    }
    
    /* Ay/Yıl/CVV satırı - mobilde grid layout */
    .card-form-inputs .form-row {
        display: grid !important;
        grid-template-columns: 1fr 1fr 1fr !important;
        gap: 8px !important;
    }
    
    /* Taksit seçenekleri - ultra kompakt */
    .installment-options {
        gap: 8px !important;
    }
    
    .installment-option {
        padding: 12px 14px !important;
        border-radius: 10px !important;
    }
    
    .installment-option .option-header {
        gap: 4px !important;
    }
    
    .installment-option .option-header strong {
        font-size: 14px !important;
    }
    
    .installment-option .option-header .price {
        font-size: 15px !important;
    }
    
    .installment-option .option-content p {
        font-size: 12px !important;
        line-height: 1.3 !important;
    }
    
    /* Security badge - küçük */
    .security-badge {
        padding: 8px !important;
        font-size: 12px !important;
        margin-top: 10px !important;
    }
    
    /* Section spacing - daha sıkı */
    .checkout-section {
        padding: 16px 14px !important;
        margin-bottom: 12px !important;
    }
    
    .section-header {
        margin-bottom: 14px !important;
        padding-bottom: 10px !important;
    }
    
    .section-icon {
        width: 32px !important;
        height: 32px !important;
    }
    
    .section-header h3 {
        font-size: 1.05rem !important;
    }
}

@media (max-width: 480px) {
    /* Ekstra küçük ekranlar */
    .pm-card {
        height: 155px !important;
        max-width: 100% !important;
    }
    
    .pm-card-number {
        font-size: 1.05rem !important;
        letter-spacing: 1px !important;
    }
    
    .installment-option {
        padding: 10px 12px !important;
    }
    
    .installment-option .option-header strong {
        font-size: 13px !important;
    }
    
    .installment-option .option-header .price {
        font-size: 14px !important;
    }
}
`;

const CreditCardIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
);

const ShieldCheckIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
    </svg>
);

export default function PaymentPage() {
    const token = localStorage.getItem("token");
    const nav = useNavigate();
    const { state } = useLocation() || {};
    const { selectedAddressId, addr, shipping, shippingFee, subtotal, grandTotal, discount } = state || {};

    const [flipped, setFlipped] = useState(false);
    const [card, setCard] = useState({
        cardNumber: "",
        expMonth: "",
        expYear: "",
        cvv: "",
        nameOnCard: "",
    });
    const [submitting, setSubmitting] = useState(false);

    // ✅ Taksit state'leri
    const [installmentOptions, setInstallmentOptions] = useState([]);
    const [selectedInstallment, setSelectedInstallment] = useState(1);

    // 📱 Mobile styles'ı head'e ekle
    useEffect(() => {
        const styleEl = document.createElement('style');
        styleEl.id = 'payment-mobile-styles';
        styleEl.textContent = paymentMobileStyles;
        document.head.appendChild(styleEl);

        return () => {
            const el = document.getElementById('payment-mobile-styles');
            if (el) el.remove();
        };
    }, []);

    // State yoksa checkout'a yönlendir
    useEffect(() => {
        if (!state) {
            nav("/checkout", { replace: true });
        }
    }, [state, nav]);

    // ✅ Taksit seçeneklerini yükle - discount code ile
    useEffect(() => {
        if (!token || !state) return;

        const params = discount?.code ? { discountCode: discount.code } : {};

        axios.get(`${API_ENDPOINTS.PAYMENT}/installment-options`, {
            headers: { Authorization: `Bearer ${token}` },
            params
        })
            .then(r => {
                setInstallmentOptions(r.data || []);
            })
            .catch(err => {
                console.error("Taksit seçenekleri yüklenemedi:", err);
            });
    }, [token, state, discount]);

    const tl = (n) => Number(n || 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

    const formatCardNumber = (raw) =>
        raw.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

    const pay = async () => {
        const rawCard = (card.cardNumber || "").replace(/\s+/g, "");
        if (!card.nameOnCard || rawCard.length < 12 || card.cvv.length < 3 || !card.expMonth || !card.expYear) {
            alert("Kart bilgilerini eksiksiz girin.");
            return;
        }
        setSubmitting(true);
        try {
            // ✅ Taksit bilgisini gönder
            const payRes = await axios.post(
                `${API_ENDPOINTS.PAYMENT}/simulate`,
                {
                    cardNumber: rawCard,
                    expMonth: parseInt(card.expMonth) || 0,
                    expYear: parseInt(card.expYear) || 0,
                    cvv: card.cvv,
                    nameOnCard: card.nameOnCard,
                    shippingFee,
                    installments: selectedInstallment
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!payRes.data?.success) {
                alert(payRes.data?.message || "Ödeme reddedildi.");
                return;
            }

            // ✅ Discount bilgisini checkout'a gönder
            const checkoutPayload = {
                shippingFee,
                shippingMethod: shipping,
                addressId: selectedAddressId ?? null
            };

            // ✅ Eğer discount varsa ekle
            if (discount) {
                checkoutPayload.discountCode = discount.code;
                checkoutPayload.discountAmount = discount.amount;
                checkoutPayload.discountPercentage = discount.percentage;

                console.log('💳 Sending discount to backend:', {
                    code: discount.code,
                    amount: discount.amount,
                    percentage: discount.percentage
                });
            }

            const orderRes = await axios.post(
                `${API_ENDPOINTS.ORDERS}/checkout`,
                checkoutPayload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (orderRes.data?.success === false) {
                alert(orderRes.data?.message || "Sipariş oluşturulamadı.");
                return;
            }

            // ✅ Sipariş başarılı - discount kullanıldı, localStorage'dan temizle
            if (discount) {
                localStorage.removeItem('lunaraDiscount');
                console.log('🗑️ Discount used and removed from localStorage');
            }

            nav("/orders");
        } catch (e) {
            alert(e?.response?.data || "Ödeme/sipariş sırasında bir hata oluştu.");
        } finally {
            setSubmitting(false);
        }
    };

    // State yoksa kısa devre
    if (!state) return null;

    const displayNumber = card.cardNumber || "•••• •••• •••• ••••";
    const displayName = card.nameOnCard || "AD SOYAD";
    const displayExp =
        (card.expMonth ? String(card.expMonth).padStart(2, "0") : "MM") +
        "/" +
        (card.expYear || "YYYY");

    // ✅ Seçili taksit bilgisi - grandTotal üzerinden hesapla
    const selectedOption = installmentOptions.find(
        opt => opt.installments === selectedInstallment
    );

    // ✅ Taksit hesaplamasını grandTotal (discount düşülmüş) üzerinden yap
    const baseTotal = grandTotal; // Zaten discount düşülmüş
    const installmentRate = selectedOption?.installmentRate || 0;
    const displayTotal = baseTotal * (1 + installmentRate);
    const monthlyPayment = selectedInstallment > 1 ? displayTotal / selectedInstallment : displayTotal;

    console.log("📊 Payment Debug:", {
        optionsCount: installmentOptions.length,
        selectedInstallment,
        selectedOption,
        subtotal,
        discountAmount: discount?.amount || 0,
        grandTotal,
        baseTotal: grandTotal,
        displayTotal,
        monthlyPayment,
        hasDiscount: !!discount,
        discount
    });

    return (
        <div className="checkout-container">
            <div className="checkout-header">
                <h1>Ödeme Bilgileri</h1>
                <p>Kart bilgilerinizi girip ödemenizi tamamlayın</p>
            </div>

            <div className="checkout-grid">
                <div>
                    {/* Kart Bilgileri */}
                    <section className="checkout-section">
                        <div className="section-header">
                            <div className="section-icon"><CreditCardIcon /></div>
                            <h3>Kart Bilgileri</h3>
                        </div>

                        {/* 💳 Kart önizleme */}
                        <div
                            className="pm-card"
                            tabIndex={0}
                            onMouseEnter={() => setFlipped(true)}
                            onMouseLeave={() => setFlipped(false)}
                            onClick={() => setFlipped((f) => !f)}
                            onFocus={() => setFlipped(true)}
                            onBlur={() => setFlipped(false)}
                        >
                            <div
                                className="pm-card-inner"
                                style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
                            >
                                {/* FRONT */}
                                <div className="pm-card-face pm-card-front">
                                    <div className="pm-card-chip"></div>
                                    <div className="pm-card-number">{displayNumber}</div>
                                    <div className="pm-card-footer-info">
                                        <div>
                                            <label>Kart Sahibi</label>
                                            <div className="value">{displayName}</div>
                                        </div>
                                        <div>
                                            <label>Son Kullanma</label>
                                            <div className="value">{displayExp}</div>
                                        </div>
                                    </div>
                                    <div className="pm-card-hologram"></div>
                                </div>

                                {/* BACK */}
                                <div className="pm-card-face pm-card-back">
                                    <div className="pm-card-stripe"></div>
                                    <div className="pm-card-cvv-label">CVV</div>
                                    <div className="pm-card-cvv-box">{card.cvv || "***"}</div>
                                </div>
                            </div>
                        </div>

                        {/* 📄 Form */}
                        <div className="card-form-inputs">
                            <div className="form-group">
                                <label>Kart Üzerindeki İsim</label>
                                <input
                                    type="text"
                                    placeholder="AD SOYAD"
                                    autoComplete="cc-name"
                                    value={card.nameOnCard}
                                    onChange={(e) => setCard({ ...card, nameOnCard: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Kart Numarası</label>
                                <input
                                    type="text"
                                    placeholder="1234 5678 9012 3456"
                                    inputMode="numeric"
                                    autoComplete="cc-number"
                                    value={card.cardNumber}
                                    onChange={(e) => setCard({ ...card, cardNumber: formatCardNumber(e.target.value) })}
                                    maxLength={19}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Ay</label>
                                    <input
                                        type="text"
                                        placeholder="MM"
                                        inputMode="numeric"
                                        autoComplete="cc-exp-month"
                                        value={card.expMonth}
                                        onChange={(e) =>
                                            setCard({ ...card, expMonth: e.target.value.replace(/\D/g, "").slice(0, 2) })
                                        }
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Yıl</label>
                                    <input
                                        type="text"
                                        placeholder="YYYY"
                                        inputMode="numeric"
                                        autoComplete="cc-exp-year"
                                        value={card.expYear}
                                        onChange={(e) =>
                                            setCard({ ...card, expYear: e.target.value.replace(/\D/g, "").slice(0, 4) })
                                        }
                                    />
                                </div>
                                <div className="form-group">
                                    <label>CVV</label>
                                    <input
                                        type="password"
                                        placeholder="***"
                                        inputMode="numeric"
                                        autoComplete="cc-csc"
                                        maxLength={3}
                                        value={card.cvv}
                                        onFocus={() => setFlipped(true)}
                                        onBlur={() => setFlipped(false)}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, "").slice(0, 3);
                                            setCard({ ...card, cvv: value });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="security-badge">
                            <ShieldCheckIcon /> 256-bit SSL güvenli ödeme
                        </div>
                    </section>

                    {/* ✅ Taksit Seçenekleri */}
                    {installmentOptions.length > 0 && (
                        <section className="checkout-section">
                            <div className="section-header">
                                <div className="section-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                                        <path d="M7 15h0M2 9.5h20"/>
                                    </svg>
                                </div>
                                <h3>Taksit Seçenekleri</h3>
                            </div>

                            <div className="installment-options">
                                {installmentOptions.map((opt) => (
                                    <label
                                        key={opt.installments}
                                        className={`installment-option ${selectedInstallment === opt.installments ? "selected" : ""}`}
                                    >
                                        <input
                                            type="radio"
                                            name="installment"
                                            checked={selectedInstallment === opt.installments}
                                            onChange={() => setSelectedInstallment(opt.installments)}
                                        />
                                        <div className="option-content">
                                            <div className="option-header">
                                                <strong>
                                                    {opt.installments === 1
                                                        ? "Peşin"
                                                        : `${opt.installments} Taksit`}
                                                </strong>
                                                <span className="price">
                                                    {opt.installments === 1
                                                        ? tl(opt.totalAmount)
                                                        : `${opt.installments} × ${tl(opt.installmentAmount)}`}
                                                </span>
                                            </div>
                                            <p>
                                                {opt.installmentRate > 0
                                                    ? `Toplam: ${tl(opt.totalAmount)} (Faiz: %${(opt.installmentRate * 100).toFixed(0)})`
                                                    : "Faizsiz ödeme"}
                                            </p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Sağ Panel - Özet */}
                <aside className="checkout-right">
                    <div className="order-summary">
                        <h3>Özet</h3>
                        <div className="summary-totals">
                            <div className="total-row">
                                <span>Ara Toplam</span>
                                <span>{tl(subtotal)}</span>
                            </div>

                            {/* ✅ Discount satırı */}
                            {discount && discount.amount > 0 && (
                                <div className="total-row" style={{ color: '#d946ef' }}>
                                    <span>🌙 {discount.code} ({discount.percentage}%)</span>
                                    <span>-{tl(discount.amount)}</span>
                                </div>
                            )}

                            <div className="total-row">
                                <span>Kargo ({shipping === "standard" ? "Standart" : "Ekspres"})</span>
                                <span className={shippingFee === 0 ? "free" : ""}>{tl(shippingFee)}</span>
                            </div>

                            {selectedOption && installmentRate > 0 && (
                                <div className="total-row">
                                    <span>Taksit Faizi (%{(installmentRate * 100).toFixed(0)})</span>
                                    <span>{tl(displayTotal - grandTotal)}</span>
                                </div>
                            )}

                            <div className="total-row grand-total">
                                <strong>Genel Toplam</strong>
                                <strong>{tl(displayTotal)}</strong>
                            </div>

                            {selectedInstallment > 1 && (
                                <div className="total-row" style={{color: "#f1798a", fontSize: "1.1rem", marginTop: "8px"}}>
                                    <strong>Aylık Ödeme</strong>
                                    <strong>{tl(monthlyPayment)}</strong>
                                </div>
                            )}
                        </div>

                        <button className="btn-complete-order" onClick={pay} disabled={submitting}>
                            {submitting ? (
                                <>
                                    <span className="spinner"></span> İşleniyor...
                                </>
                            ) : (
                                <>
                                    <ShieldCheckIcon /> Ödemeyi Tamamla
                                </>
                            )}
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
}