import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
const STATUS = ["SiparisAlindi","Hazirlaniyor","Kargoda","TeslimEdildi","IptalEdildi"];

export default function OrdersAdmin(){
    const token = localStorage.getItem("token");
    const [orders,setOrders] = useState([]);
    const [q,setQ] = useState("");
    const [status,setStatus] = useState("");

    const load = () => {
        const params = new URLSearchParams();
        if (q) params.append("q", q);
        if (status) params.append("status", status);
        axios.get(`${API_ENDPOINTS.ADMIN_ORDERS}?${params}`, { headers:{ Authorization:`Bearer ${token}` }})
            .then(r=>setOrders(r.data||[]));
    };

    useEffect(()=>{ load(); },[token, status]);

    const setOrderStatus = async (id, newStatus) => {
        const trackingNumber = prompt("Kargo takip no (opsiyonel):", "");
        await axios.put(`${API_ENDPOINTS.ADMIN_ORDERS}/${id}/status`,
            { status:newStatus, trackingNumber: trackingNumber || null },
            { headers:{ Authorization:`Bearer ${token}` }});
        load();
    };

    return (
        <div>
            <h2>Siparişler</h2>
            <div className="toolbar">
                <input placeholder="Ara (isim/email/sipariş no)" value={q} onChange={e=>setQ(e.target.value)} />
                <select value={status} onChange={e=>setStatus(e.target.value)}>
                    <option value="">Tümü</option>
                    {STATUS.map(s=> <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={load}>Yenile</button>
            </div>

            <table className="admin-table">
                <thead>
                <tr><th>#</th><th>Müşteri</th><th>Tarih</th><th>Tutar</th><th>Durum</th><th>Takip No</th><th>Aksiyon</th></tr>
                </thead>
                <tbody>
                {orders.map(o=>(
                    <tr key={o.id}>
                        <td>{o.id}</td>
                        <td>{o.customerName}</td>
                        <td>{new Date(o.orderDate).toLocaleString("tr-TR")}</td>
                        <td>₺{Number(o.total||0).toLocaleString("tr-TR")}</td>
                        <td>{o.status}</td>
                        <td>{o.trackingNumber || "-"}</td>
                        <td>
                            <select value={o.status} onChange={e=>setOrderStatus(o.id, e.target.value)}>
                                {STATUS.map(s=> <option key={s} value={s}>{s}</option>)}
                            </select>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
