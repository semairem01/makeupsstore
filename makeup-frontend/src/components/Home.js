import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import ProductCard from "./ProductCard";
import { Link, useLocation } from "react-router-dom";
import "./Home.css";
import HeroCarousel from "./HeroCarousel";
import FeaturedShelf from "./FeaturedShelf";
import LunaraDiscountPopup from "./LunaraDiscountPopup";

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
            image: "/banners/gpt.png",                     // ✅ var olan dosya
            srcSet: "/banners/gpt.png 1920w",              // şimdilik tek kaynak (404 olmasın)
            kicker: "SEASON OFFER",
            cta: { label: "Shop", to: "/sale" },
            overlay: "light",
            alt: "Lunara Beauty seasonal offer",
        },
        {
            image: "/banners/banner.jpg",
            kicker: "LIMITED TIME",
            title: <><span className="accent">New Collection</span></>,
            subtitle: "Shimmer textures in peachy tones.",
            cta: { label: "Explore", to: "/new-arrivals" },
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

    // İlk yük: kategoriler + tüm ürünler
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

    // URL değiştiğinde filtre uygula (kategori veya indirimli ürün)
    useEffect(() => {
        if (!cats.length) return;
        const params = new URLSearchParams(location.search);
        const catQuery = (params.get("cat") || "").trim().toLowerCase();
        const discounted = params.get("discounted");

        if (discounted === "true") {
            setLoading(true);
            axios
                .get(`${API_ENDPOINTS.PRODUCTS}/discounted`)
                .then((res) => setView(res.data || []))
                .catch(() => setView([]))
                .finally(() => setLoading(false));
            return;
        }

        if (catQuery) {
            const match = cats.find((c) => (c.name || "").toLowerCase() === catQuery);
            setActiveCat(match ? match.id : 0);
        } else {
            setActiveCat(0);
        }

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
            .get(`${API_ENDPOINTS.REVIEWS}/recent?take=12`)
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
                            <h3>Beauty Tips </h3>
                            <p>Expert advice & techniques</p>
                            <Link to="/beauty-tips" className="link">Discover →</Link>
                        </div>
                        <img
                            src="/banners/beautytips.png"
                            alt="Beauty Tips"
                        />
                    </article>
                    <article className="promo-card peach">
                        <div>
                            <h3>Find Your Look </h3>
                            <p>Answer a few fun questions and get your perfect makeup routine!</p>
                            <Link to="/routine" className="link">Try Now →</Link>
                        </div>
                        <img
                            src="https://images.unsplash.com/photo-1619946794135-5bc917a27793?q=80&w=800&auto=format&fit=crop"
                            alt="Routine Finder"
                        />
                    </article>
                </section>

                {/* FEATURED */}
                <section id="featured" className="featured">
                    <FeaturedShelf onAdded={onAdded}/>
                </section>
            </div>

            {/* TESTIMONIALS – Featured benzeri başlık + sonsuz kaydırma */}
            {recentReviews.length > 0 && (
                <section className="testi full-bleed" style={{ '--testi-speed': '40s' }}>
                    <div className="fp-title">
                        <h2 className="fp-heading">What customers say</h2>
                        <p className="fp-sub">Real reviews from our community</p>
                    </div>

                    {recentReviews.length < 4 ? (
                        // az yorum: animasyonsuz grid
                        <div className="testi__rail">
                            {recentReviews.map((rv) => (
                                <figure className="testi__card" key={rv.id}>
                                    <Link to={`/product/${rv.productId}`} className="testi__prod">
                                        <img
                                            src={`http://localhost:5011${rv.productImageUrl ?? ""}`}
                                            alt={rv.productName}
                                            onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/80x80?text=No+Img"; }}
                                        />
                                        <figcaption title={rv.productName}>{rv.productName}</figcaption>
                                    </Link>
                                    <div style={{ margin: "8px 0" }}>
                                        {[1,2,3,4,5].map((i) => <Star key={i} filled={i <= rv.rating} />)}
                                    </div>
                                    {rv.comment && <blockquote>"{rv.comment}"</blockquote>}
                                    <div className="testi__meta">
                                        — {rv.userDisplayName} · {new Date(rv.createdAt).toLocaleDateString("tr-TR")}
                                    </div>
                                </figure>
                            ))}
                        </div>
                    ) : (
                        // çok yorum: sonsuz kayan şerit (marquee)
                        <div className="testi__marquee" aria-label="Customer reviews carousel">
                            <div className="testi__track">
                                {[...recentReviews, ...recentReviews].map((rv, idx) => (
                                    <figure className="testi__card" key={`${rv.id}-${idx}`}>
                                        <Link to={`/product/${rv.productId}`} className="testi__prod">
                                            <img
                                                src={`http://localhost:5011${rv.productImageUrl ?? ""}`}
                                                alt={rv.productName}
                                                onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/80x80?text=No+Img"; }}
                                            />
                                            <figcaption title={rv.productName}>{rv.productName}</figcaption>
                                        </Link>
                                        <div style={{ margin: "8px 0" }}>
                                            {[1,2,3,4,5].map((i) => <Star key={i} filled={i <= rv.rating} />)}
                                        </div>
                                        {rv.comment && <blockquote>"{rv.comment}"</blockquote>}
                                        <div className="testi__meta">
                                            — {rv.userDisplayName} · {new Date(rv.createdAt).toLocaleDateString("tr-TR")}
                                        </div>
                                    </figure>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}
        </>
    );
}