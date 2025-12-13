import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import { Heart } from "lucide-react";
import "./ProductCard.css";

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
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);

    const productId = product?.productId ?? product?.ProductId ?? product?.id ?? product?.Id;
    const variantId = product?.variantId ?? product?.VariantId ?? null;
    const variantName = product?.variantName ?? product?.VariantName ?? "";

    const imgRaw = product?.imageUrl ?? product?.ImageUrl ?? "";
    const imgSrc = String(imgRaw).startsWith("http") ? imgRaw : `http://localhost:5011${imgRaw}`;

    // Rating bilgisi
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

    // Favori durumu kontrolü
    useEffect(() => {
        if (!token) return;
        let ignore = false;

        axios
            .get(`${API_ENDPOINTS.FAVORITES}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                if (ignore) return;
                const favorites = res.data || [];
                const isFav = favorites.some((f) =>
                    (f.productId === productId || f.ProductId === productId)
                );
                setIsFavorite(isFav);
            })
            .catch(() => {});

        return () => { ignore = true; };
    }, [productId, token]);

    const stockRaw = product?.stockQuantity ?? product?.StockQuantity ?? 0;
    const isActiveRaw = product?.isActive ?? product?.IsActive ?? true;
    const isOut =
        (product?.variantId != null || product?.VariantId != null || product?.finalPrice != null || product?.FinalPrice != null)
            ? !Boolean(isActiveRaw)           // Liste (BrowseExpanded) kartları: IsActive'a bak
            : Number(stockRaw) <= 0;

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

    const toggleFavorite = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!token) {
            alert("Please sign in to add favorites.");
            return;
        }

        try {
            setFavoriteLoading(true);

            if (isFavorite) {
                // Favorilerden çıkar
                await axios.delete(`${API_ENDPOINTS.FAVORITES}/${productId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setIsFavorite(false);
            } else {
                // Favorilere ekle
                await axios.post(
                    `${API_ENDPOINTS.FAVORITES}/${productId}`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setIsFavorite(true);
            }
        } catch (error) {
            alert(error?.response?.data || "Could not update favorites.");
        } finally {
            setFavoriteLoading(false);
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

    const cardStyle = { display: "flex", flexDirection: "column", height: "100%", position: "relative" };
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

    const detailHref = `/product/${productId}${variantId ? `?variantId=${variantId}` : ""}`;

    return (
        <article className="p-card" style={cardStyle}>
            {/* Favori Butonu */}
            <button
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                className="favorite-btn"
                style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    width: "40px",
                    height: "40px",
                    background: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #ea969a",
                    borderRadius: "50%",
                    display: "flex",
                    color:"#ea969a",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: favoriteLoading ? "not-allowed" : "pointer",
                    zIndex: 10,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    transition: "all 0.3s ease",
                    opacity: favoriteLoading ? 0.6 : 1,
                }}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                onMouseEnter={(e) => {
                    if (!favoriteLoading) {
                        e.currentTarget.style.transform = "scale(1.1)";
                        e.currentTarget.style.boxShadow = "0 6px 16px rgba(255, 111, 168, 0.3)";
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                }}
            >
                <Heart
                    size={20}
                    fill={isFavorite ? "#ff6fa8" : "none"}
                    color={isFavorite ? "#ff6fa8" : "#666"}
                    style={{ transition: "all 0.3s ease" }}
                />
            </button>

            <Link to={detailHref} className="thumb" style={{ position: "relative", display: "block" }}>
                {hasDiscount && (
                    <span
                        style={{
                            position: "absolute", top: 8, left: 8,
                            background: "#ff2e72", color: "#fff",
                            padding: "4px 8px", borderRadius: "999px",
                            fontWeight: 700, fontSize: "0.8rem",
                            zIndex: 5,
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

            {/* Alt Butonlar */}
            <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                {isOut ? (
                    <button
                        className="btn-add btn-outline"
                        onClick={requestNotify}
                        style={{ flex: 1 }}
                    >
                        Notify me
                    </button>
                ) : (
                    <button
                        className="btn-add"
                        onClick={addToCart}
                        disabled={adding}
                        style={{
                            flex: 1,
                            background: "#f1798a",
                            color: "#fff",
                            border: "none",
                        }}
                    >
                        {adding ? "Adding…" : "Add to Cart"}
                    </button>
                )}
            </div>
        </article>
    );
}