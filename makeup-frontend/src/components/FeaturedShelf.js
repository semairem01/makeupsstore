import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import ProductCard from "./ProductCard";
import { ChevronDown, X, RotateCcw, Search } from "lucide-react";
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
    suitableForSkin: 0,
    selectedRatings: [],
    hasSpf: false,
    fragranceFree: false,
    nonComedogenic: false,
    longwear: false,
    waterproof: false,
    photoFriendly: false,
    finish: "",
    coverage: "",
};

const SKIN_BITS = { Dry: 1, Oily: 2, Combination: 4, Sensitive: 8, Normal: 16 };

function Star({ filled }) {
    return <span style={{ color: filled ? "#ffc107" : "#ddd", marginRight: 2 }}>★</span>;
}

export default function FeaturedShelf({ onAdded }) {
    const [cats, setCats] = useState([{ id: 0, name: "All", parentId: 0 }]);
    const [filters, setFilters] = useState(initialFilters);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(12); // 4 sütun x 3 satır

    const [data, setData] = useState({ items: [], totalPages: 1, totalItems: 0 });
    const [loading, setLoading] = useState(true);
    const [allBrands, setAllBrands] = useState([]);

    const [openSections, setOpenSections] = useState({
        sort: true,
        price: true,
        availability: true,
        brand: true,
        skin: true,
        rating: true,
        finish: false,
        coverage: false,
        features: false,
    });

    const [brandSearch, setBrandSearch] = useState("");
    const topRef = useRef(null);

    const goPage = (n) => {
        setPage((prev) => Math.max(1, Math.min(n, data.totalPages || 1)));
        topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const toggleSection = (section) => {
        setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
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

    // Ürünler (+ varyantları normalize et)
    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();

        const params = new URLSearchParams();
        // FE’de sayfalanıyoruz ama bunlar BE’ye gitse de sorun değil
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        params.set("expandVariants", "true");

        if (filters.categoryTreeId) params.set("categoryId", String(filters.categoryTreeId));
        if (filters.sort) params.set("sort", filters.sort);
        if (filters.priceMin) params.set("priceMin", String(filters.priceMin));
        if (filters.priceMax) params.set("priceMax", String(filters.priceMax));
        if (filters.inStock) params.set("inStock", "true");
        if (filters.discounted) params.set("discounted", "true");
        if (filters.brands?.length) params.set("brands", filters.brands.join(","));
        if (filters.suitableForSkin > 0) params.set("suitableForSkin", String(filters.suitableForSkin));
        if (filters.selectedRatings?.length) params.set("selectedRatings", filters.selectedRatings.join(","));
        if (filters.hasSpf) params.set("hasSpf", "true");
        if (filters.fragranceFree) params.set("fragranceFree", "true");
        if (filters.nonComedogenic) params.set("nonComedogenic", "true");
        if (filters.longwear) params.set("longwear", "true");
        if (filters.waterproof) params.set("waterproof", "true");
        if (filters.photoFriendly) params.set("photoFriendly", "true");
        if (filters.finish) params.set("finish", filters.finish);
        if (filters.coverage) params.set("coverage", filters.coverage);

        setLoading(true);
        axios
            .get(`${API_ENDPOINTS.PRODUCTS}/browse-expanded?${params.toString()}`, {
                signal: controller.signal,
            })
            .then((r) => {
                if (cancelled) return;

                const isArray = Array.isArray(r.data);
                const raw = isArray ? r.data : (r.data?.items ?? r.data?.Items ?? []);
                // totalPages/totalItems BE’den gelse de FE’de yeniden hesaplayacağız
                // çünkü 12’lik kesiti burada alıyoruz.

                // Expanded format mı?
                const looksExpanded = raw.some(
                    (p) =>
                        "productId" in p || "ProductId" in p || "variantId" in p || "VariantId" in p
                );

                let items = raw;

                if (looksExpanded) {
                    items = raw.map((it) => {
                        const productId = it.productId ?? it.ProductId;
                        const variantId = it.variantId ?? it.VariantId ?? null;
                        const price = Number(it.price ?? it.Price ?? 0);
                        const disc = Number(it.discountPercent ?? it.DiscountPercent ?? 0);
                        const final = Number(
                            it.finalPrice ?? it.FinalPrice ?? (disc > 0 ? price * (1 - disc / 100) : price)
                        );
                        const isActive = (it.isActive ?? it.IsActive) ?? true;

                        return {
                            reactKey: `${productId}-v${variantId ?? "base"}`,
                            productId,
                            variantId,
                            name: it.name ?? it.Name,
                            brand: it.brand ?? it.Brand,
                            imageUrl: it.imageUrl ?? it.ImageUrl,
                            price,
                            discountPercent: disc,
                            finalPrice: final,
                            isActive,
                            stockQuantity: it.stockQuantity ?? it.StockQuantity ?? 0,
                            hexColor: it.hexColor ?? it.HexColor ?? null,
                        };
                    });
                } else {
                    // Expanded değilse varyantlara yay
                    items = raw.flatMap((p) => {
                        const variants = p.variants ?? p.Variants ?? [];
                        if (!Array.isArray(variants) || variants.length === 0) {
                            const baseId = p.id ?? p.Id;
                            const price = Number(p.price ?? p.Price ?? 0);
                            const disc = Number(p.discountPercent ?? p.DiscountPercent ?? 0);
                            const final = Number(
                                p.finalPrice ?? p.FinalPrice ?? (disc > 0 ? price * (1 - disc / 100) : price)
                            );
                            return [
                                {
                                    reactKey: `${baseId}-vbase`,
                                    productId: baseId,
                                    variantId: null,
                                    name: p.name ?? p.Name ?? "",
                                    brand: p.brand ?? p.Brand ?? "",
                                    imageUrl: p.imageUrl ?? p.ImageUrl ?? "",
                                    price,
                                    discountPercent: disc,
                                    finalPrice: final,
                                    isActive: (p.isActive ?? p.IsActive) ?? true,
                                    stockQuantity: p.stockQuantity ?? p.StockQuantity ?? 0,
                                },
                            ];
                        }

                        const baseId = p.productId ?? p.ProductId ?? p.id ?? p.Id;
                        const pName = p.name ?? p.Name ?? "";
                        const brand = p.brand ?? p.Brand ?? "";

                        return variants.map((v) => {
                            const vId = v.id ?? v.Id;
                            const vName = v.name ?? v.Name ?? "";
                            const vPrice = Number(v.price ?? v.Price ?? p.price ?? p.Price ?? 0);
                            const vDisc = Number(
                                v.discountPercent ?? v.DiscountPercent ?? p.discountPercent ?? p.DiscountPercent ?? 0
                            );
                            const final = Number(
                                v.finalPrice ?? v.FinalPrice ?? (vDisc > 0 ? vPrice * (1 - vDisc / 100) : vPrice)
                            );

                            return {
                                reactKey: `${baseId}-v${vId}`, // 🔧 ÖNEMLİ: reactKey eklendi
                                productId: baseId,
                                variantId: vId,
                                name: vName ? `${pName} — ${vName}` : pName,
                                brand,
                                imageUrl: (v.imageUrl ?? v.ImageUrl) || (p.imageUrl ?? p.ImageUrl) || "",
                                price: vPrice,
                                discountPercent: vDisc,
                                finalPrice: final,
                                isActive: (v.isActive ?? v.IsActive) ?? (p.isActive ?? p.IsActive),
                                stockQuantity:
                                    v.stockQuantity ?? v.StockQuantity ?? p.stockQuantity ?? p.StockQuantity ?? 0,
                            };
                        });
                    });
                }

                // Tekilleştir
                const seen = new Set();
                const uniq = [];
                for (const it of items) {
                    const key = `${it.productId}|${it.variantId ?? "base"}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniq.push(it);
                    }
                }

                // 🔢 FE sayfalama: 12’lik dilim
                const totalPages = Math.max(1, Math.ceil(uniq.length / pageSize));
                const safePage = Math.min(page, totalPages);
                const start = (safePage - 1) * pageSize;
                const paged = uniq.slice(start, start + pageSize);

                if (safePage !== page) setPage(safePage);

                setData({
                    items: paged,
                    totalPages,
                    totalItems: uniq.length,
                });

                // Marka listesi (tekil)
                const brands = uniq.map((x) => x.brand ?? "").filter(Boolean);
                setAllBrands((prev) => Array.from(new Set([...prev, ...brands])));
            })
            .catch((err) => {
                if (axios.isCancel?.(err) || err.name === "CanceledError") return;
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [filters, page, pageSize]); // page burada kalabilir; safe clamp ile döngü olmaz

    const changeCat = (id) => {
        setFilters((f) => ({ ...f, categoryTreeId: id }));
        goPage(1);
    };
    const updateFilter = (key, value) => {
        setFilters((f) => ({ ...f, [key]: value }));
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

    const toggleSkinType = (skinType) => {
        const bit = SKIN_BITS[skinType];
        if (!bit) return;
        setFilters((f) => {
            const current = f.suitableForSkin || 0;
            const newMask = current & bit ? current & ~bit : current | bit;
            return { ...f, suitableForSkin: newMask };
        });
        goPage(1);
    };

    const isSkinTypeSelected = (skinType) => !!(filters.suitableForSkin & SKIN_BITS[skinType]);

    const toggleRating = (rating) => {
        setFilters((f) => {
            const current = new Set(f.selectedRatings || []);
            current.has(rating) ? current.delete(rating) : current.add(rating);
            return { ...f, selectedRatings: Array.from(current).sort((a, b) => b - a) };
        });
        goPage(1);
    };

    const isRatingSelected = (rating) => filters.selectedRatings?.includes(rating) || false;

    const removeBadge = (type, value) => {
        const current = filters[type] || [];
        updateFilter(type, current.filter((v) => v !== value));
    };

    const clearAllFilters = () => {
        setFilters(initialFilters);
        goPage(1);
    };

    const filteredBrands = allBrands.filter((b) =>
        b.toLowerCase().includes(brandSearch.toLowerCase())
    );

    const activeFilterCount =
        (filters.brands?.length || 0) +
        (filters.suitableForSkin > 0 ? 1 : 0) +
        (filters.inStock ? 1 : 0) +
        (filters.discounted ? 1 : 0) +
        (filters.selectedRatings?.length || 0);

    return (
        <section ref={topRef} className="featured-shelf full-bleed">
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

            <div className="shelf-body">
                {/* ------ SOL FİLTRE ------ */}
                <aside
                    className="rounded-2xl backdrop-blur-md border border-pink-300/60 shadow-xl p-5 w-full max-w-sm"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                    <style>{`aside::-webkit-scrollbar { display: none; }`}</style>

                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center">
                                <img src="/icons/setting.png" alt="Filter Icon" className="w-4 h-4 invert brightness-0" />
                            </div>
                            <h3 className="font-semibold text-gray-900">Filters</h3>
                            {activeFilterCount > 0 && (
                                <span className="ml-auto bg-pink-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
                            )}
                        </div>
                        <button
                            onClick={clearAllFilters}
                            className="p-1.5 hover:bg-white rounded-lg transition text-gray-600 hover:text-gray-900"
                            title="Reset filters"
                        >
                            <RotateCcw size={18} />
                        </button>
                    </div>

                    {activeFilterCount > 0 && (
                        <div className="mb-4 flex flex-wrap gap-2 pb-4 border-b border-pink-200/50">
                            {filters.inStock && (
                                <span className="inline-flex items-center gap-2 bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-xs font-medium">
                  In stock
                  <button onClick={() => updateFilter("inStock", false)} className="hover:opacity-70">
                    <X size={14} />
                  </button>
                </span>
                            )}
                            {filters.discounted && (
                                <span className="inline-flex items-center gap-2 bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-xs font-medium">
                  On sale
                  <button onClick={() => updateFilter("discounted", false)} className="hover:opacity-70">
                    <X size={14} />
                  </button>
                </span>
                            )}
                            {filters.selectedRatings?.length > 0 && (
                                <span className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-medium">
                  {filters.selectedRatings[0]}★ & up
                  <button onClick={() => updateFilter("selectedRatings", [])} className="hover:opacity-70">
                    <X size={14} />
                  </button>
                </span>
                            )}
                            {filters.brands?.slice(0, 2).map((b) => (
                                <span
                                    key={b}
                                    className="inline-flex items-center gap-2 bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-xs font-medium"
                                >
                  {b}
                                    <button onClick={() => removeBadge("brands", b)} className="hover:opacity-70">
                    <X size={14} />
                  </button>
                </span>
                            ))}
                            {filters.brands?.length > 2 && (
                                <span className="inline-flex items-center bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-xs font-medium">
                  +{filters.brands.length - 2}
                </span>
                            )}
                        </div>
                    )}

                    {/* SORT */}
                    <div className="border-b border-pink-200/50">
                        <button
                            onClick={() => toggleSection("sort")}
                            className="w-full flex items-center justify-between py-3 font-semibold text-gray-900 hover:text-pink-600 transition"
                        >
                            Sort
                            <ChevronDown size={18} className={`transition-transform ${openSections.sort ? "rotate-180" : ""}`} />
                        </button>
                        {openSections.sort && (
                            <div className="pb-3 px-1">
                                <select
                                    value={filters.sort}
                                    onChange={(e) => updateFilter("sort", e.target.value)}
                                    className="w-full px-3 py-2 border border-pink-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                                >
                                    <option value="best">Best match</option>
                                    <option value="price_asc">Price: Low → High</option>
                                    <option value="price_desc">Price: High → Low</option>
                                    <option value="discount">Biggest discount</option>
                                    <option value="new">Newest</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* PRICE */}
                    <div className="border-b border-pink-300/60">
                        <button
                            onClick={() => toggleSection("price")}
                            className="w-full flex items-center justify-between py-3 font-semibold text-gray-900 hover:text-pink-600 transition"
                        >
                            Price
                            <ChevronDown size={18} className={`transition-transform ${openSections.price ? "rotate-180" : ""}`} />
                        </button>

                        {openSections.price && (
                            <div className="pb-4 px-1 space-y-4">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-medium text-gray-600">Min Price</label>
                                        <input
                                            type="range"
                                            min={0}
                                            max={10000}
                                            step={50}
                                            value={filters.priceMin === "" ? 0 : Number(filters.priceMin)}
                                            onChange={(e) => {
                                                const v = Number(e.target.value);
                                                setFilters((f) => ({
                                                    ...f,
                                                    priceMin: String(Math.min(v, f.priceMax === "" ? 10000 : Number(f.priceMax))),
                                                }));
                                            }}
                                            className="w-full h-2 rounded-lg appearance-none cursor-pointer price-range range-min"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600">Max Price</label>
                                        <input
                                            type="range"
                                            min={0}
                                            max={10000}
                                            step={50}
                                            value={filters.priceMax === "" ? 10000 : Number(filters.priceMax)}
                                            onChange={(e) => {
                                                const v = Number(e.target.value);
                                                setFilters((f) => ({
                                                    ...f,
                                                    priceMax: String(Math.max(v, f.priceMin === "" ? 0 : Number(f.priceMin))),
                                                }));
                                            }}
                                            className="w-full h-2 rounded-lg appearance-none cursor-pointer price-range range-max"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <input
                                            type="number"
                                            placeholder="Min"
                                            inputMode="numeric"
                                            min={0}
                                            max={10000}
                                            value={filters.priceMin}
                                            onChange={(e) => setFilters((f) => ({ ...f, priceMin: e.target.value }))}
                                            onBlur={(e) => {
                                                const raw = e.target.value;
                                                if (raw === "") return;
                                                let v = Number(raw);
                                                if (Number.isNaN(v)) v = 0;
                                                v = Math.max(0, Math.min(10000, v));
                                                const maxV = filters.priceMax === "" ? 10000 : Number(filters.priceMax);
                                                if (v > maxV) v = maxV;
                                                setFilters((f) => ({ ...f, priceMin: String(v) }));
                                            }}
                                            className="w-full px-3 py-2 border border-pink-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-400 focus:border-transparent bg-white"
                                        />
                                    </div>

                                    <span className="text-gray-400 flex items-center">–</span>

                                    <div className="flex-1">
                                        <input
                                            type="number"
                                            placeholder="Max"
                                            inputMode="numeric"
                                            min={0}
                                            max={10000}
                                            value={filters.priceMax}
                                            onChange={(e) => setFilters((f) => ({ ...f, priceMax: e.target.value }))}
                                            onBlur={(e) => {
                                                const raw = e.target.value;
                                                if (raw === "") return;
                                                let v = Number(raw);
                                                if (Number.isNaN(v)) v = 0;
                                                v = Math.max(0, Math.min(10000, v));
                                                const minV = filters.priceMin === "" ? 0 : Number(filters.priceMin);
                                                if (v < minV) v = minV;
                                                setFilters((f) => ({ ...f, priceMax: String(v) }));
                                            }}
                                            className="w-full px-3 py-2 border border-pink-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-400 focus:border-transparent bg-white"
                                        />
                                    </div>
                                </div>

                                <div className="bg-pink-50/80 rounded-lg p-2 text-center">
                                    <p className="text-sm font-semibold text-pink-700">
                                        {filters.priceMin === "" ? "₺0" : `₺${filters.priceMin}`} -{" "}
                                        {filters.priceMax === "" ? "₺10000" : `₺${filters.priceMax}`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* AVAILABILITY */}
                    <div className="border-b border-pink-200/50">
                        <button
                            onClick={() => toggleSection("availability")}
                            className="w-full flex items-center justify-between py-3 font-semibold text-gray-900 hover:text-pink-600 transition"
                        >
                            Availability
                            <ChevronDown size={18} className={`transition-transform ${openSections.availability ? "rotate-180" : ""}`} />
                        </button>
                        {openSections.availability && (
                            <div className="pb-3 px-1 space-y-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={filters.inStock}
                                        onChange={(e) => updateFilter("inStock", e.target.checked)}
                                        className="w-4 h-4 rounded accent-pink-500"
                                    />
                                    <span className="text-sm text-gray-700">In stock</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={filters.discounted}
                                        onChange={(e) => updateFilter("discounted", e.target.checked)}
                                        className="w-4 h-4 rounded accent-pink-500"
                                    />
                                    <span className="text-sm text-gray-700">On sale</span>
                                </label>
                            </div>
                        )}
                    </div>

                    {/* BRAND */}
                    <div className="border-b border-pink-200/50">
                        <button
                            onClick={() => toggleSection("brand")}
                            className="w-full flex items-center justify-between py-3 font-semibold text-gray-900 hover:text-pink-600 transition"
                        >
                            Brand
                            <ChevronDown size={18} className={`transition-transform ${openSections.brand ? "rotate-180" : ""}`} />
                        </button>
                        {openSections.brand && (
                            <div className="pb-3 px-1 space-y-3">
                                <div className="flex items-center gap-2 bg-white border border-pink-200 rounded-lg px-3 py-2">
                                    <Search size={16} className="text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search brands..."
                                        value={brandSearch}
                                        onChange={(e) => setBrandSearch(e.target.value)}
                                        className="flex-1 bg-transparent outline-none text-sm"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                                    {filteredBrands.slice(0, 12).map((brand) => (
                                        <button
                                            key={brand}
                                            onClick={() => toggleArray("brands", brand)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                                                filters.brands.includes(brand)
                                                    ? "bg-pink-500 text-white shadow-md"
                                                    : "bg-white border border-pink-200 text-gray-700 hover:border-pink-400"
                                            }`}
                                        >
                                            {brand}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SKIN TYPE */}
                    <div className="border-b border-pink-200/50">
                        <button
                            onClick={() => toggleSection("skin")}
                            className="w-full flex items-center justify-between py-3 font-semibold text-gray-900 hover:text-pink-600 transition"
                        >
                            Skin Type
                            <ChevronDown size={18} className={`transition-transform ${openSections.skin ? "rotate-180" : ""}`} />
                        </button>
                        {openSections.skin && (
                            <div className="pb-3 px-1 flex flex-wrap gap-2">
                                {["Dry", "Oily", "Combination", "Sensitive", "Normal"].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => toggleSkinType(type)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                                            isSkinTypeSelected(type) ? "bg-pink-600 text-white shadow-md" : "bg-pink-100 text-pink-700 hover:bg-pink-200"
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* RATING */}
                    <div className="border-b border-pink-200/50">
                        <button
                            onClick={() => toggleSection("rating")}
                            className="w-full flex items-center justify-between py-3 font-semibold text-gray-900 hover:text-pink-600 transition"
                        >
                            Rating
                            <ChevronDown size={18} className={`transition-transform ${openSections.rating ? "rotate-180" : ""}`} />
                        </button>
                        {openSections.rating && (
                            <div className="pb-3 px-1 space-y-2">
                                {[5, 4, 3, 2, 1].map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => toggleRating(r)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                                            isRatingSelected(r) ? "bg-amber-300 text-black font-medium" : "bg-white border border-pink-200 text-gray-700 hover:bg-pink-50"
                                        }`}
                                    >
                                        <span>{"★".repeat(r) + "☆".repeat(5 - r)}</span>
                                        <span>{r}★</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* FINISH */}
                    <div className="border-b border-pink-200/50">
                        <button
                            onClick={() => toggleSection("finish")}
                            className="w-full flex items-center justify-between py-3 font-semibold text-gray-900 hover:text-pink-600 transition"
                        >
                            Finish
                            <ChevronDown size={18} className={`transition-transform ${openSections.finish ? "rotate-180" : ""}`} />
                        </button>
                        {openSections.finish && (
                            <div className="pb-3 px-1 flex flex-wrap gap-2">
                                {["Dewy", "Natural", "Matte", "Shimmer"].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => updateFilter("finish", filters.finish === f ? "" : f)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                                            filters.finish === f ? "bg-pink-500 text-white shadow-md" : "bg-white border border-pink-200 text-gray-700 hover:border-pink-400"
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* COVERAGE */}
                    <div className="border-b border-pink-200/50">
                        <button
                            onClick={() => toggleSection("coverage")}
                            className="w-full flex items-center justify-between py-3 font-semibold text-gray-900 hover:text-pink-600 transition"
                        >
                            Coverage
                            <ChevronDown size={18} className={`transition-transform ${openSections.coverage ? "rotate-180" : ""}`} />
                        </button>
                        {openSections.coverage && (
                            <div className="pb-3 px-1 flex flex-wrap gap-2">
                                {["Sheer", "Medium", "Full"].map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => updateFilter("coverage", filters.coverage === c ? "" : c)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                                            filters.coverage === c ? "bg-pink-500 text-white shadow-md" : "bg-white border border-pink-200 text-gray-700 hover:border-pink-400"
                                        }`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* FEATURES */}
                    <div>
                        <button
                            onClick={() => toggleSection("features")}
                            className="w-full flex items-center justify-between py-3 font-semibold text-gray-900 hover:text-pink-600 transition"
                        >
                            Features
                            <ChevronDown size={18} className={`transition-transform ${openSections.features ? "rotate-180" : ""}`} />
                        </button>
                        {openSections.features && (
                            <div className="pb-3 px-1 space-y-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={filters.hasSpf}
                                        onChange={(e) => updateFilter("hasSpf", e.target.checked)}
                                        className="w-4 h-4 rounded accent-pink-500"
                                    />
                                    <span className="text-sm text-gray-700">SPF Protection</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={filters.waterproof}
                                        onChange={(e) => updateFilter("waterproof", e.target.checked)}
                                        className="w-4 h-4 rounded accent-pink-500"
                                    />
                                    <span className="text-sm text-gray-700">Waterproof</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={filters.longwear}
                                        onChange={(e) => updateFilter("longwear", e.target.checked)}
                                        className="w-4 h-4 rounded accent-pink-500"
                                    />
                                    <span className="text-sm text-gray-700">Long-wearing</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={filters.photoFriendly}
                                        onChange={(e) => updateFilter("photoFriendly", e.target.checked)}
                                        className="w-4 h-4 rounded accent-pink-500"
                                    />
                                    <span className="text-sm text-gray-700">Photo Friendly</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={filters.fragranceFree}
                                        onChange={(e) => updateFilter("fragranceFree", e.target.checked)}
                                        className="w-4 h-4 rounded accent-pink-500"
                                    />
                                    <span className="text-sm text-gray-700">Fragrance Free</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={filters.nonComedogenic}
                                        onChange={(e) => updateFilter("nonComedogenic", e.target.checked)}
                                        className="w-4 h-4 rounded accent-pink-500"
                                    />
                                    <span className="text-sm text-gray-700">Non-Comedogenic</span>
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="mt-5 pt-4 border-t border-pink-300/60 space-y-2">
                        <button className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg hover:from-pink-600 hover:to-pink-700 transition transform hover:-translate-y-0.5">
                            Apply Filters
                        </button>
                        <button
                            onClick={clearAllFilters}
                            className="w-full py-2 border border-pink-300/80 text-pink-700 rounded-lg font-semibold hover:bg-pink-50/60 transition"
                        >
                            Clear All
                        </button>
                    </div>
                </aside>

                {/* ------ PRODUCT GRID ------ */}
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
                                    <ProductCard key={p.reactKey} product={p} onAdded={onAdded} />
                                ))}
                            </div>

                            <div className="pager">
                                <button className="pager-nav" disabled={page <= 1} onClick={() => goPage(page - 1)}>
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
