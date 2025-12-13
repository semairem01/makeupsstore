// src/pages/SalePage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import ProductCard from "../components/ProductCard";
import { Sparkles, Tag, TrendingDown, Clock } from "lucide-react";
import "./SalePage.css";

export default function SalePage({ onAdded }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let ignore = false;
        setLoading(true);
        axios
            .get(`${API_ENDPOINTS.PRODUCTS}/discounted`)
            .then((res) => {
                if (!ignore) setItems(res.data || []);
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });
        return () => { ignore = true; };
    }, []);

    // İndirim oranını hesapla
    const calculateDiscount = (original, current) => {
        if (!original || !current) return 0;
        return Math.round(((original - current) / original) * 100);
    };

    // En yüksek indirim oranını bul
    const maxDiscount = items.length > 0
        ? Math.max(...items.map(p => calculateDiscount(p.originalPrice || p.price, p.price)))
        : 0;

    return (
        <div className="sale-page">
            {/* Hero Banner */}
            <div className="sale-hero">
                <div className="sale-hero-overlay"></div>
                <div className="sale-hero-content">
                    <div className="sale-badge-wrapper">
                        <Sparkles className="sale-sparkle" size={24} />
                        <span className="sale-badge">Special Offers</span>
                        <Sparkles className="sale-sparkle" size={24} />
                    </div>

                    <h1 className="sale-title">
                        Limited Time
                        <span className="sale-title-gradient"> Sale Event</span>
                    </h1>

                    <p className="sale-subtitle">
                        Discover amazing deals on premium beauty products.
                        Up to <span className="sale-highlight">40% OFF</span> selected items!
                    </p>

                    <div className="sale-stats">
                        <div className="sale-stat">
                            <Tag size={20} />
                            <div>
                                <div className="sale-stat-num">{items.length}</div>
                                <div className="sale-stat-label">Products on Sale</div>
                            </div>
                        </div>
                        <div className="sale-stat">
                            <TrendingDown size={20} />
                            <div>
                                <div className="sale-stat-num">Up to 40%</div>
                                <div className="sale-stat-label">Maximum Discount</div>
                            </div>
                        </div>
                        <div className="sale-stat">
                            <Clock size={20} />
                            <div>
                                <div className="sale-stat-num">Limited</div>
                                <div className="sale-stat-label">Time Only</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dekoratif elementler */}
                <div className="sale-decoration sale-decoration-1"></div>
                <div className="sale-decoration sale-decoration-2"></div>
                <div className="sale-decoration sale-decoration-3"></div>
            </div>

            {/* Content Container */}
            <div className="sale-container">
                {loading ? (
                    <div className="sale-grid">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div className="sale-skeleton" key={i}>
                                <div className="sale-skeleton-img"></div>
                                <div className="sale-skeleton-content">
                                    <div className="sale-skeleton-line sale-skeleton-line-short"></div>
                                    <div className="sale-skeleton-line"></div>
                                    <div className="sale-skeleton-line sale-skeleton-line-short"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="sale-empty">
                        <div className="sale-empty-icon">
                            <Tag size={64} />
                        </div>
                        <h3 className="sale-empty-title">No Sales Available</h3>
                        <p className="sale-empty-text">
                            There are currently no discounted products. Check back soon for amazing deals!
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="sale-header">
                            <div>
                                <h2 className="sale-section-title">Trending Deals</h2>
                                <p className="sale-section-subtitle">
                                    Don't miss out on these limited-time offers
                                </p>
                            </div>
                            <div className="sale-filter-btn">
                                <span>Sort by: Best Deals</span>
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8 11l-4-4h8l-4 4z"/>
                                </svg>
                            </div>
                        </div>

                        <div className="sale-grid">
                            {items.map((p) => (
                                <ProductCard key={p.id} product={p} onAdded={onAdded} />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Bottom CTA */}
            {!loading && items.length > 0 && (
                <div className="sale-cta">
                    <div className="sale-cta-content">
                        <h3 className="sale-cta-title">Want More Exclusive Deals?</h3>
                        <p className="sale-cta-text">
                           Follow us on Instagram and be the first to know about new sales and promotions!
                        </p>
                        <a
                            href="https://www.instagram.com/sema_irem01_"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sale-cta-btn"
                        >
                            Subscribe Now
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    fillRule="evenodd"
                                    d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}