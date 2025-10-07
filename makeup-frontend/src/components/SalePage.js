// src/pages/SalePage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import ProductCard from "../components/ProductCard";

export default function SalePage({ onAdded }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let ignore = false;
        setLoading(true);
        axios
            .get(`${API_ENDPOINTS.PRODUCTS}/discounted`)
            .then((res) => { if (!ignore) setItems(res.data || []); })
            .finally(() => { if (!ignore) setLoading(false); });
        return () => { ignore = true; };
    }, []);

    return (
        <div style={{ padding: "1.5rem 1rem", maxWidth: 1200, margin: "0 auto" }}>
            <header style={{ marginBottom: 16 }}>
                <h1 style={{ margin: 0 }}>İndirimli Ürünler</h1>
                <p style={{ color: "#666", marginTop: 6 }}>
                    Şu an indirimde olan ürünler listeleniyor.
                </p>
            </header>

            {loading ? (
                <div className="grid skeleton">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div className="skel-card" key={i} />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div style={{ color: "#777" }}>Şu anda indirimli ürün bulunamadı.</div>
            ) : (
                <div className="grid">
                    {items.map((p) => (
                        <ProductCard key={p.id} product={p} onAdded={onAdded} />
                    ))}
                </div>
            )}
        </div>
    );
}
