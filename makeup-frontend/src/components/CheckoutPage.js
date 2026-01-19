// src/components/CheckoutPage.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import axios from "axios";
import { API_ENDPOINTS, API_BASE_URL } from "../config";
import { useNavigate } from "react-router-dom";
import Toast from "./Toast";
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
const GiftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
);

export default function CheckoutPage() {
    const token = localStorage.getItem("token");
    const nav = useNavigate();

    const [cart, setCart] = useState([]);
    const [shipping, setShipping] = useState("standard");
    const [toast, setToast] = useState(null);

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

    const [discount, setDiscount] = useState(null);
    const [discountApplied, setDiscountApplied] = useState(false);
    const [suggestedProducts, setSuggestedProducts] = useState([]);
    const [previewProduct, setPreviewProduct] = useState(null);

    const FREE_SHIPPING_THRESHOLD = 1500;
    const STANDARD_SHIPPING_PRICE = 39.9;
    const EXPRESS_SHIPPING_PRICE = 79.9;

    const tl = (n) => Number(n || 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const subtotal = useMemo(
        () => (cart || []).reduce((s, x) => s + (x.totalPrice ?? x.TotalPrice ?? 0), 0),
        [cart]
    );

    // ✅ Login kontrolü ve guest cart sync
    useEffect(() => {
        if (!token) {
            showToast('Please sign in to continue checkout', 'warning');
            setTimeout(() => {
                nav('/login', { state: { from: '/checkout' } });
            }, 1500);
            return;
        }

        // Guest cart'ı DB'ye sync et
        const syncGuestCart = async () => {
            const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]');

            if (guestCart.length > 0) {
                try {
                    await axios.post(
                        `${API_ENDPOINTS.CART}/sync`,
                        guestCart.map(item => ({
                            productId: item.productId,
                            variantId: item.variantId,
                            quantity: item.quantity
                        })),
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    localStorage.removeItem('guestCart');
                    console.log('✅ Guest cart synced to database');
                    showToast('Your cart has been synced!', 'success');
                } catch (error) {
                    console.error('Cart sync error:', error);
                }
            }
        };

        syncGuestCart();
    }, [token, nav]);

    // ✅ Sepeti ve indirimi yükle
    useEffect(() => {
        if (!token) return;

        axios
            .get(API_ENDPOINTS.CART, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => setCart(r.data || []))
            .catch(() => setCart([]));

        const savedDiscount = localStorage.getItem('lunaraDiscount');
        if (savedDiscount) {
            try {
                const discountData = JSON.parse(savedDiscount);
                console.log('💎 Loaded discount in checkout:', discountData);
                setDiscount(discountData);
                setDiscountApplied(true);
            } catch (e) {
                console.error('Invalid discount data:', e);
                localStorage.removeItem('lunaraDiscount');
            }
        }
    }, [token]);

    // ✅ Ücretsiz kargo için önerilen ürünler
    useEffect(() => {
        if (subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0) {
            setSuggestedProducts([]);
            return;
        }
        const remainingAmount = FREE_SHIPPING_THRESHOLD - subtotal;
        axios
            .get(API_ENDPOINTS.PRODUCT_SUGGESTIONS_FOR_SHIPPING, {
                params: { maxPrice: remainingAmount, limit: 12 },
            })
            .then((res) => setSuggestedProducts(res.data || []))
            .catch((err) => {
                console.error("suggestions error:", err);
                setSuggestedProducts([]);
            });
    }, [subtotal]);

    const onAddressPicked = useCallback((obj) => {
        setSelectedAddressId(obj?.id ?? 0);
        if (!obj) {
            setAddr({ fullName: "", phone: "", city: "", district: "", postalCode: "", addressLine: "" });
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

    const calculateShippingFee = () => {
        if (subtotal >= FREE_SHIPPING_THRESHOLD) return shipping === "express" ? EXPRESS_SHIPPING_PRICE : 0;
        return shipping === "express" ? EXPRESS_SHIPPING_PRICE : STANDARD_SHIPPING_PRICE;
    };

    const discountAmount = useMemo(() => {
        if (!discount || !discountApplied) return 0;

        const minAmount = discount.minimumOrderAmount ||
            parseFloat(discount.condition?.match(/[\d,]+/)?.[0]?.replace(',', '') || '0');

        if (subtotal < minAmount) {
            console.log(`⚠️ Subtotal ${subtotal} is less than minimum ${minAmount}`);
            return 0;
        }

        const amount = (subtotal * discount.value) / 100;
        console.log(`✅ Discount applied: ${discount.value}% = ${amount}`);
        return amount;
    }, [discount, discountApplied, subtotal]);

    const shippingFee = calculateShippingFee();
    const grandTotal = subtotal - discountAmount + shippingFee;

    const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
    const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
    const isFreeShippingEligible = subtotal >= FREE_SHIPPING_THRESHOLD;

    const validAddress = () =>
        addr.fullName && addr.phone && addr.city && addr.district && addr.postalCode && addr.addressLine;

    const goPayment = () => {
        if (!validAddress()) {
            showToast('Please fill in all address fields', 'warning');
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
                discount: discountApplied && discount ? {
                    code: discount.code,
                    amount: discountAmount,
                    percentage: discount.value
                } : null
            },
        });
    };

    const removeDiscount = () => {
        setDiscountApplied(false);
        setDiscount(null);
        localStorage.removeItem('lunaraDiscount');
        showToast('Discount removed', 'info');
    };

    const addSuggestionToCart = async (product) => {
        if (!token) {
            showToast('Please sign in to add to cart', 'warning');
            return;
        }
        try {
            const price =
                (product.discountPercent ?? 0) > 0 ? product.price * (1 - product.discountPercent / 100) : product.price;

            await axios.post(
                `${API_ENDPOINTS.CART}/add`,
                { productId: product.id, quantity: 1, unitPrice: price },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const cartRes = await axios.get(API_ENDPOINTS.CART, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCart(cartRes.data || []);
            showToast(`${product.name} added to cart!`, 'success');
        } catch (e) {
            showToast(e?.response?.data || "Could not add to cart", 'error');
        }
    };

    return (
        <div className="checkout-container">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Header */}
            <div className="checkout-header">
                <h1>Checkout</h1>
                <p>Complete your order securely</p>
            </div>

            <div className="checkout-grid">
                {/* Left Panel */}
                <div>
                    {/* Delivery Address */}
                    <section className="checkout-section">
                        <div className="section-header">
                            <div className="section-icon">
                                <MapPinIcon />
                            </div>
                            <h3>Delivery Address</h3>
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
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="Your full name"
                                        value={addr.fullName}
                                        onChange={(e) => setAddr({ ...addr, fullName: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
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
                                    <label>City</label>
                                    <input
                                        type="text"
                                        placeholder="Select city"
                                        value={addr.city}
                                        onChange={(e) => setAddr({ ...addr, city: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>District</label>
                                    <input
                                        type="text"
                                        placeholder="Select district"
                                        value={addr.district}
                                        onChange={(e) => setAddr({ ...addr, district: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Postal Code</label>
                                    <input
                                        type="text"
                                        placeholder="34000"
                                        value={addr.postalCode}
                                        onChange={(e) => setAddr({ ...addr, postalCode: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Address</label>
                                <textarea
                                    placeholder="Street, neighborhood, building no, apartment no..."
                                    rows={3}
                                    value={addr.addressLine}
                                    onChange={(e) => setAddr({ ...addr, addressLine: e.target.value })}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Discount Display */}
                    {discount && discountApplied && (
                        <section className="checkout-section" style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '32px' }}>🌙</span>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
                                            {discount.name}
                                        </div>
                                        <div style={{ opacity: 0.9, fontSize: '14px' }}>
                                            {discount.value}% discount • {discount.condition}
                                        </div>
                                        {discountAmount > 0 ? (
                                            <div style={{ marginTop: '4px', fontWeight: 'bold', fontSize: '16px' }}>
                                                💰 Saving: {tl(discountAmount)}
                                            </div>
                                        ) : (
                                            <div style={{ marginTop: '4px', fontSize: '14px', opacity: 0.9 }}>
                                                ⚠️ Add {tl(parseFloat(discount.condition?.match(/[\d,]+/)?.[0]?.replace(',', '') || '0') - subtotal)} more to activate
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={removeDiscount}
                                    style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        color: 'white',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    Remove
                                </button>
                            </div>
                        </section>
                    )}

                    {/* Free Shipping Progress Banner */}
                    {!isFreeShippingEligible && (
                        <section className="checkout-section free-shipping-banner">
                            <div className="free-shipping-content">
                                <div className="banner-icon">
                                    <GiftIcon />
                                </div>
                                <div className="banner-text">
                                    <strong>You're close to FREE Standard Shipping!</strong>
                                    <p>
                                        Add <span className="highlight">{tl(remainingForFreeShipping)}</span> more to your cart and get
                                        standard shipping for free!
                                    </p>
                                </div>
                            </div>
                            <div className="progress-bar-container">
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${freeShippingProgress}%` }} />
                                </div>
                                <div className="progress-labels">
                                    <span>{tl(subtotal)}</span>
                                    <span>{tl(FREE_SHIPPING_THRESHOLD)}</span>
                                </div>
                            </div>

                            {suggestedProducts.length > 0 && (
                                <div className="suggested-products">
                                    <h4>Quick picks to reach free shipping:</h4>
                                    <SuggestedProductsCarousel
                                        products={suggestedProducts}
                                        onAdd={(p) => addSuggestionToCart(p)}
                                        onPreview={(p) => setPreviewProduct(p)}
                                        tl={tl}
                                    />
                                </div>
                            )}
                        </section>
                    )}

                    {isFreeShippingEligible && (
                        <section className="checkout-section free-shipping-success">
                            <div className="success-icon">🎉</div>
                            <div className="success-text">
                                <strong>Congratulations! Free Standard Shipping</strong>
                                <p>Your order is over {tl(FREE_SHIPPING_THRESHOLD)}, so standard shipping is free!</p>
                            </div>
                        </section>
                    )}

                    {/* Shipping Options */}
                    <section className="checkout-section">
                        <div className="section-header">
                            <div className="section-icon">
                                <TruckIcon />
                            </div>
                            <h3>Shipping Options</h3>
                        </div>

                        <div className="shipping-options">
                            <label className={`shipping-option ${shipping === "standard" ? "selected" : ""}`}>
                                <input type="radio" name="shipping" checked={shipping === "standard"} onChange={() => setShipping("standard")} />
                                <div className="option-content">
                                    <div className="option-header">
                                        <strong>Standard Shipping</strong>
                                        {isFreeShippingEligible ? <span className="free-badge">Free</span> : <span className="price">{tl(STANDARD_SHIPPING_PRICE)}</span>}
                                    </div>
                                    <p>
                                        Delivery within 3-5 business days
                                        {!isFreeShippingEligible && ` • Free on orders over ${tl(FREE_SHIPPING_THRESHOLD)}`}
                                    </p>
                                </div>
                            </label>

                            <label className={`shipping-option ${shipping === "express" ? "selected" : ""}`}>
                                <input type="radio" name="shipping" checked={shipping === "express"} onChange={() => setShipping("express")} />
                                <div className="option-content">
                                    <div className="option-header">
                                        <strong>Express Shipping ⚡</strong>
                                        <span className="price">{tl(EXPRESS_SHIPPING_PRICE)}</span>
                                    </div>
                                    <p>Fast delivery within 1-2 business days • Premium service</p>
                                </div>
                            </label>
                        </div>
                    </section>
                </div>

                {/* Right Panel - Order Summary */}
                <aside className="checkout-right">
                    <div className="order-summary">
                        <h3>Order Summary</h3>

                        <div className="summary-items">
                            {(cart || []).map((it, i) => {
                                const imgRaw = it.variantImage ?? it.VariantImage ?? it.imageUrl ?? it.ImageUrl ?? "";
                                const imgSrc = imgRaw?.startsWith?.("http") ? imgRaw : `${API_BASE_URL}${imgRaw}`;
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
                                            <p className="item-quantity">Qty: {it.quantity ?? it.Quantity}</p>
                                        </div>
                                        <div className="item-price">{tl(it.totalPrice ?? it.TotalPrice ?? 0)}</div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="summary-divider"></div>

                        <div className="summary-totals">
                            <div className="total-row">
                                <span>Subtotal</span>
                                <span>{tl(subtotal)}</span>
                            </div>
                            {discountApplied && discountAmount > 0 && (
                                <div className="total-row" style={{ color: '#d946ef' }}>
                                    <span>🌙 {discount.name} ({discount.value}%)</span>
                                    <span>-{tl(discountAmount)}</span>
                                </div>
                            )}
                            <div className="total-row">
                                <span>Shipping ({shipping === "standard" ? "Standard" : "Express"})</span>
                                <span className={shippingFee === 0 ? "free" : ""}>{tl(shippingFee)}</span>
                            </div>
                            <div className="total-row grand-total">
                                <strong>Grand Total</strong>
                                <strong>{tl(grandTotal)}</strong>
                            </div>
                        </div>

                        <button className="btn-complete-order" onClick={goPayment} disabled={(cart?.length ?? 0) === 0}>
                            Proceed to Payment
                        </button>
                    </div>
                </aside>
            </div>

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

            {previewProduct && (
                <ProductQuickView
                    product={previewProduct}
                    tl={tl}
                    onAdd={() => addSuggestionToCart(previewProduct)}
                    onClose={() => setPreviewProduct(null)}
                />
            )}
        </div>
    );
}

function SuggestedProductsCarousel({ products, onAdd, onPreview, tl }) {
    const railRef = useRef(null);

    const scrollByStep = (dir = 1) => {
        const rail = railRef.current;
        if (!rail) return;
        const card = rail.querySelector(".suggestion-card");
        const cardWidth = card ? card.getBoundingClientRect().width : 260;
        const gap = 12;
        const step = cardWidth * 3 + gap * 2;
        rail.scrollBy({ left: dir * step, behavior: "smooth" });
    };

    return (
        <div className="suggestions-carousel">
            <button type="button" className="suggestions-nav left" aria-label="Scroll left" onClick={() => scrollByStep(-1)}>
                ‹
            </button>

            <div className="suggestions-viewport">
                <div className="suggestions-rail" ref={railRef}>
                    {products.map((product) => {
                        const imgRaw = product.imageUrl || "";
                        const imgSrc = imgRaw.startsWith("http") ? imgRaw : `${API_BASE_URL}${imgRaw}`;
                        const hasDiscount = (product.discountPercent || 0) > 0;
                        const finalPrice = hasDiscount ? product.price * (1 - product.discountPercent / 100) : product.price;

                        return (
                            <div key={product.id} className="suggestion-card">
                                <button
                                    type="button"
                                    className="suggestion-media"
                                    onClick={() => onPreview(product)}
                                    title="View quick details"
                                >
                                    <img
                                        src={imgSrc}
                                        alt={product.name}
                                        onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/300x220?text=No+Image")}
                                    />
                                </button>

                                <button
                                    type="button"
                                    className="suggestion-name"
                                    title={product.name}
                                    onClick={() => onPreview(product)}
                                >
                                    {product.name}
                                </button>

                                <div className="suggestion-price">
                                    {hasDiscount ? (
                                        <>
                                            <span className="final">{tl(finalPrice)}</span>
                                            <span className="original">{tl(product.price)}</span>
                                        </>
                                    ) : (
                                        <span className="final">{tl(product.price)}</span>
                                    )}
                                </div>

                                <button
                                    className="btn-add-suggestion"
                                    onClick={() => onAdd(product)}
                                    aria-label={`Add ${product.name} to cart`}
                                    title="Add to cart"
                                >
                                    +
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <button type="button" className="suggestions-nav right" aria-label="Scroll right" onClick={() => scrollByStep(1)}>
                ›
            </button>
        </div>
    );
}

function ProductQuickView({ product, tl, onAdd, onClose }) {
    const imgRaw = product?.imageUrl || "";
    const imgSrc = imgRaw.startsWith("http") ? imgRaw : `${API_BASE_URL}${imgRaw}`;
    const hasDiscount = (product?.discountPercent || 0) > 0;
    const finalPrice = hasDiscount ? product.price * (1 - product.discountPercent / 100) : product.price;

    return (
        <div className="qv-overlay" onClick={onClose}>
            <div className="qv-modal" onClick={(e) => e.stopPropagation()}>
                <button className="qv-close" onClick={onClose} aria-label="Close">×</button>

                <div className="qv-grid">
                    <div className="qv-media">
                        <img
                            src={imgSrc}
                            alt={product?.name}
                            onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/600x400?text=No+Image")}
                        />
                    </div>

                    <div className="qv-info">
                        <h3 className="qv-title">{product?.name}</h3>
                        <div className="qv-price">
                            {hasDiscount ? (
                                <>
                                    <span className="final">{tl(finalPrice)}</span>
                                    <span className="original">{tl(product.price)}</span>
                                </>
                            ) : (
                                <span className="final">{tl(product.price)}</span>
                            )}
                        </div>

                        {product?.shortDescription && (
                            <p className="qv-desc">{product.shortDescription}</p>
                        )}

                        <div className="qv-actions">
                            <button className="btn-add-suggestion" onClick={onAdd}>Add to cart</button>
                            <button className="btn-secondary-outline" onClick={onClose}>Close</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}