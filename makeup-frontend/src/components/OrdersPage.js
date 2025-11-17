// src/components/OrdersPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import "./OrdersPage.css";
import OrderTimeline, { STATUS_STEPS } from "./OrderTimeline";
import ReturnTimeline from "./ReturnTimeline"; // ✅ YENİ: iade süreci timeline

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
        case "SiparisAlindi":
            return "pill pill-pending";
        case "Hazirlaniyor":
            return "pill pill-prep";
        case "Kargoda":
            return "pill pill-ship";
        case "TeslimEdildi":
            return "pill pill-done";
        case "IptalEdildi":
        case "IadeReddedildi":
            return "pill pill-cancel";
        case "IadeTalepEdildi":
            return "pill pill-return-pending";
        case "IadeOnaylandi":
        case "IadeTamamlandi":
            return "pill pill-return-approved";
        default:
            return "pill";
    }
}

function formatTL(n) {
    const val = Number(n ?? 0);
    return val.toLocaleString("tr-TR", {
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

    if (!orders.length) {
        return (
            <div className="orders-wrap">
                <h2 className="page-title">My Orders</h2>
                <div className="empty-box">You don't have any orders yet.</div>
            </div>
        );
    }

    return (
        <div className="orders-wrap">
            <h2 className="page-title">My Orders</h2>

            <div className="orders-table">
                <div className="orders-head">
                    <div>#</div>
                    <div>Order No</div>
                    <div>Date</div>
                    <div>Status</div>
                    <div>Total</div>
                    <div>Actions</div>
                </div>

                {orders.map((order, idx) => {
                    const productTotal = (order.items ?? []).reduce(
                        (sum, it) => sum + (it.totalPrice ?? 0),
                        0
                    );

                    const shippingFee = order.shippingFee ?? 0;
                    const shippingMethod =
                        order.shippingMethod === "express" ? "Express" : "Standard";
                    const trackingNumber = order.trackingNumber ?? "";
                    const grandTotal = productTotal + shippingFee;
                    const isOpen = expandedId === order.id;

                    const returnedItemIds = getReturnedItemIds(order); // ✅ sadece bir kez hesapla

                    return (
                        <div className="order-block" key={order.id}>
                            <div className="orders-row">
                                <div>{idx + 1}</div>
                                <div>R-{String(order.id).padStart(6, "0")}</div>
                                <div>
                                    {new Date(order.orderDate).toLocaleString("tr-TR")}
                                </div>
                                <div>
                                    <span className={statusClass(order.status)}>
                                        {labelFromStatus(order.status)}
                                    </span>
                                </div>
                                <div>{formatTL(grandTotal)}</div>
                                <div className="actions">
                                    {canCancel(order.status) && (
                                        <button
                                            className="btn btn-link"
                                            onClick={() => cancelOrder(order.id)}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    {canReturn(order) && (
                                        <button
                                            className="btn btn-link"
                                            onClick={() => openReturnModal(order)}
                                        >
                                            Return
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-outline"
                                        onClick={() =>
                                            setExpandedId(isOpen ? null : order.id)
                                        }
                                    >
                                        {isOpen ? "Hide" : "Details"}
                                    </button>
                                </div>
                            </div>

                            {isOpen && (
                                <div className="order-detail">
                                    <OrderTimeline status={order.status} />

                                    {/* ✅ Return info sadece returnStatus belli bir seviyeye geldiyse */}
                                    {(order.returnStatus === "Approved" ||
                                        order.returnStatus === "InTransit" ||
                                        order.returnStatus === "Received" ||
                                        order.returnStatus === "RefundCompleted" ||
                                        order.returnStatus === "Rejected") && (
                                        <div className="return-info">
                                            {/* ✅ İade süreci timeline */}
                                            <ReturnTimeline
                                                returnStatus={order.returnStatus}
                                                returnCode={order.returnCode}
                                            />

                                            <h4>Return Information</h4>
                                            {order.returnStatus && (
                                                <div>
                                                    <strong>Status:</strong>{" "}
                                                    {order.returnStatus}
                                                </div>
                                            )}
                                            {order.returnReason && (
                                                <div>
                                                    <strong>Reason:</strong>{" "}
                                                    {order.returnReason}
                                                </div>
                                            )}
                                            {order.returnNotes && (
                                                <div>
                                                    <strong>Notes:</strong>{" "}
                                                    {order.returnNotes}
                                                </div>
                                            )}
                                            {returnedItemIds.length > 0 && (
                                                <div>
                                                    <strong>Returned Items:</strong>{" "}
                                                    {returnedItemIds.length} item(s)
                                                </div>
                                            )}
                                            {order.returnRequestDate && (
                                                <div>
                                                    <strong>Requested:</strong>{" "}
                                                    {new Date(
                                                        order.returnRequestDate
                                                    ).toLocaleString("tr-TR")}
                                                </div>
                                            )}
                                            {order.returnAdminNotes && (
                                                <div>
                                                    <strong>Admin Response:</strong>{" "}
                                                    {order.returnAdminNotes}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="items">
                                        {(order.items ?? []).map((it, i) => {
                                            const itemId =
                                                it.orderItemId ?? it.OrderItemId;

                                            // ✅ "returned" badge için düzeltme:
                                            const isReturned =
                                                (order.returnStatus === "Approved" ||
                                                    order.returnStatus ===
                                                    "RefundCompleted") &&
                                                returnedItemIds.includes(itemId);

                                            return (
                                                <div
                                                    key={i}
                                                    className={`item ${
                                                        isReturned
                                                            ? "is-returned"
                                                            : ""
                                                    }`}
                                                >
                                                    <img
                                                        src={
                                                            it.productImage?.startsWith(
                                                                "http"
                                                            )
                                                                ? it.productImage
                                                                : `http://localhost:5011${
                                                                    it.productImage ??
                                                                    ""
                                                                }`
                                                        }
                                                        alt={it.productName}
                                                        onError={(e) => {
                                                            e.currentTarget.src =
                                                                "https://via.placeholder.com/64";
                                                        }}
                                                    />
                                                    <div className="meta">
                                                        <div className="name">
                                                            {it.productName}
                                                        </div>
                                                        <div className="sub">
                                                            Qty: {it.quantity} ·
                                                            Unit:{" "}
                                                            {formatTL(
                                                                it.unitPrice
                                                            )}
                                                        </div>
                                                        {isReturned && (
                                                            <span className="returned-badge">
                                                                Returned
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="line-total">
                                                        {formatTL(it.totalPrice)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="shipping-info">
                                        <div>
                                            <span>Shipping Method</span>
                                            <b>{shippingMethod}</b>
                                        </div>
                                        {trackingNumber && (
                                            <div>
                                                <span>Tracking Number</span>
                                                <b>{trackingNumber}</b>
                                            </div>
                                        )}
                                    </div>

                                    <div className="order-total">
                                        <div className="totals-grid">
                                            <div>
                                                <span>Subtotal</span>
                                                <b>{formatTL(productTotal)}</b>
                                            </div>
                                            <div>
                                                <span>
                                                    Shipping ({shippingMethod})
                                                </span>
                                                <b>{formatTL(shippingFee)}</b>
                                            </div>
                                            <div className="grand">
                                                <span>Grand Total</span>
                                                <b>{formatTL(grandTotal)}</b>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {returnModal && (
                <div
                    className="modal-overlay"
                    onClick={() => setReturnModal(null)}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3>Request Return</h3>
                        <p>Order #{returnModal.id}</p>

                        <div className="return-warning">
                            <span>⏰</span>
                            <div>
                                <strong>
                                    {getRemainingDays(returnModal.orderDate)} days
                                    remaining
                                </strong>{" "}
                                to request a return (15-day policy)
                            </div>
                        </div>

                        <div className="return-items-section">
                            <h4>Select Items to Return</h4>
                            <div className="return-items-list">
                                {(returnModal.items || []).map((it, i) => {
                                    const itemId =
                                        it.orderItemId ?? it.OrderItemId;
                                    const isSelected =
                                        selectedItems.includes(itemId);
                                    const variantImage =
                                        it.variantImage ?? it.VariantImage;
                                    const productImage =
                                        it.productImage ?? it.ProductImage;
                                    const img =
                                        variantImage ?? productImage ?? "";
                                    const nameBase =
                                        it.productName ?? it.ProductName;
                                    const vName =
                                        it.variantName ?? it.VariantName;
                                    const name = vName
                                        ? `${nameBase} - ${vName}`
                                        : nameBase;

                                    return (
                                        <div
                                            key={i}
                                            className={`return-item ${
                                                isSelected ? "selected" : ""
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) =>
                                                    toggleItem(itemId, e)
                                                }
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            />
                                            <img
                                                src={
                                                    img?.startsWith?.("http")
                                                        ? img
                                                        : `http://localhost:5011${img}`
                                                }
                                                alt={name}
                                                onError={(e) =>
                                                    (e.currentTarget.src =
                                                        "https://via.placeholder.com/50")
                                                }
                                            />
                                            <div className="return-item-info">
                                                <div className="name">
                                                    {name}
                                                </div>
                                                <div className="sub">
                                                    Qty:{" "}
                                                    {it.quantity ?? it.Quantity} ·{" "}
                                                    {formatTL(
                                                        it.unitPrice ??
                                                        it.UnitPrice
                                                    )}
                                                </div>
                                            </div>
                                            <div className="total">
                                                {formatTL(
                                                    it.totalPrice ??
                                                    it.TotalPrice
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <label>
                            Reason for Return *
                            <select
                                value={returnReason}
                                onChange={(e) =>
                                    setReturnReason(e.target.value)
                                }
                            >
                                <option value="">Select reason</option>
                                <option value="Defective product">
                                    Defective product
                                </option>
                                <option value="Wrong item">Wrong item</option>
                                <option value="Not as described">
                                    Not as described
                                </option>
                                <option value="Changed my mind">
                                    Changed my mind
                                </option>
                                <option value="Other">Other</option>
                            </select>
                        </label>

                        <label>
                            Additional Notes
                            <textarea
                                value={returnNotes}
                                onChange={(e) =>
                                    setReturnNotes(e.target.value)
                                }
                                rows={4}
                                placeholder="Provide more details about your return..."
                            />
                        </label>

                        <div className="modal-actions">
                            <button
                                className="btn btn-outline"
                                onClick={() => setReturnModal(null)}
                            >
                                Cancel
                            </button>
                            <button className="btn" onClick={submitReturn}>
                                Submit Return ({selectedItems.length} item
                                {selectedItems.length !== 1 ? "s" : ""})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
