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
    const token = localStorage.getItem("token") || "demo-token";
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
            <style>{`
                /* ReturnsAdmin Mobile Optimized CSS */
                .returns-admin-wrap {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 24px;
                    box-sizing: border-box;
                }

                .returns-admin-wrap * {
                    box-sizing: border-box;
                }

                .returns-header {
                    margin-bottom: 32px;
                }

                .returns-header h2 {
                    margin: 0 0 16px 0;
                    font-size: 28px;
                    color: #2b2b2b;
                }

                .filter-pills {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }

                .filter-pill {
                    padding: 8px 16px;
                    border: 2px solid #e0e0e0;
                    background: white;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .filter-pill:hover {
                    border-color: #df8eb6;
                    background: #fff4f9;
                }

                .filter-pill.active {
                    background: linear-gradient(135deg, #df8eb6, #c77ba1);
                    color: white;
                    border-color: #df8eb6;
                }

                .loading {
                    text-align: center;
                    padding: 40px;
                    color: #666;
                    font-size: 16px;
                }

                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    background: #f9f9f9;
                    border-radius: 16px;
                }

                .empty-state .emoji {
                    font-size: 64px;
                    display: block;
                    margin-bottom: 16px;
                }

                .empty-state p {
                    color: #666;
                    font-size: 16px;
                }

                .returns-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
                    gap: 20px;
                }

                .return-card {
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    overflow: hidden;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }

                .return-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    background: linear-gradient(135deg, #f9f9f9, #fff);
                    border-bottom: 2px solid #f0f0f0;
                    gap: 12px;
                }

                .card-header-left {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .order-id {
                    font-weight: 700;
                    font-size: 16px;
                    color: #2b2b2b;
                }

                .return-code {
                    font-size: 11px;
                    color: #ffffff;
                    background: #df8eb6;
                    padding: 4px 8px;
                    border-radius: 8px;
                    font-family: 'Courier New', monospace;
                    font-weight: 600;
                    display: inline-block;
                }

                .status-badge {
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    white-space: nowrap;
                }

                .status-pending { background: #fff4e6; color: #d97706; }
                .status-approved { background: #dcfce7; color: #16a34a; }
                .status-rejected { background: #ffe8ed; color: #c5224b; }
                .status-transit { background: #eef2ff; color: #3d52d5; }
                .status-received { background: #e0f2fe; color: #0284c7; }
                .status-completed { background: #f0fdf4; color: #15803d; }

                .card-body {
                    padding: 20px;
                }

                .info-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 12px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid #f5f5f5;
                }

                .info-row:last-child {
                    border-bottom: none;
                    margin-bottom: 0;
                }

                .info-row .label {
                    font-size: 13px;
                    color: #666;
                    font-weight: 600;
                }

                .info-row .value {
                    font-size: 14px;
                    color: #2b2b2b;
                    text-align: right;
                    max-width: 60%;
                    word-break: break-word;
                }

                .info-row .value.reason {
                    font-style: italic;
                    color: #555;
                }

                .info-row .value.refund {
                    font-weight: 700;
                    color: #16a34a;
                    font-size: 16px;
                }

                .card-actions {
                    padding: 16px 20px;
                    background: #fafafa;
                    display: flex;
                    gap: 8px;
                    justify-content: flex-end;
                }

                .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                }

                .btn-success { background: #16a34a; color: white; }
                .btn-refund { background: #0284c7; color: white; }
                .btn-danger { background: #ef4444; color: white; }
                .btn-outline { background: white; border: 2px solid #e0e0e0; color: #666; }

                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    padding: 20px;
                }

                .modal-content {
                    background: white;
                    border-radius: 20px;
                    padding: 32px;
                    max-width: 800px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }

                .modal-content h3 {
                    margin: 0 0 24px 0;
                    font-size: 24px;
                    color: #2b2b2b;
                }

                .modal-section {
                    margin-bottom: 24px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #f0f0f0;
                }

                .modal-section strong {
                    display: block;
                    margin-bottom: 8px;
                    color: #2b2b2b;
                    font-size: 14px;
                }

                .modal-section p {
                    margin: 4px 0;
                    color: #555;
                    line-height: 1.6;
                }

                .modal-section textarea {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #e0e0e0;
                    border-radius: 8px;
                    font-family: inherit;
                    font-size: 14px;
                    resize: vertical;
                }

                .items-section {
                    background: #f9f9f9;
                    padding: 16px;
                    border-radius: 12px;
                }

                .items-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-top: 12px;
                }

                .item-card {
                    display: grid;
                    grid-template-columns: 60px 1fr auto;
                    gap: 12px;
                    align-items: center;
                    background: white;
                    padding: 12px;
                    border-radius: 8px;
                    border: 2px solid #f0f0f0;
                }

                .item-card img {
                    width: 60px;
                    height: 60px;
                    object-fit: cover;
                    border-radius: 8px;
                }

                .item-info {
                    flex: 1;
                }

                .item-name {
                    font-weight: 600;
                    font-size: 14px;
                    color: #2b2b2b;
                    margin-bottom: 4px;
                }

                .item-meta {
                    font-size: 12px;
                    color: #666;
                }

                .item-total {
                    font-weight: 700;
                    color: #2b2b2b;
                    font-size: 16px;
                }

                .modal-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    margin-top: 24px;
                    padding-top: 20px;
                    border-top: 2px solid #f0f0f0;
                }

                /* ===== MOBILE RESPONSIVE ===== */
                @media (max-width: 768px) {
                    .returns-admin-wrap {
                        padding: 16px;
                    }

                    .returns-header h2 {
                        font-size: 24px;
                    }

                    .filter-pills {
                        flex-wrap: nowrap;
                        padding-bottom: 8px;
                    }

                    .filter-pills::-webkit-scrollbar {
                        height: 4px;
                    }

                    .filter-pills::-webkit-scrollbar-thumb {
                        background: #df8eb6;
                        border-radius: 2px;
                    }

                    .returns-grid {
                        grid-template-columns: 1fr;
                    }

                    .card-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .status-badge {
                        align-self: flex-start;
                    }

                    .info-row {
                        flex-direction: column;
                        gap: 4px;
                    }

                    .info-row .value {
                        text-align: left;
                        max-width: 100%;
                    }

                    .card-actions {
                        flex-direction: column;
                    }

                    .btn {
                        width: 100%;
                    }

                    .modal-overlay {
                        padding: 0;
                        align-items: flex-end;
                    }

                    .modal-content {
                        width: 100%;
                        max-width: 100%;
                        border-radius: 24px 24px 0 0;
                        padding: 24px 16px;
                        max-height: 95vh;
                    }

                    .item-card {
                        grid-template-columns: 60px 1fr;
                    }

                    .item-total {
                        grid-column: 2;
                        text-align: right;
                        margin-top: 4px;
                        padding-top: 8px;
                        border-top: 1px solid #f0f0f0;
                    }

                    .modal-actions {
                        flex-direction: column-reverse;
                    }
                }

                @media (max-width: 480px) {
                    .returns-admin-wrap {
                        padding: 12px;
                    }

                    .returns-header h2 {
                        font-size: 22px;
                    }

                    .filter-pill {
                        padding: 6px 12px;
                        font-size: 12px;
                    }

                    .card-header {
                        padding: 14px 16px;
                    }

                    .card-body {
                        padding: 16px;
                    }

                    .order-id {
                        font-size: 15px;
                    }

                    .status-badge {
                        padding: 6px 12px;
                        font-size: 11px;
                    }
                }
            `}</style>

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

                                // YENİ:
                                <div className="card-header">
                                    <div className="card-header-left">
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

            {reviewModal && orderDetails && (
                <div className="modal-overlay" onClick={() => { setReviewModal(null); setOrderDetails(null); }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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