// src/admin/OrdersAdmin.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import "./OrdersAdmin.css";

const STATUS = [
    "SiparisAlindi",
    "Hazirlaniyor",
    "Kargoda",
    "TeslimEdildi",
    "IptalEdildi"
];

const STATUS_LABELS = {
    SiparisAlindi: "Order Received",
    Hazirlaniyor: "Preparing",
    Kargoda: "Shipped",
    TeslimEdildi: "Delivered",
    IptalEdildi: "Cancelled"
};

const RETURN_STATUS = {
    None: "No Return",
    Requested: "Return Requested",
    Approved: "Return Approved",
    Rejected: "Return Rejected",
    InTransit: "In Transit",
    Received: "Received",
    Inspecting: "Inspecting",
    RefundProcessing: "Refund Processing",
    RefundCompleted: "Refund Completed",
    Cancelled: "Cancelled"
};

const tl = (n) => Number(n || 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

export default function OrdersAdmin() {
    const token = localStorage.getItem("token");
    const [orders, setOrders] = useState([]);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("");
    const [returnFilter, setReturnFilter] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [returnModal, setReturnModal] = useState(null);
    const [adminNotes, setAdminNotes] = useState("");
    const [trackingModal, setTrackingModal] = useState(null);
    const [trackingNumber, setTrackingNumber] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);
    const ordersPerPage = 20;

    const load = async (page = 1) => {
        setLoading(true);
        setErr("");
        try {
            const params = new URLSearchParams();
            if (q) params.append("q", q);
            if (status) params.append("status", status);
            if (returnFilter) params.append("returnStatus", returnFilter);

            params.append("page", page);
            params.append("pageSize", ordersPerPage);

            const res = await axios.get(`${API_ENDPOINTS.ADMIN_ORDERS}?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = res.data;

            if (Array.isArray(data)) {
                // Eski backend şekli için fallback
                setOrders(data);
                setTotalOrders(data.length);
                setTotalPages(1);
                setCurrentPage(1);
            } else {
                setOrders(data.items || []);
                setTotalOrders(data.total || 0);
                setTotalPages(data.totalPages || 1);
                setCurrentPage(data.page || page);
            }
        } catch (e) {
            setErr(e?.response?.data ?? "Failed to load orders.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
        load(1);
    }, [token, status, returnFilter]);

    const loadOrderDetails = async (orderId) => {
        try {
            // DÜZELTME: ADMIN_ORDERS endpoint'ini kullan
            const res = await axios.get(`${API_ENDPOINTS.ADMIN_ORDERS}/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Order details loaded:", res.data); // Debug için
            return res.data;
        } catch (e) {
            console.error("Failed to load order details:", e);
            alert("Sipariş detayları yüklenemedi: " + (e?.response?.data ?? e.message));
            return null;
        }
    };

    const toggleOrderExpand = async (order) => {
        if (expandedOrder?.id === order.id) {
            setExpandedOrder(null);
            return;
        }

        const details = await loadOrderDetails(order.id);
        if (details) {
            console.log("Expanded order details:", details); // Debug için
            setExpandedOrder({ ...order, items: details.items });
        }
    };

    const setOrderStatus = async (id, newStatus) => {
        // Sipariş objesini bul
        const order = orders.find(o => o.id === id);
        if (!order) return;

        const currentStatus = order.statusText || order.status;

        // Status geçiş kuralları
        const statusFlow = {
            "SiparisAlindi": ["Hazirlaniyor", "IptalEdildi"],
            "Hazirlaniyor": ["Kargoda", "IptalEdildi"],
            "Kargoda": ["TeslimEdildi"],
            "TeslimEdildi": [], // Teslim edildikten sonra değiştirilemez (return varsa zaten disabled)
            "IptalEdildi": [] // İptal edildikten sonra değiştirilemez
        };

        // Geçersiz geçiş kontrolü
        const allowedStatuses = statusFlow[currentStatus] || [];
        if (!allowedStatuses.includes(newStatus)) {
            alert(`Cannot change status from "${STATUS_LABELS[currentStatus]}" to "${STATUS_LABELS[newStatus]}"`);
            return;
        }

        if (newStatus === "Kargoda") {
            setTrackingModal({ id, status: newStatus });
            return;
        }

        try {
            const res = await axios.put(
                `${API_ENDPOINTS.ADMIN_ORDERS}/${id}/status`,
                { status: newStatus, trackingNumber: null },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const upd = res?.data || {};
            setOrders(prev =>
                prev.map(row =>
                    row.id === id
                        ? {
                            ...row,
                            statusText: upd.statusText ?? newStatus,
                            status: upd.statusText ?? newStatus,
                        }
                        : row
                )
            );
        } catch (e) {
            alert(e?.response?.data ?? "Failed to update status.");
        }
    };

    const submitTracking = async () => {
        if (!trackingNumber.trim()) {
            alert("Please enter a tracking number.");
            return;
        }

        try {
            const res = await axios.put(
                `${API_ENDPOINTS.ADMIN_ORDERS}/${trackingModal.id}/status`,
                { status: trackingModal.status, trackingNumber: trackingNumber.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const upd = res?.data || {};
            setOrders(prev =>
                prev.map(row =>
                    row.id === trackingModal.id
                        ? {
                            ...row,
                            statusText: upd.statusText ?? trackingModal.status,
                            status: upd.statusText ?? trackingModal.status,
                            trackingNumber: upd.trackingNumber ?? trackingNumber.trim()
                        }
                        : row
                )
            );
            setTrackingModal(null);
            setTrackingNumber("");
        } catch (e) {
            alert(e?.response?.data ?? "Failed to update status.");
        }
    };

    const openReturnModal = async (order) => {
        const details = await loadOrderDetails(order.id);
        setReturnModal({ ...order, items: details?.items || [] });
        setAdminNotes("");
    };

    const reviewReturn = async (approve) => {
        try {
            await axios.post(
                `${API_ENDPOINTS.ADMIN_ORDERS}/${returnModal.id}/review-return`,
                { approve, adminNotes },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setReturnModal(null);
            await load();
            alert(approve ? "Return approved." : "Return rejected.");
        } catch (e) {
            alert(e?.response?.data?.message ?? "An error occurred.");
        }
    };

    const getReturnedItemIds = (order) => {
        if (!order.returnItemsJson) return [];
        try {
            return JSON.parse(order.returnItemsJson);
        } catch {
            return [];
        }
    };

    const getStatusBadgeClass = (status) => {
        const map = {
            "SiparisAlindi": "badge-pending",
            "Hazirlaniyor": "badge-preparing",
            "Kargoda": "badge-shipped",
            "TeslimEdildi": "badge-delivered",
            "IptalEdildi": "badge-cancelled"
        };
        return map[status] || "badge-default";
    };

    const getReturnBadgeClass = (status) => {
        const map = {
            "Requested": "badge-return-pending",
            "Approved": "badge-return-approved",
            "Rejected": "badge-return-rejected",
            "InTransit": "badge-return-transit",
            "Received": "badge-return-received",
            "RefundCompleted": "badge-return-completed"
        };
        return map[status] || "badge-default";
    };

    const onKeyDown = (e) => {
        if (e.key === "Enter") {
            setCurrentPage(1);
            load(1);
        }
    };

    const stats = {
        total: totalOrders || orders.length,
        pending: orders.filter(o => o.statusText === "SiparisAlindi" || o.statusText === "Hazirlaniyor").length,
        shipped: orders.filter(o => o.statusText === "Kargoda").length,
        delivered: orders.filter(o => o.statusText === "TeslimEdildi").length,
        returns: orders.filter(o => o.returnStatus && o.returnStatus !== "None").length
    };

    const handlePageChange = (page) => {
        if (page < 1 || page > totalPages || page === currentPage) return;
        load(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const getPageNumbers = () => {
        const pages = [];

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
            return pages;
        }

        const current = currentPage;
        pages.push(1);

        let left = current - 2;
        let right = current + 2;

        if (left <= 2) {
            left = 2;
            right = 5;
        }

        if (right >= totalPages - 1) {
            right = totalPages - 1;
            left = totalPages - 4;
        }

        if (left > 2) pages.push("left-ellipsis");

        for (let i = left; i <= right; i++) {
            pages.push(i);
        }

        if (right < totalPages - 1) pages.push("right-ellipsis");

        pages.push(totalPages);

        return pages;
    };


    return (
        <div className="orders-admin-premium">
            {/* Header */}
            <div className="oa-header">
                <div className="oa-title-section">
                    <h1>Orders Management</h1>
                    <p>Manage and track all customer orders</p>
                </div>
                <button
                    className="oa-refresh-btn"
                    onClick={() => load(currentPage)}
                >
                    <img
                        src="/icons/refresh.png"
                        alt=""
                        className="icon"
                        onError={(e) => e.currentTarget.style.display = "none"}
                    />
                </button>
            </div>

            {/* Stats Cards */}
            <div className="oa-stats-grid">
                <div className="stat-card">
                    <div className="stat-icon total">
                        <img src="/icons/total.png" alt="" onError={(e) => e.currentTarget.textContent = "📦"} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Total Orders</div>
                        <div className="stat-value">{stats.total}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon pending">
                        <img src="/icons/pending.png" alt="" onError={(e) => e.currentTarget.textContent = "⏳"} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Pending</div>
                        <div className="stat-value">{stats.pending}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon shipped">
                        <img src="/icons/shipped.png" alt="" onError={(e) => e.currentTarget.textContent = "🚚"} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Shipped</div>
                        <div className="stat-value">{stats.shipped}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon delivered">
                        <img src="/icons/delivered.png" alt="" onError={(e) => e.currentTarget.textContent = "✅"} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Delivered</div>
                        <div className="stat-value">{stats.delivered}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon returns">
                        <img src="/icons/returns.png" alt="" onError={(e) => e.currentTarget.textContent = "↩️"} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Returns</div>
                        <div className="stat-value">{stats.returns}</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="oa-filters">
                <div className="filter-search">
                    <img
                        src="/icons/search.png"
                        alt=""
                        className="search-icon"
                        onError={(e) => e.currentTarget.textContent = "🔍"}
                    />
                    <input
                        type="text"
                        placeholder="Search by customer, email, or order ID..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={onKeyDown}
                    />
                </div>
                <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">All Order Status</option>
                    {STATUS.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                </select>
                <select className="filter-select" value={returnFilter} onChange={(e) => setReturnFilter(e.target.value)}>
                    <option value="">All Return Status</option>
                    {Object.entries(RETURN_STATUS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </div>

            {err && <div className="oa-error">{err}</div>}
            {loading && <div className="oa-loading">Loading orders...</div>}

            {/* Orders List */}
            {!loading && (
                <div className="oa-orders-list">
                    {orders.map((o) => {
                        const productTotal = (o.productTotal ?? o.total ?? 0);
                        const shippingFee = (o.shipping ?? o.shippingFee ?? 0);
                        const grandTotal = (o.grandTotal ?? (productTotal + shippingFee));
                        const statusText = (o.statusText ?? o.status ?? "SiparisAlindi");
                        const tracking = o.trackingNumber || "Not assigned";
                        const method = o.shippingMethod === "express" ? "Express" : "Standard";
                        const returnStatus = o.returnStatus || "None";
                        const isExpanded = expandedOrder?.id === o.id;

                        return (
                            <div key={o.id} className={`order-card-new ${isExpanded ? "expanded" : ""}`}>
                                <div className="order-main">
                                    <div className="order-left">
                                        <div className="order-id-block">
                                            <span className="order-number">#{String(o.id).padStart(6, "0")}</span>
                                            {o.returnCode && (
                                                <span className="return-code">{o.returnCode}</span>
                                            )}
                                        </div>
                                        <div className="order-customer">
                                            <img
                                                src="/icons/userr.png"
                                                alt=""
                                                className="customer-icon"
                                                onError={(e) => e.currentTarget.textContent = "👤"}
                                            />
                                            <span className="customer-name">{o.customerName}</span>
                                        </div>
                                        <div className="order-date">
                                            {new Date(o.orderDate).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            })}
                                        </div>
                                    </div>

                                    <div className="order-center">
                                        <div className="order-badges-group">
                                            <span className={`order-badge-new ${getStatusBadgeClass(statusText)}`}>
                                                {STATUS_LABELS[statusText] ?? statusText}
                                            </span>
                                            {returnStatus !== "None" && (
                                                <span className={`order-badge-new ${getReturnBadgeClass(returnStatus)}`}>
                                                    {RETURN_STATUS[returnStatus]}
                                                </span>
                                            )}
                                        </div>
                                        {returnStatus === "Requested" && (
                                            <button
                                                className="review-return-btn"
                                                onClick={() => openReturnModal(o)}
                                            >
                                                Review Return
                                            </button>
                                        )}
                                        {statusText === "TeslimEdildi" && returnStatus === "None" && (
                                            <div className="return-note">
                                                Customer can request return
                                            </div>
                                        )}
                                    </div>

                                    <div className="order-right">
                                        <div className="order-amount">{tl(grandTotal)}</div>
                                        <div className="order-shipping">{method} Shipping</div>
                                        <div className="order-actions-row">
                                            <select
                                                className="status-select-mini"
                                                value={statusText}
                                                onChange={(e) => setOrderStatus(o.id, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                disabled={statusText === "IptalEdildi" || returnStatus !== "None"}
                                            >
                                                {STATUS.map((s) => {
                                                    // Mevcut duruma göre hangi statuslar seçilebilir
                                                    let statusFlow = {};

                                                    // Eğer return varsa, sadece return statuslarına geçiş yapılabilir
                                                    if (returnStatus !== "None") {
                                                        statusFlow = {
                                                            "SiparisAlindi": ["SiparisAlindi"],
                                                            "Hazirlaniyor": ["Hazirlaniyor"],
                                                            "Kargoda": ["Kargoda"],
                                                            "TeslimEdildi": ["TeslimEdildi"],
                                                            "IptalEdildi": ["IptalEdildi"]
                                                        };
                                                    } else {
                                                        statusFlow = {
                                                            "SiparisAlindi": ["SiparisAlindi", "Hazirlaniyor", "IptalEdildi"],
                                                            "Hazirlaniyor": ["Hazirlaniyor", "Kargoda", "IptalEdildi"],
                                                            "Kargoda": ["Kargoda", "TeslimEdildi"],
                                                            "TeslimEdildi": ["TeslimEdildi"],
                                                            "IptalEdildi": ["IptalEdildi"]
                                                        };
                                                    }

                                                    const allowedStatuses = statusFlow[statusText] || STATUS;
                                                    const isDisabled = !allowedStatuses.includes(s);

                                                    return (
                                                        <option key={s} value={s} disabled={isDisabled}>
                                                            {STATUS_LABELS[s]}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <button
                                                className="toggle-details-btn"
                                                onClick={() => toggleOrderExpand(o)}
                                            >
                                                {isExpanded ? "Hide" : "Details"}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && expandedOrder && (
                                    <div className="order-expanded-content">
                                        <div className="expanded-header">
                                            <h4>Order Items</h4>
                                            {(statusText === "Kargoda" || statusText === "TeslimEdildi") && (
                                                <div className="tracking-info">
                                                    <span>Tracking:</span>
                                                    <code>{tracking}</code>
                                                </div>
                                            )}
                                        </div>

                                        <div className="order-items-grid">
                                            {(expandedOrder.items || []).map((item, idx) => {
                                                // İade edilen ürünleri kontrol et
                                                const returnedIds = getReturnedItemIds(expandedOrder);
                                                const itemId = item.orderItemId ?? item.OrderItemId;
                                                const isReturned = returnedIds.includes(itemId);

                                                const img = item.variantImage ?? item.productImage ?? "";
                                                const name = item.variantName
                                                    ? `${item.productName} - ${item.variantName}`
                                                    : item.productName;

                                                return (
                                                    <div key={idx} className={`item-card-grid ${isReturned ? 'item-returned' : ''}`}>
                                                        <img
                                                            src={img?.startsWith("http") ? img : `http://localhost:5011${img}`}
                                                            alt={name}
                                                            onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/80")}
                                                        />
                                                        <div className="item-info-grid">
                                                            <div className="item-name-grid">
                                                                {name}
                                                                {isReturned && (
                                                                    <span className="returned-badge">RETURNED</span>
                                                                )}
                                                            </div>
                                                            <div className="item-meta-grid">
                                                                <span>Qty: {item.quantity}</span>
                                                                <span>·</span>
                                                                <span>{tl(item.unitPrice)}</span>
                                                            </div>
                                                        </div>
                                                        <div className="item-total-grid">{tl(item.totalPrice)}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="order-totals-footer">
                                            <div className="total-row">
                                                <span>Subtotal</span>
                                                <span>{tl(productTotal)}</span>
                                            </div>
                                            <div className="total-row">
                                                <span>Shipping</span>
                                                <span>{tl(shippingFee)}</span>
                                            </div>
                                            <div className="total-row grand">
                                                <span>Total</span>
                                                <span>{tl(grandTotal)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {!orders.length && !loading && (
                        <div className="oa-empty-state">
                            <img
                               
                                alt=""
                                className="empty-icon"
                                onError={(e) => e.currentTarget.textContent = "📭"}
                            />
                            <h3>No orders found</h3>
                            <p>Try adjusting your filters or search criteria</p>
                        </div>
                    )}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="oa-pagination">
                    <div className="pagination-info">
                        {totalOrders > 0 ? (() => {
                            const start = (currentPage - 1) * ordersPerPage + 1;
                            const end = Math.min(currentPage * ordersPerPage, totalOrders);
                            return `Showing ${start}-${end} of ${totalOrders} orders`;
                        })() : "No orders to display"}
                    </div>

                    <div className="pagination-controls">
                        <button
                            className="pagination-btn"
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                        >
                            ««
                        </button>
                        <button
                            className="pagination-btn"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            ‹
                        </button>

                        {getPageNumbers().map((p, idx) => {
                            if (typeof p === "string" && p.includes("ellipsis")) {
                                return (
                                    <span key={idx} className="pagination-ellipsis">
                            …
                        </span>
                                );
                            }

                            const pageNum = p;
                            const isActive = pageNum === currentPage;

                            return (
                                <button
                                    key={pageNum}
                                    className={`pagination-btn page-number ${isActive ? "active" : ""}`}
                                    onClick={() => handlePageChange(pageNum)}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}

                        <button
                            className="pagination-btn"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            ›
                        </button>
                        <button
                            className="pagination-btn"
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage === totalPages}
                        >
                            »»
                        </button>
                    </div>
                </div>
            )}

            {/* Tracking Modal */}
            {trackingModal && (
                <div className="oa-modal-overlay" onClick={() => setTrackingModal(null)}>
                    <div className="oa-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add Tracking Number</h3>
                            <button className="modal-close" onClick={() => setTrackingModal(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Order #{trackingModal.id} will be marked as <strong>Shipped</strong></p>
                            <label className="modal-label">
                                Tracking Number
                                <input
                                    type="text"
                                    className="modal-input"
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="Enter tracking number..."
                                    autoFocus
                                />
                            </label>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-btn-cancel" onClick={() => setTrackingModal(null)}>
                                Cancel
                            </button>
                            <button className="modal-btn-primary" onClick={submitTracking}>
                                Mark as Shipped
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Return Review Modal */}
            {returnModal && (
                <div className="oa-modal-overlay" onClick={() => setReturnModal(null)}>
                    <div className="oa-modal large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Review Return Request</h3>
                            <button className="modal-close" onClick={() => setReturnModal(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="return-info-grid">
                                <div className="info-box">
                                    <strong>Order ID</strong>
                                    <span>#{returnModal.id}</span>
                                </div>
                                <div className="info-box">
                                    <strong>Customer</strong>
                                    <span>{returnModal.customerName}</span>
                                </div>
                                <div className="info-box">
                                    <strong>Return Reason</strong>
                                    <span>{returnModal.returnReason}</span>
                                </div>
                            </div>

                            {returnModal.returnNotes && (
                                <div className="notes-section">
                                    <strong>Customer Notes:</strong>
                                    <p>{returnModal.returnNotes}</p>
                                </div>
                            )}

                            <div className="return-items-section">
                                <h4>Items to Return ({getReturnedItemIds(returnModal).length})</h4>
                                <div className="return-items-list">
                                    {(returnModal.items || []).map((item, idx) => {
                                        const returnedIds = getReturnedItemIds(returnModal);
                                        const itemId = item.orderItemId ?? item.OrderItemId;
                                        if (!returnedIds.includes(itemId)) return null;

                                        const img = item.variantImage ?? item.productImage ?? "";
                                        const name = item.variantName
                                            ? `${item.productName} - ${item.variantName}`
                                            : item.productName;

                                        return (
                                            <div key={idx} className="return-item-card">
                                                <img
                                                    src={img?.startsWith("http") ? img : `http://localhost:5011${img}`}
                                                    alt={name}
                                                    onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/60")}
                                                />
                                                <div className="item-details">
                                                    <div className="item-name">{name}</div>
                                                    <div className="item-meta">Qty: {item.quantity} · {tl(item.unitPrice)}</div>
                                                </div>
                                                <div className="item-total">{tl(item.totalPrice)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <label className="modal-label">
                                Admin Notes (optional)
                                <textarea
                                    className="modal-textarea"
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    rows={4}
                                    placeholder="Add notes for the customer..."
                                />
                            </label>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-btn-danger" onClick={() => reviewReturn(false)}>
                                Reject Return
                            </button>
                            <button className="modal-btn-success" onClick={() => reviewReturn(true)}>
                                Approve Return
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}