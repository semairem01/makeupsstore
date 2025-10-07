import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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
    const token = localStorage.getItem("token");

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [qty, setQty] = useState(1);

    // favori
    const [isFav, setIsFav] = useState(false);
    const [justToggled, setJustToggled] = useState(false);

    // ⭐ review özeti
    const [ratingAvg, setRatingAvg] = useState(0);
    const [ratingCount, setRatingCount] = useState(0);

    // Ürün detayını getir
    useEffect(() => {
        if (!id) {
            setError("Ürün ID bulunamadı");
            setLoading(false);
            return;
        }
        axios
            .get(`http://localhost:5011/api/product/${id}`)
            .then((res) => {
                setProduct(res.data);
                setError(null);
            })
            .catch((err) => {
                if (err.response?.status === 404) setError("Ürün bulunamadı");
                else setError("Ürün yüklenirken bir hata oluştu");
            })
            .finally(() => setLoading(false));
    }, [id]);

    // ⭐ review özetini getir
    useEffect(() => {
        if (!id) return;
        axios
            .get(`${API_ENDPOINTS.REVIEWS}/product/${id}`)
            .then((r) => {
                setRatingAvg(Number(r.data?.average || 0));
                setRatingCount(Number(r.data?.count || 0));
            })
            .catch(() => {});
    }, [id]);

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
                { productId: product.id, quantity: qty },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            onAdded?.(qty);
            alert("Sepete eklendi!");
        } catch (e) {
            alert(e?.response?.data || "Sepete eklenemedi.");
        }
    };

    // 🔹 İndirimli fiyat hesaplama (finalPrice varsa öncelik onda)
    const hasDiscount = Number(product?.discountPercent) > 0;
    const finalNum = product?.finalPrice != null
        ? Number(product.finalPrice)
        : hasDiscount
            ? Number(product.price) * (1 - Number(product.discountPercent) / 100)
            : Number(product?.price || 0);

    const priceOldTL = Number(product?.price || 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
    const priceFinalTL = Number(finalNum).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

    // 🔧 stok
    const stockRaw = product?.stockQuantity ?? product?.StockQuantity;
    const hasStockInfo = typeof stockRaw === "number" && !Number.isNaN(stockRaw);
    const stock = hasStockInfo ? Number(stockRaw) : null;
    const lowStock = hasStockInfo && stock > 0 && stock <= 5;
    const outOfStock = hasStockInfo && stock === 0;

    if (loading) return <div className="pd-wrap"><div className="pd-skel">Yükleniyor…</div></div>;
    if (error) return <div className="pd-wrap"><div className="pd-error">{error}</div></div>;
    if (!product) return null;

    const gallery = [product.imageUrl].filter(Boolean);

    return (
        <div className="pd-wrap">
            <div className="pd-top">
                {/* Galeri */}
                <section className="pd-gallery">
                    <div className="pd-mainimg">
                        <img
                            src={`http://localhost:5011${gallery[0]}`}
                            alt={product.name}
                            onError={(e) => {
                                e.currentTarget.src = "https://via.placeholder.com/600x600?text=Resim+Yok";
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

                    <div className="pd-thumbs">
                        {gallery.map((g, i) => (
                            <img
                                key={i}
                                src={`http://localhost:5011${g}`}
                                alt={`${product.name} küçük ${i + 1}`}
                                onError={(e) => {
                                    e.currentTarget.src = "https://via.placeholder.com/96x96?text=Yok";
                                }}
                            />
                        ))}
                    </div>
                </section>

                {/* Bilgi */}
                <section className="pd-info">
                    <h1 className="pd-title">{product.name}</h1>
                    <div className="pd-brand">{product.brand}</div>
                    <div className="pd-color">{product.color}</div>

                    {/* ⭐ ortalama puan */}
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

                    {/* 💰 Fiyat */}
                    <div className="pd-price">
                        {hasDiscount ? (
                            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#e91e63" }}>
                  {priceFinalTL}
                </span>
                                <span style={{ textDecoration: "line-through", color: "#888" }}>
                  {priceOldTL}
                </span>
                                <span
                                    style={{
                                        background: "#ffe3f1",
                                        color: "#b2206d",
                                        fontWeight: 700,
                                        padding: "4px 8px",
                                        borderRadius: "999px",
                                        fontSize: ".9rem",
                                    }}
                                >
                  %{Number(product.discountPercent)} indirim
                </span>
                            </div>
                        ) : (
                            <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#e91e63" }}>
                {priceOldTL}
              </span>
                        )}
                    </div>

                    {/* stok mesajları */}
                    {lowStock && <div className="pd-stock">Son {stock} ürün!</div>}
                    {outOfStock && <div className="pd-stock pd-stock--out">Stokta yok</div>}

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
                <Reviews productId={product.id} />
            </div>
        </div>
    );
}

function QtyStepper({ value, onChange }) {
    return (
        <div className="qty-stepper" role="group" aria-label="Adet">
            <button className="qty-btn" onClick={() => onChange(Math.max(1, (Number(value) || 1) - 1))} aria-label="Azalt">
                −
            </button>
            <input
                className="qty-input"
                type="number"
                min={1}
                value={value}
                onChange={(e) => onChange(Math.max(1, Number(e.target.value)))}
            />
            <button className="qty-btn" onClick={() => onChange((Number(value) || 1) + 1)} aria-label="Arttır">
                +
            </button>
        </div>
    );
}
