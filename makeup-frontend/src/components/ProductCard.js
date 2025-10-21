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

    // ✅ DÜZELTME: productId ve variantId'yi ayır
    const productId = product?.productId ?? product?.ProductId ?? product?.id ?? product?.Id;
    const variantId = product?.variantId ?? product?.VariantId ?? null;
    const variantName = product?.variantName ?? product?.VariantName ?? "";

    const imgRaw = product?.imageUrl ?? product?.ImageUrl ?? "";
    const imgSrc = String(imgRaw).startsWith("http") ? imgRaw : `http://localhost:5011${imgRaw}`;

    useEffect(() => {
        let ignore = false;
        axios
            .get(`${API_ENDPOINTS.REVIEWS}/product/${productId}`)
            .then((r) => {
                if (ignore) return;
                setAvg(Number(r.data?.average || 0));
                setCount(Number(r.data?.count || 0));
            })
            .catch(() => {});
        return () => { ignore = true; };
    }, [productId]);

    // ✅ DÜZELTME: Varyant varsa onun stok bilgisini kullan
    const stockRaw = product?.stockQuantity ?? product?.StockQuantity ?? 0;
    const isActiveRaw = product?.isActive ?? product?.IsActive ?? true;

// ✅ Backend'den gelen isActive zaten v.StockQuantity > 0 kontrolünü içeriyor
    const isOut = !isActiveRaw;

    const hasDiscount = Number(product?.discountPercent ?? product?.DiscountPercent) > 0;
    const basePrice = Number(product?.price ?? product?.Price ?? 0);
    const finalNum =
        product?.finalPrice != null
            ? Number(product.finalPrice)
            : hasDiscount
                ? basePrice * (1 - Number(product.discountPercent ?? product.DiscountPercent) / 100)
                : basePrice;

    const priceOldTL = useMemo(
        () => basePrice.toLocaleString("tr-TR", { style: "currency", currency: "TRY" }),
        [basePrice]
    );
    const priceFinalTL = useMemo(
        () => Number(finalNum).toLocaleString("tr-TR", { style: "currency", currency: "TRY" }),
        [finalNum]
    );

    const addToCart = async () => {
        if (!token) return alert("Please sign in to add to cart.");
        if (isOut) return alert("This item is out of stock.");
        try {
            setAdding(true);
            await axios.post(
                `${API_ENDPOINTS.CART}/add`,
                {
                    productId: productId,
                    variantId: variantId || undefined,
                    quantity: 1,
                    unitPrice: finalNum,
                },
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
                API_ENDPOINTS.NOTIFY_PRODUCT(productId),
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert("You have been added to the list. We will notify you when it's back in stock!");
        } catch (e) {
            alert(e?.response?.data || "Could not register your request.");
        }
    };

    const cardStyle = { display: "flex", flexDirection: "column", height: "100%" };
    const metaStyle = { display: "flex", flexDirection: "column", gap: 6, flex: "1 1 auto" };
    const nameStyle = {
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        lineHeight: 1.3,
        minHeight: "2.6em"
    };
    const addBtnStyle = { marginTop: "auto", alignSelf: "stretch" };

    // ✅ DÜZELTME: Detay sayfasına giderken doğru productId ve variantId'yi kullan
    const detailHref = `/product/${productId}${variantId ? `?variantId=${variantId}` : ""}`;

    return (
        <article className="p-card" style={cardStyle}>
            <Link to={detailHref} className="thumb" style={{ position: "relative", display: "block" }}>
                {hasDiscount && (
                    <span
                        style={{
                            position: "absolute", top: 8, left: 8,
                            background: "#ff2e72", color: "#fff",
                            padding: "4px 8px", borderRadius: "999px",
                            fontWeight: 700, fontSize: "0.8rem",
                        }}
                    >
                        -%{Number(product.discountPercent ?? product.DiscountPercent)}
                    </span>
                )}
                <img
                    src={imgSrc}
                    alt={product.name}
                    onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/400x400?text=No+Image"; }}
                    style={{ display: "block", width: "100%", height: "auto" }}
                />
            </Link>

            <div className="meta" style={metaStyle}>
                <div className="brand">{product.brand}</div>
                <Link to={detailHref} className="name" style={nameStyle}>
                    {product.name}{variantName ? ` - ${variantName}` : ""}
                </Link>

                <Stars value={avg} />
                <div className="rating-text">{avg.toFixed(1)} · {count} reviews</div>

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
                <button className="btn-add btn-outline" onClick={requestNotify} style={addBtnStyle}>
                    Notify me
                </button>
            ) : (
                <button
                    className="btn-add"
                    onClick={addToCart}
                    disabled={adding}
                    style={{
                        marginTop: "auto",
                        alignSelf: "stretch",
                        background: "#f1798a",
                        color: "#fff",
                        border: "none",
                    }}
                >
                    {adding ? "Adding…" : "Add to Cart"}
                </button>
            )}
        </article>
    );
}