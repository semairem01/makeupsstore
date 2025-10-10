// src/components/ProfilePage.js
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import "./ProfilePage.css";
import ProfileOrders from "./ProfileOrders";
export default function ProfilePage() {
    const token = localStorage.getItem("token");
    const [tab, setTab] = useState("account");
    const [me, setMe] = useState(null);
    const [form, setForm] = useState({ firstName: "", lastName: "", phone: "" });

    useEffect(() => {
        axios
            .get(`${API_ENDPOINTS.PROFILE}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                setMe(res.data);
                setForm({
                    firstName: res.data.firstName ?? "",
                    lastName: res.data.lastName ?? "",
                    phone: res.data.phone ?? "",
                });
            });
    }, [token]);

    const save = async () => {
        await axios.put(`${API_ENDPOINTS.PROFILE}`, form, {
            headers: { Authorization: `Bearer ${token}` },
        });
        alert("Kaydedildi");
    };

    const upload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file);
        const res = await axios.post(`${API_ENDPOINTS.PROFILE}/avatar`, fd, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "multipart/form-data",
            },
        });
        setMe((m) => ({ ...m, avatarUrl: res.data.avatarUrl }));
        localStorage.setItem("avatarUrl", res.data.avatarUrl); // navbar avatarı güncellesin
    };

    return (
        <div className="profile-wrap">
            <div className="tabs">
                <button className={tab === "account" ? "active" : ""} onClick={() => setTab("account")}>Hesap</button>
                <button className={tab === "addresses" ? "active" : ""} onClick={() => setTab("addresses")}>Adresler</button>
                <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>Siparişlerim</button>
                <button className={tab === "favorites" ? "active" : ""} onClick={() => setTab("favorites")}>Favoriler</button>
                <button className={tab === "password" ? "active" : ""} onClick={() => setTab("password")}>Şifre</button>
            </div>

            {tab === "account" && me && (
                <div className="card">
                    <div className="avatar-col">
                        <img
                            src={me.avatarUrl ? `http://localhost:5011${me.avatarUrl}` : "https://via.placeholder.com/96"}
                            alt=""
                            className="avatar"
                            onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/96"; }}
                        />
                        <label className="btn btn-outline">
                            Fotoğraf Yükle
                            <input type="file" hidden onChange={upload} />
                        </label>
                    </div>
                    <div className="form-col">
                        <div className="row">
                            <label>Ad</label>
                            <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                        </div>
                        <div className="row">
                            <label>Soyad</label>
                            <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                        </div>
                        <div className="row">
                            <label>Telefon</label>
                            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div className="row">
                            <label>E-posta</label>
                            <input value={me.email} readOnly />
                        </div>
                        <div className="actions">
                            <button className="btn" onClick={save}>Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            {tab === "favorites" && <FavoritesList />}
            {tab === "orders" && <ProfileOrders />}
            {tab === "addresses" && <div className="card muted">Adres yönetimini 2 adımda ekleriz (liste + ekle/düzenle modal).</div>}
            {tab === "password" && <ChangePasswordCard />}
        </div>
    );
}

function FavoritesList() {
    const token = localStorage.getItem("token");
    const [items, setItems] = useState([]);

    const load = useCallback(() => {
        return axios
            .get(`${API_ENDPOINTS.FAVORITES}`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => setItems(r.data));
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const remove = async (pid) => {
        await axios.delete(`${API_ENDPOINTS.FAVORITES}/${pid}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        load();
    };

    if (!items.length) return <div className="card muted">Henüz favoriniz yok.</div>;

    return (
        <div className="grid">
            {items.map((p) => (
                <div key={p.productId} className="fav-card">
                    <img
                        src={`http://localhost:5011${p.imageUrl}`}
                        alt=""
                        onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/120"; }}
                    />
                    <div className="meta">
                        <div className="name">{p.name}</div>
                        <div className="brand">{p.brand}</div>
                        <div className="price">₺{p.price}</div>
                    </div>
                    <button className="btn btn-outline" onClick={() => remove(p.productId)}>Kaldır</button>
                </div>
            ))}
        </div>
    );
}

function ChangePasswordCard() {
    const [f, setF] = useState({ old: "", newPwd: "", confirm: "" });

    const submit = async () => {
        alert("(Örnek) Şifre güncelleme isteği gönderilecek.");
    };

    return (
        <div className="card">
            <div className="row">
                <label>Eski Şifre</label>
                <input type="password" value={f.old} onChange={(e) => setF({ ...f, old: e.target.value })} />
            </div>
            <div className="row">
                <label>Yeni Şifre</label>
                <input type="password" value={f.newPwd} onChange={(e) => setF({ ...f, newPwd: e.target.value })} />
            </div>
            <div className="row">
                <label>Yeni Şifre (Tekrar)</label>
                <input type="password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} />
            </div>
            <div className="actions">
                <button className="btn" onClick={submit}>Şifreyi Güncelle</button>
            </div>
        </div>
    );

}
