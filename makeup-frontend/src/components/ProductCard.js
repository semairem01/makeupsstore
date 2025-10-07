import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_ENDPOINTS } from "../config";

function Stars({ value }) {
    const rounded = Math.round(Number(value || 0));
    return (
        <div className="stars" aria-label={`Rating ${value?.toFixed?.(1) || "0.0"}`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={i <= rounded ? "on" : ""}>★</span>
            ))}
        </div>
    );
}

export default function ProductCard({ product, onAdded }) {
    const token = localStorage.getItem("token");
    const [avg, setAvg] = useState(0);
    const [count, setCount] = useState(0);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        let ignore = false;
        axios
            .get(`${API_ENDPOINTS.REVIEWS}/product/${product.id}`)
            .then((r) => {
                if (ignore) return;
                setAvg(Number(r.data?.average || 0));
                setCount(Number(r.data?.count || 0));
            })
            .catch(() => {});
        return () => { ignore = true; };
    }, [product.id]);

    // 📦 Stok kontrolü
    const stockRaw = product?.stockQuantity ?? product?.StockQuantity;
    const hasStockInfo = typeof stockRaw === "number" && !Number.isNaN(stockRaw);
    const isOut = product?.isActive === false || (hasStockInfo && Number(stockRaw) <= 0);

    // 💰 İNDİRİM hesaplama (DTO’da finalPrice varsa onu kullan)
    const hasDiscount = Number(product?.discountPercent) > 0;
    const finalNum =
        product?.finalPrice != null
            ? Number(product.finalPrice)
            : hasDiscount
                ? Number(product.price) * (1 - Number(product.discountPercent) / 100)
                : Number(product?.price || 0);

    const priceOldTL = useMemo(
        () => Number(product?.price || 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" }),
        [product]
    );
    const priceFinalTL = useMemo(
        () => Number(finalNum).toLocaleString("tr-TR", { style: "currency", currency: "TRY" }),
        [finalNum]
    );

    const addToCart = async () => {
        if (!token) return alert("Please sign in to add to cart.");
        if (isOut)   return alert("This item is out of stock.");
        try {
            setAdding(true);
            // 🧾 Sepete her zaman satış fiyatını gönder (finalPrice/discount’a göre)
            await axios.post(
                `${API_ENDPOINTS.CART}/add`,
                { productId: product.id, quantity: 1, unitPrice: finalNum },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            onAdded?.(1);
        } catch (e) {
            alert(e?.response?.data || "Could not add to cart.");
        } finally {
            setAdding(false);
        }
    };

    const requestNotify = async () => {
        if (!token) return alert("Please log in.");
        try {
            await axios.post(
                API_ENDPOINTS.NOTIFY_PRODUCT(product.id),
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert("You have been added to the list. We will notify you when it’s back in stock!");
        } catch (e) {
            alert(e?.response?.data || "Could not register your request.");
        }
    };

    return (
        <article className="p-card">
            <Link to={`/product/${product.id}`} className="thumb" style={{ position: "relative", display: "block" }}>
                {hasDiscount && (
                    <span
                        style={{
                            position: "absolute",
                            top: 8,
                            left: 8,
                            background: "#ff2e72",
                            color: "#fff",
                            padding: "4px 8px",
                            borderRadius: "999px",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                        }}
                    >
            -%{Number(product.discountPercent)}
          </span>
                )}
                <img
                    src={`http://localhost:5011${product.imageUrl}`}
                    alt={product.name}
                    onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/400x400?text=No+Image";
                    }}
                />
            </Link>

            <div className="meta">
                <div className="brand">{product.brand}</div>
                <Link to={`/product/${product.id}`} className="name">
                    {product.name}
                </Link>

                <Stars value={avg} />
                <div className="rating-text">{avg.toFixed(1)} · {count} reviews</div>

                {/* 💲 Fiyat bölümü */}
                <div className="price">
                    {hasDiscount ? (
                        <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" }}>
                            <span style={{ color: "#e91e63", fontWeight: 800 }}>{priceFinalTL}</span>
                            <span style={{ textDecoration: "line-through", color: "#888", fontSize: "0.9rem" }}>
                {priceOldTL}
              </span>
                        </div>
                    ) : (
                        <span>{priceOldTL}</span>
                    )}
                </div>
            </div>

            {isOut ? (
                <button className="btn-add btn-outline" onClick={requestNotify}>
                    Notify me
                </button>
            ) : (
                <button className="btn-add" onClick={addToCart} disabled={adding}>
                    {adding ? "Adding…" : "Add to Cart"}
                </button>
            )}
        </article>
    );
}
