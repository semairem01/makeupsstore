// src/components/ProfileOrders.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import OrderTimeline from "./OrderTimeline";
import "./ProfileOrders.css";

const tl = (n) =>
    Number(n || 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

const statusLabel = (s) =>
    s === "SiparisAlindi" ? "Order Received" :
        s === "Hazirlaniyor"  ? "Preparing" :
            s === "Kargoda"       ? "Shipped" :
                s === "TeslimEdildi"  ? "Delivered" :
                    s === "IptalEdildi"   ? "Canceled"  : s;

const statusClass = (s) =>
    s === "SiparisAlindi" ? "pill pill-pending" :
        s === "Hazirlaniyor"  ? "pill pill-prep"    :
            s === "Kargoda"       ? "pill pill-ship"    :
                s === "TeslimEdildi"  ? "pill pill-done"    :
                    s === "IptalEdildi"   ? "pill pill-cancel"  : "pill";

export default function ProfileOrders() {
    const [orders, setOrders] = useState([]);
    const [openId, setOpenId] = useState(null);
    const token = localStorage.getItem("token");

    const reload = async () => {
        const r = await axios.get(API_ENDPOINTS.ORDERS, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(r.data || []);
    };

    useEffect(() => { reload().catch(() => setOrders([])); }, [token]);

    const cancelOrder = async (orderId) => {
        if (!window.confirm("Bu siparişi iptal etmek istediğinize emin misiniz?")) return;
        try {
            await axios.post(`${API_ENDPOINTS.ORDERS}/${orderId}/cancel`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "IptalEdildi" } : o)));
            if (openId === orderId) setOpenId(null);
            reload();
            alert("Sipariş iptal edildi.");
        } catch (e) {
            alert(e?.response?.data ?? "İptal sırasında bir hata oluştu.");
        }
    };

    if (!orders.length) {
        return (
            <div className="po-empty">
                Henüz siparişiniz yok. <br />🌸 Yeni ürünleri keşfetmeye ne dersiniz?
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

                return (
                    <div key={o.id} className={`po-card ${isOpen ? "open" : ""}`}>
                        <div className="po-head" onClick={() => setOpenId(isOpen ? null : o.id)}>
                            <div className="po-title">
                                <b>Order</b> #{String(o.id).padStart(6, "0")}
                                <span className={statusClass(o.status)} style={{ marginLeft: 8 }}>
                  {statusLabel(o.status)}
                </span>
                            </div>
                            <div className="po-date">{new Date(o.orderDate).toLocaleString("tr-TR")}</div>
                            <div className="po-total">{tl(grand)}</div>
                            <button className="po-toggle" aria-expanded={isOpen}>
                                {isOpen ? "▲ Gizle" : "▼ Detaylar"}
                            </button>
                        </div>

                        {isOpen && (
                            <div className="po-body">
                                <OrderTimeline status={o.status} compact />

                                <div className={`po-items ${o.status === "IptalEdildi" ? "is-canceled" : ""}`}>
                                    {(o.items || []).map((it, i) => {
                                        const variantImage = it.variantImage ?? it.VariantImage;
                                        const productImage = it.productImage ?? it.ProductImage;
                                        const img = variantImage ?? productImage ?? "";
                                        const nameBase = it.productName ?? it.ProductName;
                                        const vName = it.variantName ?? it.VariantName;
                                        const name = vName ? `${nameBase} - ${vName}` : nameBase;

                                        return (
                                            <div key={i} className="po-item">
                                                <img
                                                    src={img?.startsWith?.("http") ? img : `http://localhost:5011${img}`}
                                                    alt={name}
                                                    onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/64")}
                                                />
                                                <div className="po-meta">
                                                    <div className="po-name">{name}</div>
                                                    <div className="po-sub">
                                                        Adet: {it.quantity ?? it.Quantity} · Fiyat: {tl(it.unitPrice ?? it.UnitPrice)}
                                                    </div>
                                                </div>
                                                <div className="po-line">{tl(it.totalPrice ?? it.TotalPrice)}</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {canCancel && (
                                    <div className="po-actions">
                                        <button className="po-cancel" onClick={() => cancelOrder(o.id)}>
                                            İptal Et
                                        </button>
                                    </div>
                                )}

                                <div className="po-ship">
                                    <div><span>Kargo Yöntemi</span><b>{shipMethod}</b></div>
                                    {showTracking && (
                                        <div><span>Kargo Takip No</span><b>{tracking || "Bekleniyor"}</b></div>
                                    )}
                                </div>

                                <div className="po-totals">
                                    <div><span>Ara Toplam</span><b>{tl(productTotal)}</b></div>
                                    <div><span>Kargo ({shipMethod})</span><b>{tl(shipFee)}</b></div>
                                    <div className="po-grand"><span>Genel Toplam</span><b>{tl(grand)}</b></div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
