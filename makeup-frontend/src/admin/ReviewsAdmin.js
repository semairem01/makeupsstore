import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";

export default function ReviewsAdmin() {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    const [list, setList] = useState([]);
    const [productId, setProductId] = useState("");

    const load = () => {
        const qs = productId ? `?productId=${encodeURIComponent(productId)}` : "";
        axios.get(`${API_ENDPOINTS.ADMIN_REVIEWS}${qs}`, { headers })
            .then(r => setList(r.data || []));
    };

    useEffect(() => { load(); }, [token]);

    const del = async (id) => {
        if (!window.confirm("Yorum silinsin mi?")) return;
        await axios.delete(`${API_ENDPOINTS.ADMIN_REVIEWS}/${id}`, { headers });
        load();
    };

    return (
        <div>
            <h2>Yorumlar</h2>
            <div className="toolbar">
                <input placeholder="Ürün ID (opsiyonel)" value={productId} onChange={e=>setProductId(e.target.value)} />
                <button onClick={load}>Filtrele</button>
            </div>

            <table className="admin-table">
                <thead>
                <tr><th>#</th><th>Ürün</th><th>Kullanıcı</th><th>Puan</th><th>Tarih</th><th>Yorum</th><th></th></tr>
                </thead>
                <tbody>
                {list.map(r=>(
                    <tr key={r.id}>
                        <td>{r.id}</td>
                        <td>{r.productName} (#{r.productId})</td>
                        <td>{r.user}</td>
                        <td>{r.rating}</td>
                        <td>{new Date(r.createdAt).toLocaleString("tr-TR")}</td>
                        <td>{r.comment || "-"}</td>
                        <td><button className="btn-link" onClick={()=>del(r.id)}>Sil</button></td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
