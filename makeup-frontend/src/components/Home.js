import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import ProductCard from "./ProductCard";
import { Link, useLocation } from "react-router-dom";
import "./Home.css";
import HeroCarousel from "./HeroCarousel";

function Star({ filled }) {
    return <span style={{ color: filled ? "#ffc107" : "#ddd", marginRight: 2 }}>★</span>;
}

export default function Home({ onAdded }) {
    const [products, setProducts] = useState([]);
    const [cats, setCats] = useState([]);
    const [activeCat, setActiveCat] = useState(0);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState([]);
    const location = useLocation();

    // ----- SLIDES -----
    const slides = [
        {
            image: "/banners/discount.png",
            kicker: "SEASON OFFER",
            subtitle: "Pastel tones, soft finish — limited time.",
            cta: { label: "Shop Now", to: "/products?q=makeup" },
            overlay: "light",
        },
        {
            image: "/banners/banner.jpg",
            kicker: "LIMITED TIME",
            title: <><span className="accent">New Collection</span></>,
            subtitle: "Shimmer textures in peachy tones.",
            cta: { label: "Explore", to: "/products?q=new" },
            overlay: "dark",
        },
        {
            image: "/banners/cilt.png",
            kicker: "SKINCARE",
            title: <>Hydration & Glow <span className="accent">Together</span></>,
            subtitle: "Gentle formulas for sensitive skin.",
            cta: { label: "Discover", to: "/?cat=Skincare#featured" },
            overlay: "light",
        },
    ];
    // -------------------

    // İlk yük: kategoriler + ürünler
    useEffect(() => {
        setLoading(true);
        Promise.all([axios.get(API_ENDPOINTS.CATEGORIES), axios.get(API_ENDPOINTS.PRODUCTS)])
            .then(([cRes, pRes]) => {
                const catList = (cRes.data || []).map((c) => ({
                    id: Number(c?.id ?? c?.Id),
                    name: c?.name ?? c?.Name,
                    parentId: Number(c?.parentCategoryId ?? c?.ParentCategoryId ?? 0),
                }));
                setCats([{ id: 0, name: "All", parentId: 0 }, ...catList]);

                const prods = (pRes.data || []).map((p) => ({
                    ...p,
                    categoryId: Number(
                        p?.categoryId ?? p?.CategoryId ?? p?.category?.id ?? p?.Category?.Id ?? 0
                    ),
                }));
                const rev = prods.slice().reverse();
                setProducts(rev);
                setView(rev);
            })
            .finally(() => setLoading(false));
    }, []);

    // URL değiştiğinde kategori uygula
    useEffect(() => {
        if (!cats.length) return;

        const params = new URLSearchParams(location.search);
        const catQuery = (params.get("cat") || "").trim().toLowerCase();

        if (!catQuery) {
            setActiveCat(0);
        } else {
            const match = cats.find((c) => (c.name || "").toLowerCase() === catQuery);
            if (match) {
                setActiveCat(match.id);
            } else {
                setActiveCat(0); // geçersiz kategori durumunda All
            }
        }

        // sadece "#featured" varsa o bölüme kaydır
        if (location.hash === "#featured") {
            const el = document.getElementById("featured");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [location, cats]);

    // Kategori değişince ürünleri filtrele
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
            .catch(() => setView([]))
            .finally(() => setLoading(false));
    }, [activeCat, products]);

    // Son yorumlar
    const [recentReviews, setRecentReviews] = useState([]);
    useEffect(() => {
        axios
            .get(`${API_ENDPOINTS.REVIEWS}/recent?take=6`)
            .then((r) => setRecentReviews(r.data || []))
            .catch(() => setRecentReviews([]));
    }, []);

    return (
        <>
            {/* === FULL-BLEED HERO === */}
            <div className="hero-bleed">
                <HeroCarousel slides={slides} intervalMs={4500} />
            </div>

            {/* === ANA İÇERİK === */}
            <div className="home-wrap">
                {/* PROMOS */}
                <section className="promos">
                    <article className="promo-card pink">
                        <div>
                            <h3>Big Sale</h3>
                            <p>Season picks for less</p>
                            <a href="#featured" className="link">Shop now →</a>
                        </div>
                        <img
                            src="https://images.unsplash.com/photo-1526045478516-99145907023c?q=80&w=800&auto=format&fit=crop"
                            alt=""
                        />
                    </article>
                    <article className="promo-card peach">
                        <div>
                            <h3>Top Rated</h3>
                            <p>Community favorites you’ll love</p>
                            <a href="#featured" className="link">Discover →</a>
                        </div>
                        <img
                            src="https://images.unsplash.com/photo-1522336572468-97b06e8ef143?q=80&w=800&auto=format&fit=crop"
                            alt=""
                        />
                    </article>
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
                                {Array.from({ length: 8 }).map((_, i) => <div className="skel-card" key={i} />)}
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

                {/* TESTIMONIALS */}
                {recentReviews.length > 0 && (
                    <section className="testi">
                        <h2>What customers say</h2>
                        <div className="testi__rail">
                            {recentReviews.map((rv) => (
                                <figure className="testi__card" key={rv.id}>
                                    <Link to={`/product/${rv.productId}`} className="testi__prod">
                                        <img
                                            src={`http://localhost:5011${rv.productImageUrl ?? ""}`}
                                            alt={rv.productName}
                                            onError={(e) => {
                                                e.currentTarget.src =
                                                    "https://via.placeholder.com/72x72?text=No+Img";
                                            }}
                                        />
                                        <figcaption title={rv.productName}>{rv.productName}</figcaption>
                                    </Link>
                                    <div style={{ margin: "6px 0" }}>
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <Star key={i} filled={i <= rv.rating} />
                                        ))}
                                    </div>
                                    {rv.comment && <blockquote>“{rv.comment}”</blockquote>}
                                    <div className="testi__meta">
                                        — {rv.userDisplayName} ·{" "}
                                        {new Date(rv.createdAt).toLocaleDateString("tr-TR")}
                                    </div>
                                </figure>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </>
    );
}
