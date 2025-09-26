import React,{useEffect,useState} from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";

export default function ProductsAdmin(){
    const token = localStorage.getItem("token");
    const [list,setList] = useState([]);
    const [q,setQ] = useState("");

    const load = () => {
        const qs = q ? `?q=${encodeURIComponent(q)}` : "";
        axios.get(`${API_ENDPOINTS.ADMIN_PRODUCTS}${qs}`, { headers:{Authorization:`Bearer ${token}`}})
            .then(r=>setList(r.data||[]));
    };

    useEffect(()=>{ load(); },[token]);

    const addQuick = async () => {
        await axios.post(API_ENDPOINTS.ADMIN_PRODUCTS, {
            name:"Yeni Ürün", brand:"Marka", description:"", price:0, stockQuantity:0,
            isActive:true, imageUrl:"/images/placeholder.png", color:null, size:null, categoryId:1
        }, { headers:{Authorization:`Bearer ${token}` }});
        load();
    };

    const del = async (id) => {
        if (!window.confirm("Silinsin mi?")) return;
        await axios.delete(`${API_ENDPOINTS.ADMIN_PRODUCTS}/${id}`, { headers:{Authorization:`Bearer ${token}` }});
        load();
    };

    return (
        <div>
            <h2>Ürünler</h2>
            <div className="toolbar">
                <input placeholder="Ara..." value={q} onChange={e=>setQ(e.target.value)} />
                <button onClick={load}>Ara</button>
                <button onClick={addQuick}>+ Hızlı Ekle</button>
            </div>
            <table className="admin-table">
                <thead>
                <tr><th>#</th><th>Ad</th><th>Marka</th><th>Fiyat</th><th>Stok</th><th>Aktif</th><th></th></tr>
                </thead>
                <tbody>
                {list.map(p=>(
                    <tr key={p.id}>
                        <td>{p.id}</td>
                        <td>{p.name}</td>
                        <td>{p.brand}</td>
                        <td>₺{Number(p.price).toLocaleString("tr-TR")}</td>
                        <td>{p.stockQuantity}</td>
                        <td>{p.isActive ? "Evet" : "Hayır"}</td>
                        <td><button className="btn-link" onClick={()=>del(p.id)}>Sil</button></td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
