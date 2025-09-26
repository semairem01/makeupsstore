// src/components/OrdersPage.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import "./OrdersPage.css";

const STATUS_STEPS = [
    { key: "SiparisAlindi", label: "Sipariş Alındı" },
    { key: "Hazirlaniyor",  label: "Hazırlanıyor" },
    { key: "Kargoda",       label: "Kargoda" },
    { key: "TeslimEdildi",  label: "Teslim Edildi" },
];

function statusIndex(status) {
    const i = STATUS_STEPS.findIndex((s) => s.key === status);
    return i >= 0 ? i : 0;
}

function labelFromStatus(status) {
    return STATUS_STEPS.find((s) => s.key === status)?.label || status;
}

function statusClass(status) {
    switch (status) {
        case "SiparisAlindi": return "pill pill-pending";
        case "Hazirlaniyor":  return "pill pill-prep";
        case "Kargoda":       return "pill pill-ship";
        case "TeslimEdildi":  return "pill pill-done";
        case "IptalEdildi":   return "pill pill-cancel";
        default:              return "pill";
    }
}

function formatTL(n) {
    const val = Number(n ?? 0);
    return val.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });
}

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const token = localStorage.getItem("token");

    const fetchOrders = () =>
        axios
            .get(`${API_ENDPOINTS.ORDERS}`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setOrders(res.data))
            .catch((err) => console.error("Siparişler alınamadı:", err));

    useEffect(() => { fetchOrders(); }, [token]);

    const cancelOrder = async (orderId) => {
        if (!window.confirm("Bu siparişi iptal etmek istediğinize emin misiniz?")) return;
        try {
            await axios.post(
                `${API_ENDPOINTS.ORDERS}/${orderId}/cancel`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await fetchOrders();
        } catch (e) {
            alert(e?.response?.data ?? "İptal sırasında hata oluştu.");
        }
    };

    if (!orders.length) {
        return (
            <div className="orders-wrap">
                <h2 className="page-title">Siparişlerim</h2>
                <div className="empty-box">Henüz siparişiniz yok.</div>
            </div>
        );
    }

    return (
        <div className="orders-wrap">
            <h2 className="page-title">Siparişlerim</h2>

            <div className="orders-table">
                <div className="orders-head">
                    <div>#</div>
                    <div>Sipariş No</div>
                    <div>Tarih</div>
                    <div>Durum</div>
                    <div>Tutar</div>
                    <div>Detay</div>
                </div>

                {orders.map((order, idx) => {
                    const total = (order.items ?? []).reduce(
                        (sum, it) =>
                            sum +
                            (it.totalPrice ??
                                it.TotalPrice ??
                                (it.unitPrice ?? it.UnitPrice ?? 0) * (it.quantity ?? it.Quantity ?? 1)),
                        0
                    );
                    const stepIdx = statusIndex(order.status);
                    const canCancel = order.status === "SiparisAlindi" || order.status === "Hazirlaniyor";
                    const isOpen = expandedId === order.id;

                    return (
                        <div className="order-block" key={order.id}>
                            <div className="orders-row">
                                <div>{idx + 1}</div>
                                <div>R-{String(order.id).padStart(6, "0")}</div>
                                <div>{new Date(order.orderDate).toLocaleString("tr-TR")}</div>
                                <div>
                  <span className={statusClass(order.status)}>
                    {labelFromStatus(order.status)}
                  </span>
                                </div>
                                <div>{formatTL(total)}</div>
                                <div className="actions">
                                    {canCancel && (
                                        <button className="btn btn-link" onClick={() => cancelOrder(order.id)}>
                                            İptal Et
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => setExpandedId(isOpen ? null : order.id)}
                                        aria-expanded={isOpen}
                                    >
                                        {isOpen ? "Gizle" : "Detay"}
                                    </button>
                                </div>
                            </div>

                            {isOpen && (
                                <div className="order-detail">
                                    <div className="progress">
                                        {STATUS_STEPS.map((s, i) => (
                                            <div key={s.key} className={`step ${i <= stepIdx ? "done" : ""}`}>
                                                <div className="dot">{i < stepIdx ? "✓" : i + 1}</div>
                                                <div className="label">{s.label}</div>
                                                {i < STATUS_STEPS.length - 1 && (
                                                    <div className={`bar ${i < stepIdx ? "active" : ""}`} />
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="items">
                                        {(order.items ?? []).map((it, i) => (
                                            <div key={i} className="item">
                                                <img
                                                    src={
                                                        (it.productImage ?? it.ProductImage)?.startsWith("http")
                                                            ? (it.productImage ?? it.ProductImage)
                                                            : `http://localhost:5011${it.productImage ?? it.ProductImage ?? ""}`
                                                    }
                                                    alt={it.productName ?? it.ProductName}
                                                    onError={(e) => {
                                                        e.currentTarget.src = "https://via.placeholder.com/64";
                                                    }}
                                                />
                                                <div className="meta">
                                                    <div className="name">{it.productName ?? it.ProductName}</div>
                                                    <div className="sub">
                                                        Adet: {it.quantity ?? it.Quantity} · Birim:{" "}
                                                        {formatTL(it.unitPrice ?? it.UnitPrice)}
                                                    </div>
                                                </div>
                                                <div className="line-total">
                                                    {formatTL(it.totalPrice ?? it.TotalPrice)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="order-total">
                                        <div>Toplam</div>
                                        <div className="sum">{formatTL(total)}</div>
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
