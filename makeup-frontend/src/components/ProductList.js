import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { API_ENDPOINTS } from "../config";
import "./FavHeart.css";

function ProductList({ onAdded }) {
    const [products, setProducts] = useState([]);
    const [favIds, setFavIds] = useState(new Set());     // favori productId seti
    const [pulseIds, setPulseIds] = useState(new Set()); // kısa animasyon için (opsiyonel)
    const [loading, setLoading] = useState(true);
    const [error, setError]   = useState(null);

    const navigate = useNavigate();
    const { id: categoryId } = useParams();
    const token = localStorage.getItem("token");

    useEffect(() => {
        setLoading(true);
        const url = categoryId
            ? `${API_ENDPOINTS.PRODUCTS}/by-category/${categoryId}`
            : API_ENDPOINTS.PRODUCTS;

        axios.get(url)
            .then(res => { setProducts(res.data); setError(null); })
            .catch(() => setError("Ürünler yüklenirken bir hata oluştu"))
            .finally(() => setLoading(false));

        if (token) {
            axios.get(API_ENDPOINTS.FAVORITES, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => {
                    const ids = new Set((r.data || []).map(x => x.productId ?? x.ProductId));
                    setFavIds(ids);
                })
                .catch(() => {});
        }
    }, [categoryId, token]);

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
                setFavIds(prev => {
                    const n = new Set(prev);
                    n.delete(pid);
                    return n;
                });
            } else {
                await axios.post(`${API_ENDPOINTS.FAVORITES}/${pid}`, {}, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setFavIds(prev => {
                    const n = new Set(prev);
                    n.add(pid);
                    return n;
                });
                // kısa nabız animasyonu (opsiyonel)
                setPulseIds(prev => {
                    const n = new Set(prev); n.add(pid); return n;
                });
                setTimeout(() => {
                    setPulseIds(prev => {
                        const n = new Set(prev); n.delete(pid); return n;
                    });
                }, 300);
            }
        } catch (e) {
            console.error(e);
            alert("Favori işlemi sırasında hata oluştu.");
        }
    };

    if (loading) return <div>Yükleniyor...</div>;
    if (error)   return <div>{error}</div>;

    return (
        <div style={{ display: "flex", flexWrap: "wrap", padding: "1rem" }}>
            {products.map((p) => {
                const isFav = favIds.has(p.id);           // ✅ favIds’ten oku
                const pulsing = pulseIds.has(p.id);       // ✅ animasyon durumu
                return (
                    <div
                        key={p.id}
                        onClick={() => goToDetail(p.id)}
                        style={{
                            position: "relative",  // ❤️ için gerekli
                            border: "1px solid #ddd",
                            margin: 10,
                            padding: 10,
                            width: 200,
                            borderRadius: "8px",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            cursor: "pointer",
                        }}
                    >
                        {/* ❤️ Kalp butonu */}
                        <button
                            className={`fav-btn ${isFav ? "fav-active" : ""} ${pulsing ? "fav-just-toggled" : ""}`}
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
                            src={`http://localhost:5011${p.imageUrl}`}
                            alt={p.name}
                            style={{ width: "100%", height: "150px", objectFit: "cover" }}
                            onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/200x150?text=Resim+Yok"; }}
                        />
                        <h4 style={{ margin: "10px 0 5px 0" }}>{p.name}</h4>
                        <p style={{ margin: "5px 0", color: "#666" }}>{p.brand}</p>
                        <p style={{ margin: "5px 0", fontWeight: "bold", color: "#ff69b4" }}>
                            ₺{p.price}
                        </p>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                addToCart(p.id);
                            }}
                            style={{
                                backgroundColor: "#ff69b4",
                                color: "white",
                                border: "none",
                                padding: "8px 16px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                width: "100%",
                                marginTop: "10px",
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
