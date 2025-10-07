import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams, useLocation } from "react-router-dom"; // ⬅️ eklendi
import { API_ENDPOINTS } from "../config";
import "./FavHeart.css";

function ProductList({ onAdded }) {
    const [products, setProducts] = useState([]);
    const [favIds, setFavIds] = useState(new Set());
    const [pulseIds, setPulseIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();                 // ⬅️ eklendi
    const { id: categoryId } = useParams();
    const token = localStorage.getItem("token");

    useEffect(() => {
        setLoading(true);

        // ⬇️ /sale rotası veya ?discounted=true parametresi varsa sadece indirimli ürünleri getir
        const params = new URLSearchParams(location.search);
        const onlyDiscounted = location.pathname === "/sale" || params.get("discounted") === "true";

        const url = onlyDiscounted
            ? `${API_ENDPOINTS.PRODUCTS}/discounted`
            : categoryId
                ? `${API_ENDPOINTS.PRODUCTS}/by-category/${categoryId}`
                : API_ENDPOINTS.PRODUCTS;

        axios
            .get(url)
            .then((res) => {
                setProducts(res.data);
                setError(null);
            })
            .catch(() => setError("Ürünler yüklenirken bir hata oluştu"))
            .finally(() => setLoading(false));

        if (token) {
            axios
                .get(API_ENDPOINTS.FAVORITES, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                .then((r) => {
                    const ids = new Set((r.data || []).map((x) => x.productId ?? x.ProductId));
                    setFavIds(ids);
                })
                .catch(() => {});
        }
    }, [categoryId, token, location]); // ⬅️ location eklendi

    const goToDetail = (id) => navigate(`/product/${id}`);

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
                await axios.post(`${API_ENDPOINTS.FAVORITES}/${pid}`, {}, {
                    headers: { Authorization: `Bearer ${token}` },
                });
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

    if (loading) return <div>Yükleniyor...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div style={{ display: "flex", flexWrap: "wrap", padding: "1rem" }}>
            {products.map((p) => {
                const isFav = favIds.has(p.id);
                const pulsing = pulseIds.has(p.id);

                // 🔽 İNDİRİM HESABI (finalPrice varsa onu kullan)
                const hasDisc = Number(p.discountPercent) > 0;
                const finalPriceNum =
                    p.finalPrice != null
                        ? Number(p.finalPrice)
                        : hasDisc
                            ? Number(p.price) * (1 - Number(p.discountPercent) / 100)
                            : Number(p.price);

                const priceTL = Number(p.price).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
                const finalTL = Number(finalPriceNum).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

                return (
                    <div
                        key={p.id}
                        onClick={() => goToDetail(p.id)}
                        style={{
                            position: "relative",
                            border: "1px solid #eee",
                            margin: 10,
                            padding: 10,
                            width: 220,
                            borderRadius: 12,
                            boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                            cursor: "pointer",
                            overflow: "hidden"
                        }}
                    >
                        {/* İNDİRİM ROZETİ */}
                        {hasDisc && (
                            <div style={{
                                position: "absolute",
                                top: 8, left: 8,
                                background: "#ff4d8d",
                                color: "white",
                                fontWeight: 700,
                                fontSize: 12,
                                padding: "4px 8px",
                                borderRadius: 999
                            }}>
                                %{Number(p.discountPercent)} İndirim
                            </div>
                        )}

                        {/* ❤️ */}
                        <button
                            className={`fav-btn ${isFav ? "fav-active" : ""} ${pulsing ? "fav-just-toggled" : ""}`}
                            onClick={(e) => { e.stopPropagation(); toggleFav(p.id); }}
                            aria-label={isFav ? "Favoriden kaldır" : "Favoriye ekle"}
                            title={isFav ? "Favoriden kaldır" : "Favoriye ekle"}
                        >
                            <span className="fav-heart">{isFav ? "♥" : "♡"}</span>
                        </button>

                        <img
                            src={`http://localhost:5011${p.imageUrl}`}
                            alt={p.name}
                            style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 8 }}
                            onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/220x150?text=Resim+Yok"; }}
                        />

                        <h4 style={{ margin: "10px 0 4px 0", lineHeight: 1.2 }}>{p.name}</h4>
                        <p style={{ margin: 0, color: "#777", fontSize: 13 }}>{p.brand}</p>

                        {/* FİYATLAR */}
                        <div style={{ marginTop: 8 }}>
                            {hasDisc ? (
                                <div>
                                    <div style={{ fontSize: 12, color: "#999", textDecoration: "line-through" }}>
                                        {priceTL}
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: "#ff4d8d" }}>
                                        {finalTL}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ fontSize: 18, fontWeight: 800, color: "#222" }}>{priceTL}</div>
                            )}
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); addToCart(p.id); }}
                            style={{
                                backgroundColor: "#ff69b4",
                                color: "white",
                                border: "none",
                                padding: "10px 14px",
                                borderRadius: 8,
                                cursor: "pointer",
                                width: "100%",
                                marginTop: 10,
                                fontWeight: 700
                            }}
                        >
                            Sepete Ekle
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

export default ProductList;
