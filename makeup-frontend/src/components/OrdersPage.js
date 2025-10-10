// src/components/OrdersPage.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import "./OrdersPage.css";
import OrderTimeline, { STATUS_STEPS } from "./OrderTimeline";

// Get index of the current status (kept for local needs if required elsewhere)
function statusIndex(status) {
    const i = STATUS_STEPS.findIndex((s) => s.key === status);
    return i >= 0 ? i : 0;
}

// Human readable label for status (kept for pill)
function labelFromStatus(status) {
    return STATUS_STEPS.find((s) => s.key === status)?.label || status;
}

// Map status to pill classes
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
            return "pill pill-cancel";
        default:
            return "pill";
    }
}

// Format number as TRY currency
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
    const token = localStorage.getItem("token");

    // Fetch user's orders
    const fetchOrders = () =>
        axios
            .get(`${API_ENDPOINTS.ORDERS}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => setOrders(res.data || []))
            .catch((err) => console.error("Failed to load orders:", err));

    useEffect(() => {
        fetchOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    // Cancel order (only when status is cancellable)
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
            alert(e?.response?.data ?? "An error occurred while canceling.");
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
                {/* Table header */}
                <div className="orders-head">
                    <div>#</div>
                    <div>Order No</div>
                    <div>Date</div>
                    <div>Status</div>
                    <div>Total</div>
                    <div>Actions</div>
                </div>

                {orders.map((order, idx) => {
                    // Calculate product total from item DTO (already includes discounts)
                    const productTotal = (order.items ?? []).reduce(
                        (sum, it) =>
                            sum +
                            (it.totalPrice ??
                                it.TotalPrice ??
                                (it.unitPrice ?? it.UnitPrice ?? 0) *
                                (it.quantity ?? it.Quantity ?? 1)),
                        0
                    );

                    // Shipping fee & method persisted on order
                    const shippingFee = order.shippingFee ?? order.ShippingFee ?? 0;
                    const shippingMethod =
                        (order.shippingMethod ?? order.ShippingMethod ?? "standard") ===
                        "express"
                            ? "Express"
                            : "Standard";
                    const trackingNumber =
                        order.trackingNumber ?? order.TrackingNumber ?? "";

                    // Final grand total
                    const grandTotal = productTotal + shippingFee;

                    const canCancel =
                        order.status === "SiparisAlindi" || order.status === "Hazirlaniyor";
                    const isOpen = expandedId === order.id;

                    return (
                        <div className="order-block" key={order.id}>
                            {/* Order summary row */}
                            <div className="orders-row">
                                <div>{idx + 1}</div>
                                <div>R-{String(order.id).padStart(6, "0")}</div>
                                <div>{new Date(order.orderDate).toLocaleString("tr-TR")}</div>
                                <div>
                  <span className={statusClass(order.status)}>
                    {labelFromStatus(order.status)}
                  </span>
                                </div>
                                <div>{formatTL(grandTotal)}</div>
                                <div className="actions">
                                    {canCancel && (
                                        <button
                                            className="btn btn-link"
                                            onClick={() => cancelOrder(order.id)}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => setExpandedId(isOpen ? null : order.id)}
                                        aria-expanded={isOpen}
                                    >
                                        {isOpen ? "Hide" : "Details"}
                                    </button>
                                </div>
                            </div>

                            {/* Order detail section */}
                            {isOpen && (
                                <div className="order-detail">
                                    {/* ✅ Re-usable timeline */}
                                    <OrderTimeline status={order.status} />

                                    {/* Product list */}
                                    <div className="items">
                                        {(order.items ?? []).map((it, i) => (
                                            <div key={i} className="item">
                                                <img
                                                    src={
                                                        (it.productImage ?? it.ProductImage)?.startsWith(
                                                            "http"
                                                        )
                                                            ? it.productImage ?? it.ProductImage
                                                            : `http://localhost:5011${
                                                                it.productImage ?? it.ProductImage ?? ""
                                                            }`
                                                    }
                                                    alt={it.productName ?? it.ProductName}
                                                    onError={(e) => {
                                                        e.currentTarget.src =
                                                            "https://via.placeholder.com/64";
                                                    }}
                                                />
                                                <div className="meta">
                                                    <div className="name">
                                                        {it.productName ?? it.ProductName}
                                                    </div>
                                                    <div className="sub">
                                                        Qty: {it.quantity ?? it.Quantity} · Unit:{" "}
                                                        {formatTL(it.unitPrice ?? it.UnitPrice)}
                                                    </div>
                                                </div>
                                                <div className="line-total">
                                                    {formatTL(it.totalPrice ?? it.TotalPrice)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Shipping info (method + tracking if any) */}
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

                                    {/* Totals */}
                                    <div className="order-total">
                                        <div className="totals-grid">
                                            <div>
                                                <span>Subtotal</span>
                                                <b>{formatTL(productTotal)}</b>
                                            </div>
                                            <div>
                                                <span>Shipping ({shippingMethod})</span>
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
        </div>
    );
}
