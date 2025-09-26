import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import ProductCard from "../components/ProductCard";
import "./Home.css";

export default function Home({ onAdded }) {
    const [products, setProducts] = useState([]);
    const [cats, setCats] = useState([]);
    const [activeCat, setActiveCat] = useState(0); // 0 = All
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            axios.get(API_ENDPOINTS.CATEGORIES),
            axios.get(API_ENDPOINTS.PRODUCTS),
        ])
            .then(([cRes, pRes]) => {
                const catList = (cRes.data || []);
                setCats([{ id: 0, name: "All" }, ...catList]);
                setProducts((pRes.data || []).slice().reverse());
            })
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        if (!activeCat) return products; // 0 = All
        return products.filter(p => p.categoryId === activeCat);
    }, [products, activeCat]);

    return (
        <div className="home-wrap">
            {/* HERO (unchanged) */}
            <section className="hero">
                <div className="hero-text">
                    <h1>Let your beauty <span>shine bright</span></h1>
                    <p>From skincare to makeup, discover the latest must-haves from your favorite brands.</p>
                    <a className="btn-primary" href="#featured">Shop Now</a>
                </div>
                <div className="hero-art" aria-hidden>
                    <div className="bubble b1" /><div className="bubble b2" /><div className="bubble b3" />
                </div>
            </section>

            {/* PROMOS (unchanged) */}
            <section className="promos"> … </section>

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

                {/* NEW: two-column body (sidebar + grid) */}
                <div className="featured-body">
                    <SideCategoryMenu
                        categories={cats}
                        activeId={activeCat}
                        onChange={setActiveCat}
                    />

                    {loading ? (
                        <div className="grid skeleton">
                            {Array.from({ length: 8 }).map((_, i) => <div className="skel-card" key={i} />)}
                        </div>
                    ) : (
                        <div className="grid">
                            {filtered.slice(0, 12).map((p) => (
                                <ProductCard key={p.id} product={p} onAdded={onAdded} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* USPs (unchanged) */}
            <section className="usp"> … </section>
        </div>
    );
}
