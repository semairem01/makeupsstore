import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_ENDPOINTS } from "../config";

function Stars({ value }) {
    const rounded = Math.round(Number(value || 0));
    return (
        <div className="stars" aria-label={`Rating ${value?.toFixed?.(1) || "0.0"}`}>
            {[1,2,3,4,5].map(i => (
                <span key={i} className={i <= rounded ? "on" : ""}>★</span>
            ))}
        </div>
    );
}

export default function ProductCard({ product, onAdded }) {
    const token = localStorage.getItem("token");
    const [avg, setAvg] = useState(0);
    const [count, setCount] = useState(0);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        let ignore = false;
        axios.get(`${API_ENDPOINTS.REVIEWS}/product/${product.id}`)
            .then(r => {
                if (ignore) return;
                setAvg(Number(r.data?.average || 0));
                setCount(Number(r.data?.count || 0));
            })
            .catch(()=>{});
        return () => { ignore = true; };
    }, [product.id]);

    const addToCart = async () => {
        if (!token) return alert("Please sign in to add to cart.");
        try {
            setAdding(true);
            await axios.post(
                `${API_ENDPOINTS.CART}/add`,
                { productId: product.id, quantity: 1 },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            onAdded?.(1);
        } catch (e) {
            alert(e?.response?.data || "Could not add to cart.");
        } finally { setAdding(false); }
    };

    return (
        <article className="p-card">
            <Link to={`/product/${product.id}`} className="thumb">
                <img
                    src={`http://localhost:5011${product.imageUrl}`}
                    alt={product.name}
                    onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/400x400?text=No+Image"; }}
                />
            </Link>
            <div className="meta">
                <div className="brand">{product.brand}</div>
                <Link to={`/product/${product.id}`} className="name">{product.name}</Link>
                <Stars value={avg} />
                <div className="rating-text">{avg.toFixed(1)} · {count} reviews</div>
                <div className="price">₺{Number(product.price).toLocaleString("tr-TR")}</div>
            </div>
            <button className="btn-add" onClick={addToCart} disabled={adding}>
                {adding ? "Adding…" : "Add to Cart"}
            </button>
        </article>
    );
}
