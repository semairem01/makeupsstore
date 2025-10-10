// src/admin/OrdersAdmin.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";

const STATUS = ["SiparisAlindi","Hazirlaniyor","Kargoda","TeslimEdildi","IptalEdildi"];

// ₺
const tl = (n) => Number(n || 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

export default function OrdersAdmin() {
    const token = localStorage.getItem("token");
    const [orders, setOrders] = useState([]);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const load = async () => {
        setLoading(true);
        setErr("");
        try {
            const params = new URLSearchParams();
            if (q) params.append("q", q);
            if (status) params.append("status", status);

            const res = await axios.get(`${API_ENDPOINTS.ADMIN_ORDERS}?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setOrders(res.data || []);
        } catch (e) {
            setErr(e?.response?.data ?? "Failed to load orders.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [token, status]);

    // Durum / takip no güncelle
    const setOrderStatus = async (id, newStatus, currentTracking) => {
        // Kargoda aşamasına geçerken takip no iste (yoksa)
        let trackingNumber = currentTracking || null;
        if (newStatus === "Kargoda" && !trackingNumber) {
            const input = prompt("Kargo takip no (opsiyonel):", "");
            if (input !== null) trackingNumber = input.trim() || null;
        }

        try {
            const res = await axios.put(
                `${API_ENDPOINTS.ADMIN_ORDERS}/${id}/status`,
                { status: newStatus, trackingNumber },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // PUT yanıtıyla satırı anında güncelle
            const upd = res?.data || {};
            setOrders(prev =>
                prev.map(row =>
                    row.id === id
                        ? {
                            ...row,
                            statusText: upd.statusText ?? newStatus,
                            status:     upd.statusText ?? newStatus, // geriye dönük
                            trackingNumber: upd.trackingNumber ?? trackingNumber ?? row.trackingNumber
                        }
                        : row
                )
            );
        } catch (e) {
            alert(e?.response?.data ?? "Failed to update status.");
        }
    };

    const onKeyDown = (e) => { if (e.key === "Enter") load(); };

    return (
        <div>
            <h2>Siparişler</h2>

            <div className="toolbar" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                    placeholder="Ara (isim/email/sipariş no)"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={onKeyDown}
                    style={{ flex: 1 }}
                />
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">Tümü</option>
                    {STATUS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <button onClick={load}>Yenile</button>
            </div>

            {err && <div style={{ color: "crimson", marginBottom: 8 }}>{err}</div>}
            {loading && <div>Yükleniyor…</div>}

            {!loading && (
                <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                    <tr>
                        <th>#</th>
                        <th>Müşteri</th>
                        <th>Tarih</th>
                        <th>Ürün Toplam</th>
                        <th>Kargo</th>
                        <th>Genel Toplam</th>
                        <th>Yöntem</th>
                        <th>Durum</th>
                        <th>Takip No</th>
                        <th>Aksiyon</th>
                    </tr>
                    </thead>
                    <tbody>
                    {orders.map((o) => {
                        // Backend alanları farklı isimlerle gelebilir → geriye dönük destek
                        const productTotal = (o.productTotal ?? o.total ?? 0);
                        const shippingFee  = (o.shipping ?? o.shippingFee ?? 0);
                        const grandTotal   = (o.grandTotal ?? (productTotal + shippingFee));
                        const statusText   = (o.statusText ?? o.status ?? "SiparisAlindi");
                        const tracking     = o.trackingNumber || "-";
                        const method       = o.shippingMethod || "-";

                        return (
                            <tr key={o.id}>
                                <td>{o.id}</td>
                                <td>{o.customerName}</td>
                                <td>{new Date(o.orderDate).toLocaleString("tr-TR")}</td>
                                <td>{tl(productTotal)}</td>
                                <td>{tl(shippingFee)}</td>
                                <td><b>{tl(grandTotal)}</b></td>
                                <td>{method}</td>
                                <td>{statusText}</td>
                                <td>{tracking}</td>
                                <td>
                                    <select
                                        value={statusText}
                                        onChange={(e) => setOrderStatus(o.id, e.target.value, o.trackingNumber)}
                                    >
                                        {STATUS.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                        );
                    })}
                    {!orders.length && (
                        <tr>
                            <td colSpan={10} style={{ textAlign: "center", padding: 16 }}>
                                Kayıt bulunamadı.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            )}
        </div>
    );
}
