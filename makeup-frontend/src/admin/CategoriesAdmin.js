import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";

export default function CategoriesAdmin() {
    const token = localStorage.getItem("token");
    const [list, setList] = useState([]);
    const [q, setQ] = useState("");
    const [name, setName] = useState("");

    const headers = { Authorization: `Bearer ${token}` };

    const load = () => {
        const qs = q ? `?q=${encodeURIComponent(q)}` : "";
        axios.get(`${API_ENDPOINTS.ADMIN_CATEGORIES}${qs}`, { headers })
            .then(r => setList(r.data || []));
    };

    useEffect(() => { load(); }, [token]);

    const add = async () => {
        if (!name.trim()) return;
        await axios.post(API_ENDPOINTS.ADMIN_CATEGORIES, { name: name.trim() }, { headers });
        setName("");
        load();
    };

    const del = async (id) => {
        if (!window.confirm("Silinsin mi?")) return;
        await axios.delete(`${API_ENDPOINTS.ADMIN_CATEGORIES}/${id}`, { headers });
        load();
    };

    return (
        <div>
            <h2>Kategoriler</h2>
            <div className="toolbar">
                <input placeholder="Ara..." value={q} onChange={e=>setQ(e.target.value)} />
                <button onClick={load}>Ara</button>
            </div>

            <div style={{ display:"flex", gap:8, margin:"12px 0" }}>
                <input placeholder="Yeni kategori adı" value={name} onChange={e=>setName(e.target.value)} />
                <button onClick={add}>+ Ekle</button>
            </div>

            <table className="admin-table">
                <thead>
                <tr><th>#</th><th>Ad</th><th></th></tr>
                </thead>
                <tbody>
                {list.map(c=>(
                    <tr key={c.id}>
                        <td>{c.id}</td>
                        <td>{c.name}</td>
                        <td><button className="btn-link" onClick={()=>del(c.id)}>Sil</button></td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
