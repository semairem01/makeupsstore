import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { API_ENDPOINTS } from "../config";
import "./FavHeart.css";
import "./ProductList.css";
import { API_BASE_URL } from "../config";

function ProductList({ onAdded }) {
    const [products, setProducts] = useState([]);
    const [favIds, setFavIds] = useState(new Set());
    const [pulseIds, setPulseIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();
    const { id: categoryId } = useParams();
    const token = localStorage.getItem("token");

    useEffect(() => {
        setLoading(true);

        const params = new URLSearchParams(location.search);
        const onlyDiscounted =
            location.pathname === "/sale" || params.get("discounted") === "true";
        const q = (params.get("q") || "").trim();

        const search = new URLSearchParams();
        if (q) search.set("q", q);
        if (categoryId) search.set("categoryId", categoryId);
        if (onlyDiscounted) search.set("discounted", "true");

        const url = `${API_ENDPOINTS.PRODUCTS}/browse-expanded${
            search.toString() ? `?${search.toString()}` : ""
        }`;

        axios
            .get(url)
            .then((res) => {
                const mapped =
                    (res.data || []).map((x) => ({
                        id: x.productId,
                        variantId: x.variantId ?? null,
                        name: x.name,
                        brand: x.brand,
                        imageUrl: x.imageUrl,
                        price: x.price,
                        discountPercent: x.discountPercent,
                        finalPrice: x.finalPrice,
                        isActive: x.isActive,
                        shadeFamily: x.shadeFamily,
                        hexColor: x.hexColor,
                    })) ?? [];

                setProducts(mapped);
                setError(null);
            })
            .catch(() => setError("Ürünler yüklenirken bir hata oluştu"))
            .finally(() => setLoading(false));

        if (token) {
            axios
                .get(API_ENDPOINTS.FAVORITES, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                .then((r) =>
                    setFavIds(
                        new Set((r.data || []).map((x) => x.productId ?? x.ProductId))
                    )
                )
                .catch(() => {});
        }
    }, [categoryId, token, location]);

    const goToDetail = (productId, variantId) => {
        if (variantId) {
            navigate(`/product/${productId}?variantId=${variantId}`);
        } else {
            navigate(`/product/${productId}`);
        }
    };

    const addToCart = async (productId) => {
        if (!token) return alert("Lütfen giriş yapın.");
        try {
            await axios.post(
                `${API_ENDPOINTS.CART}/add`,
                { productId, quantity: 1 },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            onAdded?.(1);
            alert("Sepete eklendi!");
        } catch (e) {
            console.error(e);
            alert(e?.response?.data || "Sepete eklenemedi.");
        }
    };

    const toggleFav = async (pid) => {
        if (!token) return alert("Lütfen giriş yapın.");
        const isFav = favIds.has(pid);
        try {
            if (isFav) {
                await axios.delete(`${API_ENDPOINTS.FAVORITES}/${pid}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setFavIds((prev) => {
                    const n = new Set(prev);
                    n.delete(pid);
                    return n;
                });
            } else {
                await axios.post(
                    `${API_ENDPOINTS.FAVORITES}/${pid}`,
                    {},
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                setFavIds((prev) => {
                    const n = new Set(prev);
                    n.add(pid);
                    return n;
                });
                setPulseIds((prev) => {
                    const n = new Set(prev);
                    n.add(pid);
                    return n;
                });
                setTimeout(() => {
                    setPulseIds((prev) => {
                        const n = new Set(prev);
                        n.delete(pid);
                        return n;
                    });
                }, 300);
            }
        } catch (e) {
            console.error(e);
            alert("Favori işlemi sırasında hata oluştu.");
        }
    };

    if (loading) return <div className="product-list-loading">Yükleniyor...</div>;
    if (error) return <div className="product-list-error">{error}</div>;

    const q = new URLSearchParams(location.search).get("q");

    return (
        <div className="product-list-container">
            {q && (
                <div className="search-results-header">
                    "{q}" için sonuçlar
                    {products.length === 0 && (
                        <span className="no-results">(Sonuç bulunamadı)</span>
                    )}
                </div>
            )}

            <div className="product-grid">
                {products.map((p, idx) => {
                    const isFav = favIds.has(p.id);
                    const pulsing = pulseIds.has(p.id);

                    const hasDisc = Number(p.discountPercent) > 0;
                    const finalPriceNum =
                        p.finalPrice != null
                            ? Number(p.finalPrice)
                            : hasDisc
                                ? Number(p.price) * (1 - Number(p.discountPercent) / 100)
                                : Number(p.price);

                    const priceTL = Number(p.price).toLocaleString("tr-TR", {
                        style: "currency",
                        currency: "TRY",
                    });
                    const finalTL = Number(finalPriceNum).toLocaleString("tr-TR", {
                        style: "currency",
                        currency: "TRY",
                    });

                    return (
                        <div
                            key={`${p.id}-${p.variantId ?? "base"}-${idx}`}
                            onClick={() => goToDetail(p.id, p.variantId)}
                            className="product-card"
                        >
                            {hasDisc && (
                                <div className="discount-badge">
                                    %{Number(p.discountPercent)}
                                </div>
                            )}

                            <button
                                className={`fav-btn ${isFav ? "fav-active" : ""} ${
                                    pulsing ? "fav-just-toggled" : ""
                                }`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFav(p.id);
                                }}
                                aria-label={isFav ? "Favoriden kaldır" : "Favoriye ekle"}
                                title={isFav ? "Favoriden kaldır" : "Favoriye ekle"}
                            >
                                <span className="fav-heart">{isFav ? "♥" : "♡"}</span>
                            </button>

                            <img
                                src={
                                    p.imageUrl?.startsWith("http")
                                        ? p.imageUrl
                                        : `${API_BASE_URL}${p.imageUrl || ""}`
                                }
                                alt={p.name}
                                className="product-image"
                                onError={(e) => {
                                    e.currentTarget.src =
                                        "https://via.placeholder.com/200x200?text=Resim+Yok";
                                }}
                            />

                            <div className="product-info">
                                <h4 className="product-name">{p.name}</h4>
                                <p className="product-brand">{p.brand}</p>

                                {p.hexColor && (
                                    <div className="product-color">
                                        <span
                                            className="color-dot"
                                            style={{ background: p.hexColor }}
                                        />
                                        {p.shadeFamily && (
                                            <span className="shade-family">{p.shadeFamily}</span>
                                        )}
                                    </div>
                                )}

                                <div className="product-price">
                                    {hasDisc ? (
                                        <>
                                            <div className="original-price">{priceTL}</div>
                                            <div className="final-price">{finalTL}</div>
                                        </>
                                    ) : (
                                        <div className="single-price">{priceTL}</div>
                                    )}
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart(p.id);
                                    }}
                                    className="add-to-cart-btn"
                                >
                                    Sepete Ekle
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ProductList;