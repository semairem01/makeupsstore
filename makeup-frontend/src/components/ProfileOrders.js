// src/components/ProfileOrders.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import OrderTimeline from "./OrderTimeline";
import ReturnTimeline from "./ReturnTimeline";
import "./ProfileOrders.css";
import { API_BASE_URL } from "../config";

const tl = (n) =>
    Number(n || 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

// Backend kullandığı enum değerleri
const statusLabel = (s) => {
    const labels = {
        "SiparisAlindi": "Order Received",
        "Hazirlaniyor": "Preparing",
        "Kargoda": "Shipped",
        "TeslimEdildi": "Delivered",
        "IptalEdildi": "Canceled"
    };
    return labels[s] || s;
};

const returnStatusLabel = (s) => {
    const labels = {
        "None": "",
        "Requested": "Return Requested",
        "Approved": "Return Approved",
        "Rejected": "Return Rejected",
        "InTransit": "In Transit",
        "Received": "Received",
        "Inspecting": "Inspecting",
        "RefundProcessing": "Processing Refund",
        "RefundCompleted": "Refund Completed",
        "Cancelled": "Cancelled"
    };
    return labels[s] || s;
};

const statusClass = (s) =>
    s === "SiparisAlindi" ? "pill pill-pending" :
        s === "Hazirlaniyor" ? "pill pill-prep" :
            s === "Kargoda" ? "pill pill-ship" :
                s === "TeslimEdildi" ? "pill pill-done" :
                    s === "IptalEdildi" ? "pill pill-cancel" : "pill";

const returnStatusClass = (s) => {
    const classes = {
        "Requested": "pill pill-return-pending",
        "Approved": "pill pill-return-approved",
        "Rejected": "pill pill-cancel",
        "InTransit": "pill pill-ship",
        "Received": "pill pill-return-approved",
        "RefundCompleted": "pill pill-done"
    };
    return classes[s] || "pill";
};

export default function ProfileOrders() {
    const [orders, setOrders] = useState([]);
    const [openId, setOpenId] = useState(null);
    const [returnModal, setReturnModal] = useState(null);
    const [returnReason, setReturnReason] = useState("");
    const [returnNotes, setReturnNotes] = useState("");
    const [selectedItems, setSelectedItems] = useState([]);
    const token = localStorage.getItem("token");

    const reload = async () => {
        const r = await axios.get(API_ENDPOINTS.ORDERS, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(r.data || []);
    };

    useEffect(() => { reload().catch(() => setOrders([])); }, [token]);

    const cancelOrder = async (orderId) => {
        if (!window.confirm("Are you sure you want to cancel this order?")) return;
        try {
            await axios.post(`${API_ENDPOINTS.ORDERS}/${orderId}/cancel`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            await reload();
            alert("Order cancelled successfully.");
        } catch (e) {
            alert(e?.response?.data ?? "An error occurred while canceling.");
        }
    };

    const openReturnModal = (order) => {
        setReturnModal(order);
        setReturnReason("");
        setReturnNotes("");
        setSelectedItems([]);
    };

    const toggleItem = (itemId, e) => {
        e.stopPropagation();
        setSelectedItems(prev =>
            prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        );
    };

    const getRemainingDays = (orderDate) => {
        const daysSince = Math.floor(
            (new Date() - new Date(orderDate)) / (1000 * 60 * 60 * 24)
        );
        const remaining = 15 - daysSince;
        return Math.max(0, remaining);
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
                    returnItemIds: selectedItems
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setReturnModal(null);
            await reload();
            alert("Return request submitted successfully. Please wait for admin approval.");
        } catch (e) {
            alert(e?.response?.data?.message ?? "An error occurred.");
        }
    };

    const canReturn = (order) => {
        // Can only request return if delivered and no active return exists
        if (order.status !== "TeslimEdildi") return false;
        if (order.returnStatus && order.returnStatus !== "None" && order.returnStatus !== "Rejected") return false;

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

    const hasActiveReturn = (order) => {
        return order.returnStatus &&
            order.returnStatus !== "None" &&
            order.returnStatus !== "Rejected";
    };

    if (!orders.length) {
        return (
            <div className="po-empty">
                You don't have any orders yet. <br />🌸 How about exploring new products?
            </div>
        );
    }

    return (
        <div className="po-wrap">
            {orders.map((o) => {
                const productTotal = (o.items || []).reduce(
                    (s, it) => s + (it.totalPrice ?? it.TotalPrice ?? 0),
                    0
                );
                const shipFee = o.shippingFee ?? o.ShippingFee ?? 0;
                const shipMethod =
                    (o.shippingMethod ?? o.ShippingMethod ?? "standard") === "express" ? "Express" : "Standard";
                const tracking = (o.trackingNumber ?? o.TrackingNumber ?? "").trim();
                const showTracking = o.status === "Kargoda" || o.status === "TeslimEdildi";
                const grand = productTotal + shipFee;
                const isOpen = openId === o.id;
                const canCancel = o.status === "SiparisAlindi" || o.status === "Hazirlaniyor";
                const showReturn = canReturn(o);
                const returnedItemIds = getReturnedItemIds(o);
                const activeReturn = hasActiveReturn(o);

                return (
                    <div key={o.id} className={`po-card ${isOpen ? "open" : ""}`}>
                        <div className="po-head" onClick={() => setOpenId(isOpen ? null : o.id)}>
                            <div className="po-title">
                                <b>Order</b> #{String(o.id).padStart(6, "0")}
                                <span className={statusClass(o.status)} style={{ marginLeft: 8 }}>
                                    {statusLabel(o.status)}
                                </span>
                                {activeReturn && (
                                    <span className={returnStatusClass(o.returnStatus)} style={{ marginLeft: 8 }}>
                                        {returnStatusLabel(o.returnStatus)}
                                    </span>
                                )}
                            </div>
                            <div className="po-date">{new Date(o.orderDate).toLocaleString("tr-TR")}</div>
                            <div className="po-total">{tl(grand)}</div>
                            <button className="po-toggle" aria-expanded={isOpen}>
                                {isOpen ? "▲ Hide" : "▼ Details"}
                            </button>
                        </div>

                        {isOpen && (
                            <div className="po-body">
                                <OrderTimeline status={o.status} compact />

                                {/* Show Return Timeline only if there's an active return */}
                                {activeReturn && (
                                    <div className="po-return-timeline-section">
                                        <h4>Return Status</h4>
                                        <ReturnTimeline
                                            returnStatus={o.returnStatus}
                                            returnCode={o.returnCode}
                                        />
                                    </div>
                                )}

                                {/* Show Return Information Details */}
                                {activeReturn && (
                                    <div className="po-return-info">
                                        <h4>Return Information</h4>
                                        <div>
                                            <strong>Reason:</strong> {o.returnReason}
                                        </div>
                                        {o.returnNotes && (
                                            <div>
                                                <strong>Notes:</strong> {o.returnNotes}
                                            </div>
                                        )}
                                        {returnedItemIds.length > 0 && (
                                            <div>
                                                <strong>Returned Items:</strong> {returnedItemIds.length} item(s)
                                            </div>
                                        )}
                                        {o.returnRequestDate && (
                                            <div>
                                                <strong>Requested:</strong>{" "}
                                                {new Date(o.returnRequestDate).toLocaleString("tr-TR")}
                                            </div>
                                        )}
                                        {o.returnAdminNotes && (
                                            <div>
                                                <strong>Admin Response:</strong> {o.returnAdminNotes}
                                            </div>
                                        )}
                                        {o.returnStatus === "Approved" && o.returnAddress && (
                                            <div>
                                                <strong>Return Address:</strong>
                                                <pre style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>
                                                    {o.returnAddress}
                                                </pre>
                                            </div>
                                        )}
                                        {o.returnStatus === "Approved" && o.returnShippingInfo && (
                                            <div>
                                                <strong>Shipping Instructions:</strong>
                                                <pre style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>
                                                    {o.returnShippingInfo}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className={`po-items ${o.status === "IptalEdildi" ? "is-canceled" : ""}`}>
                                    {(o.items || []).map((it, i) => {
                                        const variantImage = it.variantImage ?? it.VariantImage;
                                        const productImage = it.productImage ?? it.ProductImage;
                                        const img = variantImage ?? productImage ?? "";
                                        const nameBase = it.productName ?? it.ProductName;
                                        const vName = it.variantName ?? it.VariantName;
                                        const name = vName ? `${nameBase} - ${vName}` : nameBase;
                                        const itemId = it.orderItemId ?? it.OrderItemId;
                                        const isReturned = returnedItemIds.includes(itemId);

                                        return (
                                            <div key={i} className={`po-item ${isReturned ? "is-returned" : ""}`}>
                                                <img
                                                    src={img?.startsWith?.("http") ? img : `${API_BASE_URL}${img}`}
                                                    alt={name}
                                                    onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/64")}
                                                />
                                                <div className="po-meta">
                                                    <div className="po-name">{name}</div>
                                                    <div className="po-sub">
                                                        Qty: {it.quantity ?? it.Quantity} · Price: {tl(it.unitPrice ?? it.UnitPrice)}
                                                    </div>
                                                    {isReturned && activeReturn && (
                                                        <span className="po-returned-badge">
                                                            {returnStatusLabel(o.returnStatus)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="po-line">{tl(it.totalPrice ?? it.TotalPrice)}</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {(canCancel || showReturn) && (
                                    <div className="po-actions">
                                        {canCancel && (
                                            <button className="po-cancel" onClick={() => cancelOrder(o.id)}>
                                                Cancel Order
                                            </button>
                                        )}
                                        {showReturn && (
                                            <button className="po-return" onClick={() => openReturnModal(o)}>
                                                Request Return
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="po-ship">
                                    <div><span>Shipping Method</span><b>{shipMethod}</b></div>
                                    {showTracking && (
                                        <div><span>Tracking Number</span><b>{tracking || "Pending"}</b></div>
                                    )}
                                </div>

                                <div className="po-totals">
                                    <div><span>Subtotal</span><b>{tl(productTotal)}</b></div>
                                    <div><span>Shipping ({shipMethod})</span><b>{tl(shipFee)}</b></div>
                                    <div className="po-grand"><span>Grand Total</span><b>{tl(grand)}</b></div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {returnModal && (
                <div className="po-modal-overlay" onClick={() => setReturnModal(null)}>
                    <div className="po-modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Request Return</h3>
                        <p>Order #{returnModal.id}</p>

                        <div className="po-return-warning">
                            <span>⏰</span>
                            <div>
                                <strong>{getRemainingDays(returnModal.orderDate)} days remaining</strong> to request a return (15-day policy)
                            </div>
                        </div>

                        <div className="po-return-items-section">
                            <h4>Select Items to Return</h4>
                            <div className="po-return-items-list">
                                {(returnModal.items || []).map((it, i) => {
                                    const itemId = it.orderItemId ?? it.OrderItemId;
                                    const isSelected = selectedItems.includes(itemId);
                                    const variantImage = it.variantImage ?? it.VariantImage;
                                    const productImage = it.productImage ?? it.ProductImage;
                                    const img = variantImage ?? productImage ?? "";
                                    const nameBase = it.productName ?? it.ProductName;
                                    const vName = it.variantName ?? it.VariantName;
                                    const name = vName ? `${nameBase} - ${vName}` : nameBase;

                                    return (
                                        <div
                                            key={i}
                                            className={`po-return-item ${isSelected ? "selected" : ""}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => toggleItem(itemId, e)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <img
                                                src={img?.startsWith?.("http") ? img : `${API_BASE_URL}${img}`}
                                                alt={name}
                                                onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/50")}
                                            />
                                            <div className="po-return-item-info">
                                                <div className="name">{name}</div>
                                                <div className="sub">
                                                    Qty: {it.quantity ?? it.Quantity} · {tl(it.unitPrice ?? it.UnitPrice)}
                                                </div>
                                            </div>
                                            <div className="total">{tl(it.totalPrice ?? it.TotalPrice)}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <label>
                            Reason for Return *
                            <select
                                value={returnReason}
                                onChange={(e) => setReturnReason(e.target.value)}
                            >
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

                        <div className="po-modal-actions">
                            <button className="po-btn-outline" onClick={() => setReturnModal(null)}>
                                Cancel
                            </button>
                            <button className="po-btn-primary" onClick={submitReturn}>
                                Submit Return ({selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}