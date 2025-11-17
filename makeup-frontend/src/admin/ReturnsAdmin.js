// src/admin/ReturnsAdmin.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import "./ReturnsAdmin.css";

const RETURN_STATUS = {
    Requested: "Pending Review",
    Approved: "Approved",
    Rejected: "Rejected",
    InTransit: "In Transit",
    Received: "Received",
    Inspecting: "Inspecting",
    RefundProcessing: "Processing Refund",
    RefundCompleted: "Completed",
    Cancelled: "Cancelled"
};

const tl = (n) => Number(n || 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

export default function ReturnsAdmin() {
    const token = localStorage.getItem("token");
    const [returns, setReturns] = useState([]);
    const [filter, setFilter] = useState("Requested");
    const [loading, setLoading] = useState(false);
    const [reviewModal, setReviewModal] = useState(null);
    const [orderDetails, setOrderDetails] = useState(null);
    const [adminNotes, setAdminNotes] = useState("");
    const [returnAddress, setReturnAddress] = useState("Lunara Beauty İade Merkezi\nÇankaya, Ankara\n06100");
    const [shippingInfo, setShippingInfo] = useState("Aras Kargo ile ücretsiz iade\nTakip kodu ile gönderebilirsiniz.");

    const loadReturns = async () => {
        setLoading(true);
        try {
            const res = await axios.get(API_ENDPOINTS.ADMIN_ORDERS, {
                headers: { Authorization: `Bearer ${token}` },
                params: { returnStatus: filter }
            });

            const data = res.data?.items || res.data || [];
            const filtered = Array.isArray(data)
                ? data.filter(o => o.returnStatus && o.returnStatus !== "None")
                : [];

            setReturns(filtered);
        } catch (e) {
            console.error("Failed to load returns:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadReturns(); }, [filter]);

    const loadOrderDetails = async (orderId) => {
        try {
            const res = await axios.get(`${API_ENDPOINTS.ADMIN_ORDERS}/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
        } catch (e) {
            console.error("Failed to load order details:", e);
            return null;
        }
    };

    const openReviewModal = async (returnOrder) => {
        const details = await loadOrderDetails(returnOrder.id);
        setOrderDetails(details);
        setReviewModal(returnOrder);
        setAdminNotes("");
    };

    const reviewReturn = async (approve) => {
        if (approve && !returnAddress.trim()) {
            alert("Please provide return address.");
            return;
        }

        try {
            await axios.post(
                `${API_ENDPOINTS.ADMIN_ORDERS}/${reviewModal.id}/review-return`,
                {
                    approve,
                    adminNotes,
                    returnAddress: approve ? returnAddress : null,
                    shippingInfo: approve ? shippingInfo : null
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setReviewModal(null);
            setOrderDetails(null);
            await loadReturns();
            alert(approve ? "Return approved!" : "Return rejected.");
        } catch (e) {
            alert(e?.response?.data?.message ?? "An error occurred.");
        }
    };

    const markReceived = async (orderId) => {
        if (!window.confirm("Mark this return as received?")) return;

        try {
            await axios.post(
                `${API_ENDPOINTS.ADMIN_ORDERS}/${orderId}/return-received`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await loadReturns();
            alert("Return marked as received!");
        } catch (e) {
            alert(e?.response?.data?.message ?? "An error occurred.");
        }
    };

    const completeRefund = async (orderId, refundAmount) => {
        const method = prompt("Refund method (e.g., Credit Card, Bank Transfer):", "Credit Card");
        if (!method) return;

        const transactionId = prompt("Transaction ID (optional):", "");

        try {
            await axios.post(
                `${API_ENDPOINTS.ADMIN_ORDERS}/${orderId}/complete-refund`,
                {
                    refundAmount: parseFloat(refundAmount),
                    refundMethod: method,
                    transactionId: transactionId || null
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await loadReturns();
            alert(`Refund completed: ${tl(refundAmount)}`);
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

    const getStatusClass = (status) => {
        const classes = {
            Requested: "status-pending",
            Approved: "status-approved",
            Rejected: "status-rejected",
            InTransit: "status-transit",
            Received: "status-received",
            RefundCompleted: "status-completed"
        };
        return classes[status] || "status-default";
    };

    return (
        <div className="returns-admin-wrap">
            <div className="returns-header">
                <h2>Return Management</h2>
                <div className="filter-pills">
                    {Object.keys(RETURN_STATUS).map(status => (
                        <button
                            key={status}
                            className={`filter-pill ${filter === status ? "active" : ""}`}
                            onClick={() => setFilter(status)}
                        >
                            {RETURN_STATUS[status]}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="loading">Loading returns...</div>
            ) : returns.length === 0 ? (
                <div className="empty-state">
                    <span className="emoji">📦</span>
                    <p>No returns found with status: {RETURN_STATUS[filter]}</p>
                </div>
            ) : (
                <div className="returns-grid">
                    {returns.map(ret => {
                        const returnedIds = getReturnedItemIds(ret);
                        const itemCount = returnedIds.length;

                        return (
                            <div key={ret.id} className="return-card">
                                <div className="card-header">
                                    <div>
                                        <span className="order-id">Order #{ret.id}</span>
                                        {ret.returnCode && (
                                            <span className="return-code">{ret.returnCode}</span>
                                        )}
                                    </div>
                                    <span className={`status-badge ${getStatusClass(ret.returnStatus)}`}>
                                        {RETURN_STATUS[ret.returnStatus]}
                                    </span>
                                </div>

                                <div className="card-body">
                                    <div className="info-row">
                                        <span className="label">Customer:</span>
                                        <span className="value">{ret.customerName}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Request Date:</span>
                                        <span className="value">
                                            {new Date(ret.returnRequestDate).toLocaleString("tr-TR")}
                                        </span>
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Items:</span>
                                        <span className="value">{itemCount} item(s)</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Reason:</span>
                                        <span className="value reason">{ret.returnReason}</span>
                                    </div>
                                    {ret.refundAmount && (
                                        <div className="info-row">
                                            <span className="label">Refund Amount:</span>
                                            <span className="value refund">{tl(ret.refundAmount)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="card-actions">
                                    {ret.returnStatus === "Requested" && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => openReviewModal(ret)}
                                        >
                                            Review Return
                                        </button>
                                    )}
                                    {ret.returnStatus === "InTransit" && (
                                        <button
                                            className="btn btn-success"
                                            onClick={() => markReceived(ret.id)}
                                        >
                                            Mark as Received
                                        </button>
                                    )}
                                    {(ret.returnStatus === "Received" || ret.returnStatus === "Inspecting") && (
                                        <button
                                            className="btn btn-refund"
                                            onClick={() => completeRefund(ret.id, ret.refundAmount)}
                                        >
                                            Complete Refund
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Review Modal */}
            {reviewModal && orderDetails && (
                <div className="modal-overlay" onClick={() => { setReviewModal(null); setOrderDetails(null); }}>
                    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                        <h3>Review Return Request</h3>

                        <div className="modal-section">
                            <strong>Order #{reviewModal.id}</strong>
                            <p>Customer: {reviewModal.customerName}</p>
                            {reviewModal.returnCode && <p>Return Code: {reviewModal.returnCode}</p>}
                        </div>

                        <div className="modal-section">
                            <strong>Return Reason</strong>
                            <p>{reviewModal.returnReason}</p>
                            {reviewModal.returnNotes && (
                                <>
                                    <strong>Customer Notes</strong>
                                    <p>{reviewModal.returnNotes}</p>
                                </>
                            )}
                        </div>

                        <div className="modal-section items-section">
                            <strong>Items to Return ({getReturnedItemIds(reviewModal).length})</strong>
                            <div className="items-list">
                                {(orderDetails.items || []).map((item, idx) => {
                                    const returnedIds = getReturnedItemIds(reviewModal);
                                    const itemId = item.orderItemId ?? item.OrderItemId;
                                    if (!returnedIds.includes(itemId)) return null;

                                    const img = item.variantImage ?? item.productImage ?? "";
                                    const name = item.variantName
                                        ? `${item.productName} - ${item.variantName}`
                                        : item.productName;

                                    return (
                                        <div key={idx} className="item-card">
                                            <img
                                                src={img?.startsWith("http") ? img : `http://localhost:5011${img}`}
                                                alt={name}
                                                onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/60")}
                                            />
                                            <div className="item-info">
                                                <div className="item-name">{name}</div>
                                                <div className="item-meta">
                                                    Qty: {item.quantity} · {tl(item.unitPrice)}
                                                </div>
                                            </div>
                                            <div className="item-total">{tl(item.totalPrice)}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="modal-section">
                            <label>
                                <strong>Return Address *</strong>
                                <textarea
                                    value={returnAddress}
                                    onChange={(e) => setReturnAddress(e.target.value)}
                                    rows={3}
                                    placeholder="Enter return address..."
                                />
                            </label>
                        </div>

                        <div className="modal-section">
                            <label>
                                <strong>Shipping Instructions</strong>
                                <textarea
                                    value={shippingInfo}
                                    onChange={(e) => setShippingInfo(e.target.value)}
                                    rows={2}
                                    placeholder="Shipping instructions for customer..."
                                />
                            </label>
                        </div>

                        <div className="modal-section">
                            <label>
                                <strong>Admin Notes (optional)</strong>
                                <textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Internal notes or customer message..."
                                />
                            </label>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-outline" onClick={() => { setReviewModal(null); setOrderDetails(null); }}>
                                Cancel
                            </button>
                            <button className="btn btn-danger" onClick={() => reviewReturn(false)}>
                                Reject Return
                            </button>
                            <button className="btn btn-success" onClick={() => reviewReturn(true)}>
                                Approve Return
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}