// src/components/OrdersPage.jsx - Premium Modern Design
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS, API_BASE_URL } from "../config";
import "./OrdersPage.css";
import OrderTimeline from "./OrderTimeline";
import ReturnTimeline from "./ReturnTimeline";

function labelFromStatus(status) {
    const labels = {
        SiparisAlindi: "Order Received",
        Hazirlaniyor: "Preparing",
        Kargoda: "Shipped",
        TeslimEdildi: "Delivered",
        IptalEdildi: "Cancelled",
        IadeTalepEdildi: "Return Requested",
        IadeOnaylandi: "Return Approved",
        IadeReddedildi: "Return Rejected",
        IadeTamamlandi: "Return Completed"
    };
    return labels[status] || status;
}

function statusClass(status) {
    switch (status) {
        case "SiparisAlindi": return "order-status-badge status-pending";
        case "Hazirlaniyor": return "order-status-badge status-preparing";
        case "Kargoda": return "order-status-badge status-shipped";
        case "TeslimEdildi": return "order-status-badge status-delivered";
        case "IptalEdildi":
        case "IadeReddedildi": return "order-status-badge status-cancelled";
        case "IadeTalepEdildi": return "order-status-badge status-return-requested";
        case "IadeOnaylandi":
        case "IadeTamamlandi": return "order-status-badge status-return-approved";
        default: return "order-status-badge";
    }
}

function formatTL(n) {
    return Number(n ?? 0).toLocaleString("tr-TR", {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 2,
    });
}

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [returnModal, setReturnModal] = useState(null);
    const [returnReason, setReturnReason] = useState("");
    const [returnNotes, setReturnNotes] = useState("");
    const [selectedItems, setSelectedItems] = useState([]);
    const token = localStorage.getItem("token");

    const fetchOrders = () =>
        axios
            .get(`${API_ENDPOINTS.ORDERS}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => setOrders(res.data || []))
            .catch((err) => console.error("Failed to load orders:", err));

    useEffect(() => {
        fetchOrders();
    }, [token]);

    const cancelOrder = async (orderId) => {
        if (!window.confirm("Are you sure you want to cancel this order?")) return;
        try {
            await axios.post(
                `${API_ENDPOINTS.ORDERS}/${orderId}/cancel`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await fetchOrders();
        } catch (e) {
            alert(e?.response?.data?.message ?? "An error occurred while canceling.");
        }
    };

    const openReturnModal = (order) => {
        setReturnModal(order);
        setReturnReason("");
        setReturnNotes("");
        setSelectedItems(
            order.items
                .map((it) => it.orderItemId || it.OrderItemId)
                .filter(Boolean)
        );
    };

    const toggleItem = (itemId, e) => {
        e.stopPropagation();
        setSelectedItems((prev) =>
            prev.includes(itemId)
                ? prev.filter((id) => id !== itemId)
                : [...prev, itemId]
        );
    };

    const getRemainingDays = (orderDate) => {
        const daysSince = Math.floor(
            (new Date() - new Date(orderDate)) / (1000 * 60 * 60 * 24)
        );
        return Math.max(0, 15 - daysSince);
    };

    const submitReturn = async () => {
        if (!returnReason.trim()) {
            alert("Please provide a return reason.");
            return;
        }

        if (selectedItems.length === 0) {
            alert("Please select at least one item to return.");
            return;
        }

        try {
            await axios.post(
                `${API_ENDPOINTS.ORDERS}/${returnModal.id}/return`,
                {
                    reason: returnReason,
                    notes: returnNotes,
                    returnItemIds: selectedItems,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setReturnModal(null);
            await fetchOrders();
            alert("Return request submitted successfully.");
        } catch (e) {
            alert(e?.response?.data?.message ?? "An error occurred.");
        }
    };

    const canCancel = (status) =>
        status === "SiparisAlindi" || status === "Hazirlaniyor";

    const canReturn = (order) => {
        if (order.status !== "TeslimEdildi") return false;
        const daysSince = Math.floor(
            (new Date() - new Date(order.orderDate)) / (1000 * 60 * 60 * 24)
        );
        return daysSince <= 15;
    };

    const getReturnedItemIds = (order) => {
        if (!order.returnItemsJson) return [];
        try {
            return JSON.parse(order.returnItemsJson);
        } catch {
            return [];
        }
    };

    const getImageUrl = (img) => {
        if (!img) return "https://via.placeholder.com/64";
        return img.startsWith("http") ? img : `${API_BASE_URL}${img}`;
    };

    if (!orders.length) {
        return (
            <div className="orders-wrap">
                <h2 className="page-title">My Orders</h2>
                <div className="empty-box">
                    <div style={{fontSize: "3rem", marginBottom: "16px"}}>📦</div>
                    <div>You don't have any orders yet.</div>
                    <div style={{fontSize: "0.9rem", marginTop: "8px", opacity: 0.7}}>
                        Start shopping to see your orders here!
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="orders-wrap">
            <h2 className="page-title">My Orders</h2>

            {orders.map((order) => {
                const productTotal = (order.items ?? []).reduce(
                    (sum, it) => sum + (it.totalPrice ?? 0),
                    0
                );
                const shippingFee = order.shippingFee ?? 0;
                const grandTotal = productTotal + shippingFee;
                const isOpen = expandedId === order.id;
                const returnedItemIds = getReturnedItemIds(order);

                // İlk 3 ürünü göster
                const displayProducts = order.items.slice(0, 3);
                const remainingCount = order.items.length - 3;

                return (
                    <div className="order-card" key={order.id}>
                        {/* Header */}
                        <div className="order-card-header">
                            <div className="order-meta">
                                <div className="order-number">
                                    Order #{String(order.id).padStart(6, "0")}
                                </div>
                                <div className="order-date">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/>
                                        <line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                    {new Date(order.orderDate).toLocaleString("tr-TR")}
                                </div>
                            </div>
                            <span className={statusClass(order.status)}>
                                {labelFromStatus(order.status)}
                            </span>
                        </div>

                        {/* Product Showcase */}
                        <div className="order-products-showcase">
                            <div className="product-images">
                                {displayProducts.map((item, idx) => (
                                    <div key={idx} className="product-img-wrapper">
                                        <img
                                            src={getImageUrl(item.productImage)}
                                            alt={item.productName}
                                            onError={(e) => e.currentTarget.src = "https://via.placeholder.com/64"}
                                        />
                                    </div>
                                ))}
                                {remainingCount > 0 && (
                                    <div className="more-products">+{remainingCount}</div>
                                )}
                            </div>

                            <div className="product-summary">
                                <h4>{order.items[0]?.productName}</h4>
                                <div className="product-count">
                                    {order.items.length} item{order.items.length > 1 ? "s" : ""}
                                    {" • "}
                                    {order.shippingMethod === "express" ? "Express" : "Standard"} Shipping
                                </div>
                            </div>

                            <div className="order-total-showcase">
                                <div className="total-label">Total</div>
                                <div className="total-amount">{formatTL(grandTotal)}</div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="order-actions">
                            {canCancel(order.status) && (
                                <button
                                    className="btn btn-danger"
                                    onClick={() => cancelOrder(order.id)}
                                >
                                    Cancel Order
                                </button>
                            )}
                            {canReturn(order) && (
                                <button
                                    className="btn btn-outline"
                                    onClick={() => openReturnModal(order)}
                                >
                                    Request Return
                                </button>
                            )}
                            <button
                                className="btn btn-primary"
                                onClick={() => setExpandedId(isOpen ? null : order.id)}
                            >
                                {isOpen ? "Hide Details" : "View Details"}
                            </button>
                        </div>

                        {/* Expanded Details */}
                        {isOpen && (
                            <div className="order-details-expanded">
                                {/* Order Timeline */}
                                <div className="detail-section">
                                    <h4>Order Progress</h4>
                                    <OrderTimeline status={order.status} />
                                </div>

                                {/* Return Timeline */}
                                {(order.returnStatus === "Approved" ||
                                    order.returnStatus === "InTransit" ||
                                    order.returnStatus === "Received" ||
                                    order.returnStatus === "RefundCompleted" ||
                                    order.returnStatus === "Rejected") && (
                                    <div className="detail-section">
                                        <h4>Return Progress</h4>
                                        <ReturnTimeline
                                            returnStatus={order.returnStatus}
                                            returnCode={order.returnCode}
                                        />
                                    </div>
                                )}

                                {/* Return Info */}
                                {order.returnReason && (
                                    <div className="return-info-section">
                                        <h4>Return Information</h4>
                                        <div className="return-info-grid">
                                            {order.returnStatus && (
                                                <div className="return-info-item">
                                                    <strong>Status:</strong>
                                                    <span>{order.returnStatus}</span>
                                                </div>
                                            )}
                                            {order.returnReason && (
                                                <div className="return-info-item">
                                                    <strong>Reason:</strong>
                                                    <span>{order.returnReason}</span>
                                                </div>
                                            )}
                                            {order.returnNotes && (
                                                <div className="return-info-item">
                                                    <strong>Notes:</strong>
                                                    <span>{order.returnNotes}</span>
                                                </div>
                                            )}
                                            {returnedItemIds.length > 0 && (
                                                <div className="return-info-item">
                                                    <strong>Returned Items:</strong>
                                                    <span>{returnedItemIds.length} item(s)</span>
                                                </div>
                                            )}
                                            {order.returnAdminNotes && (
                                                <div className="return-info-item">
                                                    <strong>Admin Response:</strong>
                                                    <span>{order.returnAdminNotes}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Items List */}
                                <div className="detail-section">
                                    <h4>Order Items</h4>
                                    <div className="items-detail-list">
                                        {order.items.map((item, idx) => {
                                            const itemId = item.orderItemId ?? item.OrderItemId;
                                            const isReturned =
                                                (order.returnStatus === "Approved" ||
                                                    order.returnStatus === "RefundCompleted") &&
                                                returnedItemIds.includes(itemId);

                                            return (
                                                <div key={idx} className="item-detail">
                                                    <img
                                                        src={getImageUrl(item.productImage)}
                                                        alt={item.productName}
                                                        onError={(e) => e.currentTarget.src = "https://via.placeholder.com/80"}
                                                    />
                                                    <div className="item-info">
                                                        <div className="item-name">{item.productName}</div>
                                                        <div className="item-meta">
                                                            <span>Qty: {item.quantity}</span>
                                                            <span>•</span>
                                                            <span>Unit: {formatTL(item.unitPrice)}</span>
                                                        </div>
                                                        {isReturned && (
                                                            <span className="returned-badge">Returned</span>
                                                        )}
                                                    </div>
                                                    <div className="item-price">
                                                        {formatTL(item.totalPrice)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Shipping Info */}
                                <div className="detail-section">
                                    <h4>Shipping Information</h4>
                                    <div className="shipping-detail-grid">
                                        <div className="shipping-item">
                                            <div className="shipping-label">Shipping Method</div>
                                            <div className="shipping-value">
                                                {order.shippingMethod === "express" ? "Express" : "Standard"}
                                            </div>
                                        </div>
                                        {order.trackingNumber && (
                                            <div className="shipping-item">
                                                <div className="shipping-label">Tracking Number</div>
                                                <div className="shipping-value">{order.trackingNumber}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Order Totals */}
                                <div className="detail-section">
                                    <h4>Order Summary</h4>
                                    <div className="totals-summary">
                                        <div className="total-row">
                                            <span className="label">Subtotal</span>
                                            <span className="value">{formatTL(productTotal)}</span>
                                        </div>
                                        <div className="total-row">
                                            <span className="label">Shipping Fee</span>
                                            <span className="value">{formatTL(shippingFee)}</span>
                                        </div>
                                        <div className="total-row grand">
                                            <span className="label">Grand Total</span>
                                            <span className="value">{formatTL(grandTotal)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Return Modal */}
            {returnModal && (
                <div className="modal-overlay" onClick={() => setReturnModal(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Request Return</h3>
                        <p>Order #{String(returnModal.id).padStart(6, "0")}</p>

                        <div className="return-warning">
                            <span>⏰</span>
                            <div>
                                <strong>{getRemainingDays(returnModal.orderDate)} days remaining</strong>
                                {" "}to request a return (15-day policy)
                            </div>
                        </div>

                        <div className="return-items-section">
                            <h4>Select Items to Return</h4>
                            <div className="return-items-list">
                                {returnModal.items.map((item, idx) => {
                                    const itemId = item.orderItemId ?? item.OrderItemId;
                                    const isSelected = selectedItems.includes(itemId);

                                    return (
                                        <div
                                            key={idx}
                                            className={`return-item ${isSelected ? "selected" : ""}`}
                                            onClick={(e) => toggleItem(itemId, e)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => toggleItem(itemId, e)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <img
                                                src={getImageUrl(item.productImage ?? item.ProductImage)}
                                                alt={item.productName ?? item.ProductName}
                                                onError={(e) => e.currentTarget.src = "https://via.placeholder.com/60"}
                                            />
                                            <div className="return-item-info">
                                                <div className="name">{item.productName ?? item.ProductName}</div>
                                                <div className="sub">
                                                    Qty: {item.quantity ?? item.Quantity} • {formatTL(item.unitPrice ?? item.UnitPrice)}
                                                </div>
                                            </div>
                                            <div className="total">
                                                {formatTL(item.totalPrice ?? item.TotalPrice)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <label>
                            Reason for Return *
                            <select value={returnReason} onChange={(e) => setReturnReason(e.target.value)}>
                                <option value="">Select reason</option>
                                <option value="Defective product">Defective product</option>
                                <option value="Wrong item">Wrong item</option>
                                <option value="Not as described">Not as described</option>
                                <option value="Changed my mind">Changed my mind</option>
                                <option value="Other">Other</option>
                            </select>
                        </label>

                        <label>
                            Additional Notes
                            <textarea
                                value={returnNotes}
                                onChange={(e) => setReturnNotes(e.target.value)}
                                rows={4}
                                placeholder="Provide more details about your return..."
                            />
                        </label>

                        <div className="modal-actions">
                            <button className="btn btn-outline" onClick={() => setReturnModal(null)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={submitReturn}>
                                Submit Return ({selectedItems.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}