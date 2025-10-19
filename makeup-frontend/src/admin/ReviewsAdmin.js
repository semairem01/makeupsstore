import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";

export default function ReviewsAdmin() {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    const [list, setList] = useState([]);
    const [productId, setProductId] = useState("");
    const [status, setStatus] = useState(""); // ✅ filtre için

    const approveUrl = (id) => `${API_ENDPOINTS.ADMIN_REVIEWS}/${id}/approve`;
    const rejectUrl  = (id) => `${API_ENDPOINTS.ADMIN_REVIEWS}/${id}/reject`;

    const load = () => {
        const params = new URLSearchParams();
        if (productId) params.set("productId", productId);
        if (status)    params.set("status", status); // ✅ durum filtresi
        const qs = params.toString() ? `?${params.toString()}` : "";

        axios.get(`${API_ENDPOINTS.ADMIN_REVIEWS}${qs}`, { headers })
            .then(r => setList(r.data || []))
            .catch(() => setList([]));
    };

    useEffect(() => { load(); }, [token]);

    const del = async (id) => {
        if (!window.confirm("Yorum silinsin mi?")) return;
        await axios.delete(`${API_ENDPOINTS.ADMIN_REVIEWS}/${id}`, { headers });
        load();
    };

    // ✅ ek: onayla/reddet
    const approve = async (id) => { await axios.post(approveUrl(id), {}, { headers }); load(); };
    const reject  = async (id) => { await axios.post(rejectUrl(id),  {}, { headers }); load(); };

    return (
        <div>
            <h2>Yorumlar</h2>

            <div className="toolbar" style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <input
                    placeholder="Ürün ID (opsiyonel)"
                    value={productId}
                    onChange={e=>setProductId(e.target.value)}
                />
                {/* ✅ durum filtresi */}
                <select value={status} onChange={e=>setStatus(e.target.value)}>
                    <option value="">Durum (hepsi)</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                </select>
                <button onClick={load}>Filtrele</button>
            </div>

            <table className="admin-table">
                <thead>
                <tr>
                    <th>#</th>
                    <th>Ürün</th>
                    <th>Kullanıcı</th>
                    <th>Puan</th>
                    <th>Tarih</th>
                    <th>Doğrulama</th> {/* ✅ yeni */}
                    <th>Durum</th>      {/* ✅ yeni */}
                    <th>Yorum</th>
                    <th></th>
                </tr>
                </thead>
                <tbody>
                {list.map(r=>(
                    <tr key={r.id}>
                        <td>{r.id}</td>
                        <td>{r.productName} (#{r.productId})</td>
                        <td>{r.user}</td>
                        <td>{r.rating}</td>
                        <td>{new Date(r.createdAt).toLocaleString("tr-TR")}</td>
                        <td>{r.isVerifiedPurchase ? "✔ Satın aldı" : "—"}</td> {/* ✅ */}
                        <td>{r.status}</td> {/* ✅ */}
                        <td>{r.comment || "-"}</td>
                        <td style={{ whiteSpace:"nowrap" }}>
                            {/* ✅ yeni aksiyonlar */}
                            <button className="btn-link" onClick={()=>approve(r.id)}>Onayla</button>
                            <button className="btn-link" onClick={()=>reject(r.id)}>Reddet</button>
                            <button className="btn-link danger" onClick={()=>del(r.id)}>Sil</button>
                        </td>
                    </tr>
                ))}
                {!list.length && (
                    <tr><td colSpan={9} style={{textAlign:"center", padding:12}}>Kayıt yok.</td></tr>
                )}
                </tbody>
            </table>
        </div>
    );
}
