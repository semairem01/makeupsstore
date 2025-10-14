// src/components/FeaturedShelf.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import ProductCard from "./ProductCard";
import "./FeaturedShelf.css";

const initialFilters = {
    categoryTreeId: 0,
    sort: "best",
    priceMin: "",
    priceMax: "",
    inStock: false,
    discounted: false,
    brands: [],
    colors: [],
    sizes: [],
    suitableForSkin: 0,  // ✅ Bitmask olarak başlat (0 = filtre yok)
    minRating: 0,
};

// ✅ Backend'le aynı bit değerlerini kullan
const SKIN_BITS = {
    Dry: 1,         // 1 << 0
    Oily: 2,        // 1 << 1
    Combination: 4, // 1 << 2
    Sensitive: 8,   // 1 << 3
    Normal: 16      // 1 << 4
};

function Star({ filled }) {
    return <span style={{ color: filled ? "#ffc107" : "#ddd", marginRight: 2 }}>★</span>;
}

export default function FeaturedShelf({ onAdded }) {
    const [cats, setCats] = useState([{ id: 0, name: "All", parentId: 0 }]);
    const [filters, setFilters] = useState(initialFilters);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(12);

    const [data, setData] = useState({ items: [], totalPages: 1, totalItems: 0 });
    const [loading, setLoading] = useState(true);
    const [allBrands, setAllBrands] = useState([]);

    const topRef = useRef(null);
    const goPage = (n) => {
        setPage(n);
        topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    // Kategoriler
    useEffect(() => {
        axios.get(API_ENDPOINTS.CATEGORIES).then((r) => {
            const list = (r.data || []).map((c) => ({
                id: Number(c?.id ?? c?.Id),
                name: c?.name ?? c?.Name,
                parentId: Number(c?.parentCategoryId ?? c?.ParentCategoryId ?? 0),
            }));
            setCats([{ id: 0, name: "All", parentId: 0 }, ...list]);
        });
    }, []);

    // Browse çağrısı
    useEffect(() => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));

        if (filters.categoryTreeId) params.set("categoryTreeId", String(filters.categoryTreeId));
        if (filters.sort) params.set("sort", filters.sort);
        if (filters.priceMin) params.set("priceMin", String(filters.priceMin));
        if (filters.priceMax) params.set("priceMax", String(filters.priceMax));
        if (filters.inStock) params.set("inStock", "true");
        if (filters.discounted) params.set("discounted", "true");
        if (filters.brands?.length) params.set("brands", filters.brands.join(","));
        if (filters.colors?.length) params.set("colors", filters.colors.join(","));
        if (filters.sizes?.length) params.set("sizes", filters.sizes.join(","));

        // ✅ Bitmask'i integer olarak gönder
        if (filters.suitableForSkin > 0) {
            params.set("suitableForSkin", String(filters.suitableForSkin));
        }

        if (filters.minRating) params.set("minRating", String(filters.minRating));

        setLoading(true);
        axios
            .get(`${API_ENDPOINTS.PRODUCTS}/browse?${params.toString()}`)
            .then((r) => {
                const items = r.data?.items ?? r.data?.Items ?? [];
                const totalPages = r.data?.totalPages ?? r.data?.TotalPages ?? 1;
                const totalItems = r.data?.totalItems ?? r.data?.TotalItems ?? 0;

                setData({ items, totalPages, totalItems });

                const brands = items.map((x) => x.brand).filter(Boolean);
                setAllBrands((prev) => Array.from(new Set([...prev, ...brands])));
            })
            .finally(() => setLoading(false));
    }, [filters, page, pageSize]);

    const changeCat = (id) => {
        setFilters((f) => ({ ...f, categoryTreeId: id }));
        goPage(1);
    };

    const toggleArray = (key, val) => {
        setFilters((f) => {
            const s = new Set(f[key] ?? []);
            s.has(val) ? s.delete(val) : s.add(val);
            return { ...f, [key]: Array.from(s) };
        });
        goPage(1);
    };

    // ✅ Skin type toggle: bitmask üzerinden çalış
    const toggleSkinType = (skinType) => {
        const bit = SKIN_BITS[skinType];
        if (!bit) return;

        setFilters((f) => {
            const current = f.suitableForSkin || 0;
            // Eğer bit aktifse kapat, değilse aç
            const newMask = (current & bit) ? (current & ~bit) : (current | bit);
            return { ...f, suitableForSkin: newMask };
        });
        goPage(1);
    };

    // ✅ Seçili skin type'ları kontrol et
    const isSkinTypeSelected = (skinType) => {
        const bit = SKIN_BITS[skinType];
        return !!(filters.suitableForSkin & bit);
    };

    const skinTypes = ["Dry", "Oily", "Combination", "Sensitive", "Normal"];

    return (
        <section ref={topRef} className="featured-shelf full-bleed">
            {/* Başlık */}
            <header className="shelf-head">
                <div className="fp-title">
                    <h2 className="fp-heading">Featured Products</h2>
                    <p className="fp-sub">Season favorites</p>
                </div>

                <div className="shelf-tabs">
                    {cats.slice(0, 8).map((c) => (
                        <button
                            key={c.id}
                            className={`tab ${filters.categoryTreeId === c.id ? "active" : ""}`}
                            onClick={() => changeCat(c.id)}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            </header>

            {/* Gövde: Sol filtre + Sağ ürün grid */}
            <div className="shelf-body">
                {/* SOL: Filtreler */}
                <aside className="filters">
                    {/* Sort */}
                    <div className="f-block">
                        <div className="f-title">Sort</div>
                        <select
                            className="f-select"
                            value={filters.sort}
                            onChange={(e) => {
                                setFilters((f) => ({ ...f, sort: e.target.value }));
                                goPage(1);
                            }}
                        >
                            <option value="best">Best match</option>
                            <option value="price_asc">Price: Low → High</option>
                            <option value="price_desc">Price: High → Low</option>
                            <option value="discount">Biggest discount</option>
                            <option value="new">Newest</option>
                        </select>
                    </div>

                    {/* Price */}
                    <div className="f-block">
                        <div className="f-title">Price</div>
                        <div className="price-row">
                            <input
                                className="f-input"
                                placeholder="Min"
                                type="number"
                                value={filters.priceMin}
                                onChange={(e) => setFilters((f) => ({ ...f, priceMin: e.target.value }))}
                            />
                            <span>—</span>
                            <input
                                className="f-input"
                                placeholder="Max"
                                type="number"
                                value={filters.priceMax}
                                onChange={(e) => setFilters((f) => ({ ...f, priceMax: e.target.value }))}
                            />
                        </div>
                        <button className="f-apply" onClick={() => goPage(1)}>
                            Apply
                        </button>
                    </div>

                    {/* Availability */}
                    <div className="f-block">
                        <div className="f-title">Availability</div>
                        <label className="f-check">
                            <input
                                type="checkbox"
                                checked={filters.inStock}
                                onChange={(e) => {
                                    setFilters((f) => ({ ...f, inStock: e.target.checked }));
                                    goPage(1);
                                }}
                            />
                            In stock
                        </label>
                        <label className="f-check">
                            <input
                                type="checkbox"
                                checked={filters.discounted}
                                onChange={(e) => {
                                    setFilters((f) => ({ ...f, discounted: e.target.checked }));
                                    goPage(1);
                                }}
                            />
                            On sale
                        </label>
                    </div>

                    {/* Brand chips */}
                    <div className="f-block">
                        <div className="f-title">Brand</div>
                        <div className="chips">
                            {allBrands.slice(0, 16).map((b) => (
                                <button
                                    key={b}
                                    className={`chip ${filters.brands.includes(b) ? "on" : ""}`}
                                    onClick={() => toggleArray("brands", b)}
                                >
                                    {b}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ✅ Skin Type - Bitmask ile çalışan versiyon */}
                    <div className="f-block">
                        <div className="f-title">Skin Type</div>
                        <div className="chips">
                            {skinTypes.map((t) => (
                                <button
                                    key={t}
                                    className={`chip ${isSkinTypeSelected(t) ? "on" : ""}`}
                                    onClick={() => toggleSkinType(t)}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                       
                    </div>

                    {/* Rating */}
                    <div className="f-block">
                        <div className="f-title">Rating</div>
                        <div className="stars-picker">
                            {[5, 4, 3, 2, 1].map((r) => (
                                <button
                                    key={r}
                                    className={`star-btn ${filters.minRating === r ? "on" : ""}`}
                                    onClick={() => {
                                        setFilters((f) => ({ ...f, minRating: f.minRating === r ? 0 : r }));
                                        goPage(1);
                                    }}
                                    title={`${r}+ stars`}
                                >
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <Star key={i} filled={i <= r} />
                                    ))}
                                    <span className="star-text">&nbsp;{r}+</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        className="f-clear"
                        onClick={() => {
                            setFilters(initialFilters);
                            goPage(1);
                        }}
                    >
                        Clear filters
                    </button>
                </aside>

                {/* SAĞ: Grid + Pager */}
                <div className="grid-wrap">
                    {loading ? (
                        <div className="fs-grid skeleton">
                            {Array.from({ length: pageSize }).map((_, i) => (
                                <div key={i} className="skel-card" />
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="fs-grid">
                                {data.items.map((p) => (
                                    <ProductCard key={p.id} product={p} onAdded={onAdded} />
                                ))}
                            </div>

                            <div className="pager">
                                <button
                                    className="pager-nav"
                                    disabled={page <= 1}
                                    onClick={() => goPage(page - 1)}
                                >
                                    ‹ Prev
                                </button>

                                {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((n) => (
                                    <button
                                        key={n}
                                        className={`page-btn ${page === n ? "active" : ""}`}
                                        onClick={() => goPage(n)}
                                    >
                                        {n}
                                    </button>
                                ))}

                                <button
                                    className="pager-nav"
                                    disabled={page >= data.totalPages}
                                    onClick={() => goPage(page + 1)}
                                >
                                    Next ›
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}