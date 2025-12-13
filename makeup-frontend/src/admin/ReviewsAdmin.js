import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import "./ReviewsAdmin.css";

const STATUS_LABELS = {
    Pending: "Pending Review",
    Approved: "Approved",
    Rejected: "Rejected"
};

const STATUS_COLORS = {
    Pending: "status-pending",
    Approved: "status-approved",
    Rejected: "status-rejected"
};

export default function ReviewsAdmin() {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    const [list, setList] = useState([]);
    const [productId, setProductId] = useState("");
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    const approveUrl = (id) => `${API_ENDPOINTS.ADMIN_REVIEWS}/${id}/approve`;
    const rejectUrl  = (id) => `${API_ENDPOINTS.ADMIN_REVIEWS}/${id}/reject`;

    const load = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (productId) params.set("productId", productId);
        if (status) params.set("status", status);
        const qs = params.toString() ? `?${params.toString()}` : "";

        try {
            const r = await axios.get(`${API_ENDPOINTS.ADMIN_REVIEWS}${qs}`, { headers });
            setList(r.data || []);
        } catch {
            setList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [token]);

    const del = async (id) => {
        if (!window.confirm("Delete this review?")) return;
        try {
            await axios.delete(`${API_ENDPOINTS.ADMIN_REVIEWS}/${id}`, { headers });
            load();
        } catch (e) {
            alert("Failed to delete review.");
        }
    };

    const approve = async (id) => {
        try {
            await axios.post(approveUrl(id), {}, { headers });
            load();
        } catch (e) {
            alert("Failed to approve review.");
        }
    };

    const reject = async (id) => {
        try {
            await axios.post(rejectUrl(id), {}, { headers });
            load();
        } catch (e) {
            alert("Failed to reject review.");
        }
    };

    const renderStars = (rating) => {
        return (
            <div className="star-rating">
                {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} className={star <= rating ? "star filled" : "star"}>
                        ★
                    </span>
                ))}
            </div>
        );
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="reviews-admin-wrap">
            <div className="reviews-header">
                <h2>Review Management</h2>
                <p>Manage and moderate customer reviews</p>
                <div className="filter-section">
                    <input
                        className="filter-input"
                        placeholder="Product ID (optional)"
                        value={productId}
                        onChange={e => setProductId(e.target.value)}
                    />
                    <select
                        className="filter-select"
                        value={status}
                        onChange={e => setStatus(e.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                    <button className="filter-btn" onClick={load} disabled={loading}>
                        {loading ? "Loading..." : "Filter"}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading reviews...</p>
                </div>
            ) : list.length === 0 ? (
                <div className="empty-state">
                    <span className="emoji">💬</span>
                    <p>No reviews found</p>
                </div>
            ) : (
                <div className="reviews-grid">
                    {list.map(review => {
                        const isExpanded = expandedId === review.id;
                        const isLongComment = review.comment && review.comment.length > 100;

                        return (
                            <div key={review.id} className="review-card">
                                <div className="card-header">
                                    <div className="review-meta">
                                        <span className="review-id">#{review.id}</span>
                                        <span className={`status-badge ${STATUS_COLORS[review.status]}`}>
                                            {STATUS_LABELS[review.status]}
                                        </span>
                                    </div>
                                    {review.isVerifiedPurchase && (
                                        <span className="verified-badge">
                                            <span className="icon">✓</span> Verified Purchase
                                        </span>
                                    )}
                                </div>

                                <div className="card-body">
                                    <div className="product-info">
                                        <div className="product-name">{review.productName}</div>
                                        <div className="product-id">Product #{review.productId}</div>
                                    </div>

                                    <div className="rating-row">
                                        {renderStars(review.rating)}
                                        <span className="rating-value">{review.rating}/5</span>
                                    </div>

                                    <div className="user-info">
                                        <div className="user-avatar">
                                            {review.user.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="user-details">
                                            <div className="user-name">{review.user}</div>
                                            <div className="review-date">
                                                {new Date(review.createdAt).toLocaleDateString("en-US", {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {review.comment && (
                                        <div className="comment-section">
                                            <div className={`comment-text ${!isExpanded && isLongComment ? "truncated" : ""}`}>
                                                {review.comment}
                                            </div>
                                            {isLongComment && (
                                                <button
                                                    className="expand-btn"
                                                    onClick={() => toggleExpand(review.id)}
                                                >
                                                    {isExpanded ? "Show less" : "Read more"}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="card-actions">
                                    {review.status === "Pending" ? (
                                        <>
                                            <button
                                                className="action-btn approve"
                                                onClick={() => approve(review.id)}
                                            >
                                                <span className="icon">✓</span> Approve
                                            </button>
                                            <button
                                                className="action-btn reject"
                                                onClick={() => reject(review.id)}
                                            >
                                                <span className="icon">✕</span> Reject
                                            </button>
                                        </>
                                    ) : (
                                        <div className="status-message">
                                            <span className={`status-icon ${review.status === "Approved" ? "approved" : "rejected"}`}>
                                                {review.status === "Approved" ? "✓" : "✕"}
                                            </span>
                                            <span className="status-text">
                                                {review.status === "Approved" ? "Review Approved" : "Review Rejected"}
                                            </span>
                                        </div>
                                    )}
                                    <button
                                        className="action-btn delete"
                                        onClick={() => del(review.id)}
                                    >
                                        <span className="icon">🗑</span> Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}