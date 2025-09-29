import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import ProductCard from "../components/ProductCard";
import "./Home.css";

export default function Home({ onAdded }) {
    const [cats, setCats] = useState([]);
    const [products, setProducts] = useState([]);
    const [view, setView] = useState([]);        // ekranda gösterilecek liste
    const [activeCat, setActiveCat] = useState(0); // 0 = All
    const [loading, setLoading] = useState(true);

    // İlk yük: kategoriler + tüm ürünler
    useEffect(() => {
        setLoading(true);
        Promise.all([
            axios.get(API_ENDPOINTS.CATEGORIES),
            axios.get(API_ENDPOINTS.PRODUCTS),
        ])
            .then(([cRes, pRes]) => {
                // Kategorileri normalize et
                const catList = (cRes.data || []).map((c) => ({
                    id: Number(c?.id ?? c?.Id),
                    name: c?.name ?? c?.Name,
                }));
                setCats([{ id: 0, name: "All" }, ...catList]);

                // Ürünleri normalize et
                const prods = (pRes.data || []).map((p) => ({
                    ...p,
                    categoryId: Number(
                        p?.categoryId ?? p?.CategoryId ?? p?.category?.id ?? p?.Category?.Id ?? 0
                    ),
                }));
                const reversed = prods.slice().reverse();
                setProducts(reversed);
                setView(reversed); // başlangıçta hepsi
            })
            .finally(() => setLoading(false));
    }, []);

    // Sekme değişince: üst + alt kategorileri toplayan endpoint
    useEffect(() => {
        if (activeCat === 0) {
            setView(products);
            return;
        }
        setLoading(true);
        axios
            .get(`${API_ENDPOINTS.PRODUCTS}/by-category-tree/${activeCat}`)
            .then((res) => {
                const list = (res.data || []).map((p) => ({
                    ...p,
                    categoryId: Number(p?.categoryId ?? p?.CategoryId ?? 0),
                }));
                setView(list);
            })
            .catch(() => {
                // Endpoint yoksa / hata olursa: tek kategori fallback (yerelde filtre)
                const local = (products || []).filter(
                    (p) => Number(p.categoryId) === Number(activeCat)
                );
                setView(local);
            })
            .finally(() => setLoading(false));
    }, [activeCat, products]);

    return (
        <div className="home-wrap">
            {/* HERO */}
            <section className="hero">
                <div className="hero-text">
                    <h1>
                        Let your beauty <span>shine bright</span>
                    </h1>
                    <p>
                        From skincare to makeup, discover the latest must-haves from your favorite brands.
                    </p>
                    <a className="btn-primary" href="#featured">Shop Now</a>
                </div>
                <div className="hero-art" aria-hidden>
                    <div className="bubble b1" /><div className="bubble b2" /><div className="bubble b3" />
                </div>
            </section>

            {/* FEATURED */}
            <section id="featured" className="featured">
                <header className="featured-head">
                    <h2>Featured Products</h2>
                    <div className="tabs">
                        {cats.map((c) => (
                            <button
                                key={c.id}
                                className={`tab ${activeCat === c.id ? "active" : ""}`}
                                onClick={() => setActiveCat(c.id)}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                </header>

                <div className="featured-body">
                    {loading ? (
                        <div className="grid skeleton">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div className="skel-card" key={i} />
                            ))}
                        </div>
                    ) : (
                        <div className="grid">
                            {view.slice(0, 12).map((p) => (
                                <ProductCard key={p.id} product={p} onAdded={onAdded} />
                            ))}
                            {view.length === 0 && (
                                <div style={{ gridColumn: "1 / -1", color: "#666" }}>
                                    Bu kategoride ürün bulunamadı.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
