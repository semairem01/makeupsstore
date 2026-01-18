import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import ProductCard from "./ProductCard";
import "./NewArrivals.css";
import { API_BASE_URL } from "../config";

const API_BASE = `${API_BASE_URL}/api`;

export default function NewArrivals({ onAdded }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all"); // all, 7days, 30days

    useEffect(() => {
        fetchNewProducts();
    }, [filter]);

    const fetchNewProducts = async () => {
        setLoading(true);
        try {
            const days = filter === "7days" ? 7 : filter === "30days" ? 30 : 60;
            const res = await axios.get(`${API_BASE}/product/recently-added?days=${days}&limit=24`);
            setProducts(res.data || []);
        } catch (err) {
            console.error("Error fetching new products:", err);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="new-arrivals">
            {/* Hero Section */}
            <section className="na-hero">
                <div className="na-hero-content">
                    <span className="na-kicker">FRESH & NEW</span>
                    <h1 className="na-title">
                        New <span className="na-accent">Arrivals</span>
                    </h1>
                    <p className="na-subtitle">
                        Discover the latest beauty essentials that just landed in our collection.
                    </p>
                </div>
                <div className="na-hero-pattern"></div>
            </section>

            {/* Filter Bar */}
            <div className="na-filter-bar">
                <div className="na-filter-wrap">
                    <button
                        className={`na-filter-btn ${filter === "all" ? "active" : ""}`}
                        onClick={() => setFilter("all")}
                    >
                        All New
                    </button>
                    <button
                        className={`na-filter-btn ${filter === "30days" ? "active" : ""}`}
                        onClick={() => setFilter("30days")}
                    >
                        Last 30 Days
                    </button>
                    <button
                        className={`na-filter-btn ${filter === "7days" ? "active" : ""}`}
                        onClick={() => setFilter("7days")}
                    >
                        This Week
                    </button>
                </div>
                <div className="na-count">
                    {!loading && `${products.length} ${products.length === 1 ? "product" : "products"}`}
                </div>
            </div>

            {/* Products Grid */}
            <section className="na-products">
                {loading ? (
                    <div className="na-loading">
                        <div className="na-spinner"></div>
                        <p>Loading new arrivals...</p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="na-empty">
                        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                        <h3>No new products yet</h3>
                        <p>Check back soon for the latest additions to our collection!</p>
                        <Link to="/" className="na-home-btn">Browse All Products</Link>
                    </div>
                ) : (
                    <div className="na-grid">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onAdded={onAdded}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}