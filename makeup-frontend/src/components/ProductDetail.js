import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import Reviews from "./Reviews";
import "./ProductDetail.css";
import "./FavHeart.css";

function Star({ filled }) {
    return <span style={{ color: filled ? "#ffc107" : "#ddd", marginRight: 2 }}>★</span>;
}

export default function ProductDetail({ onAdded }) {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const token = localStorage.getItem("token");

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [qty, setQty] = useState(1);
    const [isFav, setIsFav] = useState(false);
    const [justToggled, setJustToggled] = useState(false);
    const [ratingAvg, setRatingAvg] = useState(0);
    const [ratingCount, setRatingCount] = useState(0);
    const [variant, setVariant] = useState(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const [isZooming, setIsZooming] = useState(false);
    const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

    // Ürünü getir
    useEffect(() => {
        if (!id) {
            setError("Ürün ID bulunamadı");
            setLoading(false);
            return;
        }
        axios
            .get(`http://localhost:5011/api/product/${id}`)
            .then((res) => {
                const p = res.data;
                setProduct(p);
                const def =
                    p?.variants?.find((v) => v.isDefault) ??
                    (Array.isArray(p?.variants) && p.variants.length > 0 ? p.variants[0] : null);
                setVariant(def || null);
                setError(null);
            })
            .catch((err) => {
                if (err.response?.status === 404) setError("Ürün bulunamadı");
                else setError("Ürün yüklenirken bir hata oluştu");
            })
            .finally(() => setLoading(false));
    }, [id]);

    // URL'den variantId oku
    useEffect(() => {
        if (!product?.variants) return;
        const params = new URLSearchParams(location.search);
        const variantIdFromUrl = params.get("variantId");
        if (variantIdFromUrl) {
            const v = product.variants.find((v) => v.id === Number(variantIdFromUrl));
            if (v && v.id !== variant?.id) {
                setVariant(v);
            }
        }
    }, [location.search, product, variant?.id]);

    // Yorum özetini getir
    useEffect(() => {
        if (!id) return;
        const params = new URLSearchParams();
        if (variant?.id) params.set("variantId", String(variant.id));

        axios
            .get(`${API_ENDPOINTS.REVIEWS}/product/${id}?${params.toString()}`)
            .then((r) => {
                setRatingAvg(Number(r.data?.average || 0));
                setRatingCount(Number(r.data?.count || 0));
            })
            .catch(() => {});
    }, [id, variant?.id]);

    // Favori kontrolü
    useEffect(() => {
        if (!token || !id) return;
        axios
            .get(API_ENDPOINTS.FAVORITES, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => {
                const ids = new Set((r.data || []).map((x) => x.productId ?? x.ProductId));
                setIsFav(ids.has(Number(id)));
            })
            .catch(() => {});
    }, [token, id]);

    const toggleFav = async () => {
        if (!token) return alert("Lütfen giriş yapın.");
        try {
            if (isFav) {
                await axios.delete(`${API_ENDPOINTS.FAVORITES}/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setIsFav(false);
            } else {
                await axios.post(`${API_ENDPOINTS.FAVORITES}/${id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
                setIsFav(true);
            }
            setJustToggled(true);
            setTimeout(() => setJustToggled(false), 300);
        } catch {
            alert("Favori işlemi sırasında hata oluştu.");
        }
    };

    const addToCart = async () => {
        if (!token) return alert("Lütfen giriş yapın.");
        try {
            await axios.post(
                "http://localhost:5011/api/cart/add",
                {
                    productId: product.id,
                    variantId: variant?.id ?? null,
                    quantity: qty,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            onAdded?.(qty);
            alert("Sepete eklendi!");
        } catch (e) {
            alert(e?.response?.data || "Sepete eklenemedi.");
        }
    };

    const requestNotify = async () => {
        if (!token) return alert("Lütfen giriş yapın.");
        try {
            await axios.post(API_ENDPOINTS.NOTIFY_PRODUCT(Number(id)), {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Stok gelince haber vereceğiz!");
        } catch (e) {
            alert(e?.response?.data || "Kayıt alınamadı.");
        }
    };
    
    const hasDiscountBase = Number(product?.discountPercent) > 0;
    const priceBase = Number(product?.price || 0);
    const discountBase = Number(product?.discountPercent || 0);

    const priceVar = variant ? Number(variant.price) : null;
    const discountVar = variant ? Number(variant.discountPercent || 0) : null;

    const hasDiscount = variant ? discountVar > 0 : hasDiscountBase;
    const finalNum = variant
        ? (discountVar > 0 ? priceVar * (1 - discountVar / 100) : priceVar)
        : product?.finalPrice != null
            ? Number(product.finalPrice)
            : hasDiscountBase
                ? priceBase * (1 - discountBase / 100)
                : priceBase;

    const priceOldTL = Number(variant ? priceVar : priceBase).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
    const priceFinalTL = Number(finalNum).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

    const stockRaw = variant != null
        ? variant.stockQuantity
        : (product?.stockQuantity ?? product?.StockQuantity);
    const hasStockInfo = typeof stockRaw === "number" && !Number.isNaN(stockRaw);
    const stock = hasStockInfo ? Number(stockRaw) : null;
    const lowStock = hasStockInfo && stock > 0 && stock <= 5;
    const outOfStock = hasStockInfo && stock === 0;

    if (loading) return <div className="pd-wrap"><div className="pd-skel">Yükleniyor…</div></div>;
    if (error) return <div className="pd-wrap"><div className="pd-error">{error}</div></div>;
    if (!product) return null;

    // Galeri
    const vImages = (variant?.images || []).map(i => i.url);
    const pImages = (product?.images || []).filter(i => !i.variantId).map(i => i.url);
    let gallery = variant ? vImages : pImages;
    if (gallery.length === 0 && (variant?.imageUrl || product.imageUrl))
        gallery = [variant?.imageUrl || product.imageUrl];

    const activeImg = gallery[activeIdx] ? `http://localhost:5011${gallery[activeIdx]}` : "https://via.placeholder.com/600x600?text=Yok";

    const handleSelectVariant = (v) => {
        setVariant(v);
        const params = new URLSearchParams(location.search);
        if (v?.id) params.set("variantId", String(v.id));
        else params.delete("variantId");
        navigate({ pathname: location.pathname, search: params.toString() }, { replace: false });
        setActiveIdx(0);
    };

    // Zoom handler
    const handleMouseMove = (e) => {
        if (!isZooming) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setZoomPos({ x, y });
    };

    return (
        <div className="pd-wrap">
            <div className="pd-top">
                {/* ✅ Premium Gallery */}
                <section className="pd-gallery-premium">
                    <div
                        className="pd-mainimg-premium"
                        onMouseEnter={() => setIsZooming(true)}
                        onMouseLeave={() => setIsZooming(false)}
                        onMouseMove={handleMouseMove}
                    >
                        <img
                            src={activeImg}
                            alt={product.name}
                            style={{
                                transform: isZooming ? `scale(1.5)` : 'scale(1)',
                                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                                transition: isZooming ? 'none' : 'transform 0.3s ease'
                            }}
                        />
                        <button
                            className={`fav-btn ${isFav ? "fav-active" : ""} ${justToggled ? "fav-just-toggled" : ""}`}
                            onClick={toggleFav}
                            title={isFav ? "Favoriden kaldır" : "Favoriye ekle"}
                            aria-label={isFav ? "Favoriden kaldır" : "Favoriye ekle"}
                        >
                            <span className="fav-heart">{isFav ? "♥" : "♡"}</span>
                        </button>
                    </div>

                    {gallery.length > 1 && (
                        <div className="pd-thumbs-premium">
                            {gallery.map((g, i) => (
                                <div
                                    key={i}
                                    className={`pd-thumb-premium ${i === activeIdx ? "is-active" : ""}`}
                                    onClick={() => setActiveIdx(i)}
                                >
                                    <img
                                        src={`http://localhost:5011${g}`}
                                        alt={`${product.name} ${i + 1}`}
                                        onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/96x96?text=Yok")}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Bilgi */}
                <section className="pd-info">
                    <h1 className="pd-title">{product.name}</h1>
                    <div className="pd-brand">{product.brand}</div>
                    {variant?.name && <div className="pd-color">{variant.name}</div>}

                    <div className="pd-rating">
                        <div>
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Star key={i} filled={i <= Math.round(ratingAvg)} />
                            ))}
                        </div>
                        <span className="pd-rating-text">
                            {ratingAvg.toFixed(1)} · {ratingCount} yorum
                        </span>
                    </div>

                    {/* Varyant seçimi */}
                    {Array.isArray(product.variants) && product.variants.length > 0 && (
                        <div className="pd-swatches-premium">
                            {product.variants.map((v) => {
                                const active = variant?.id === v.id;
                                return (
                                    <button
                                        key={v.id}
                                        className={`pd-swatch-premium ${active ? "active" : ""}`}
                                        onClick={() => handleSelectVariant(v)}
                                        disabled={!v.isActive}
                                        title={v.name}
                                    >
                                        <div
                                            className="swatch-color"
                                            style={{ background: v.hexColor || '#ddd' }}
                                        />
                                        {v.swatchImageUrl && !v.hexColor && (
                                            <img
                                                src={`http://localhost:5011${v.swatchImageUrl}`}
                                                alt={v.name}
                                                className="swatch-img"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Fiyat */}
                    <div className="pd-price">
                        {hasDiscount ? (
                            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#e91e63" }}>{priceFinalTL}</span>
                                <span style={{ textDecoration: "line-through", color: "#888" }}>{priceOldTL}</span>
                                <span className="discount-badge">
                                    %{Number(variant ? discountVar : product.discountPercent)} indirim
                                </span>
                            </div>
                        ) : (
                            <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#e91e63" }}>
                                {priceOldTL}
                            </span>
                        )}
                    </div>

                    {lowStock && <div className="pd-stock">Son {stock} ürün!</div>}
                    {outOfStock ? (
                        <div className="pd-qtyrow">
                            <button className="pd-notify" onClick={requestNotify} title="Stok gelince haber ver">
                                Notify me
                            </button>
                        </div>
                    ) : (
                        <div className="pd-qtyrow">
                            <QtyStepper value={qty} onChange={setQty} />
                            <button
                                className="pd-addcart"
                                onClick={addToCart}
                                disabled={outOfStock}
                                title={outOfStock ? "Stokta yok" : "Sepete ekle"}
                            >
                                Sepete Ekle
                            </button>
                        </div>
                    )}

                    <div className="pd-desc">
                        <h3>Ürün Açıklaması</h3>
                        <p>{product.description}</p>
                    </div>
                </section>
            </div>

            <div className="pd-tabs">
                <button className="pd-tab active">Yorumlar & Değerlendirmeler</button>
            </div>
            <div className="pd-tabpanel">
                <Reviews productId={product.id} variantId={variant?.id ?? null} />
            </div>
        </div>
    );
}

function QtyStepper({ value, onChange }) {
    return (
        <div className="qty-stepper" role="group" aria-label="Adet">
            <button className="qty-btn" onClick={() => onChange(Math.max(1, (Number(value) || 1) - 1))} aria-label="Azalt">−</button>
            <input
                className="qty-input"
                type="number"
                min={1}
                value={value}
                onChange={(e) => onChange(Math.max(1, Number(e.target.value)))}
            />
            <button className="qty-btn" onClick={() => onChange((Number(value) || 1) + 1)} aria-label="Arttır">+</button>
        </div>
    );
}