// src/admin/ProductsAdmin.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";

const toNumber = (v) => {
    if (v === null || v === undefined) return 0;
    const s = String(v).trim().replace(/\./g, "").replace(",", ".");
    const n = parseFloat(s);
    return Number.isNaN(n) ? 0 : n;
};
const toInt = (v) => {
    const n = parseInt(String(v ?? "").replace(/\D/g, ""), 10);
    return Number.isNaN(n) ? 0 : n;
};

export default function ProductsAdmin() {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    const [list, setList] = useState([]);
    const [cats, setCats] = useState([]);
    const [q, setQ] = useState("");
    const [editing, setEditing] = useState(null); // id veya null
    const [showForm, setShowForm] = useState(false);

    // price & stockQuantity burada STRING tutuluyor
    const emptyForm = {
        id: 0,
        name: "",
        brand: "",
        description: "",
        price: "",            // ← string
        stockQuantity: "",    // ← string
        isActive: true,
        imageUrl: "/images/placeholder.png",
        color: "",
        size: "",
        categoryId: 0,
    };
    const [form, setForm] = useState(emptyForm);

    const load = () => {
        const qs = q ? `?q=${encodeURIComponent(q)}` : "";
        axios
            .get(`${API_ENDPOINTS.ADMIN_PRODUCTS}${qs}`, { headers })
            .then((r) => setList(r.data || []))
            .catch((err) => {
                console.log("STATUS", err.response?.status);
                console.log("DATA", err.response?.data);
                console.log("ERRORS", err.response?.data?.errors);
                alert(JSON.stringify(err.response?.data?.errors ?? err.response?.data));
            });
    };

    const loadCats = () => {
        axios
            .get(API_ENDPOINTS.ADMIN_CATEGORIES, { headers })
            .then((r) => setCats(r.data || []))
            .catch((err) => {
                console.log("STATUS", err.response?.status);
                console.log("DATA", err.response?.data);
                console.log("ERRORS", err.response?.data?.errors);
                alert(JSON.stringify(err.response?.data?.errors ?? err.response?.data));
            });
    };

    useEffect(() => {
        load();
        loadCats();
    }, []);

    const startCreate = () => {
        setEditing(null);
        setForm({ ...emptyForm, categoryId: cats[0]?.id || 0 });
        setShowForm(true);
    };

    const startEdit = async (id) => {
        try {
            // Kategoriler henüz yüklenmediyse bekle ve eldeki listeyi kullan
            let currentCats = cats;
            if (!currentCats.length) {
                const cRes = await axios.get(API_ENDPOINTS.ADMIN_CATEGORIES, { headers });
                currentCats = cRes.data || [];
                setCats(currentCats);
            }

            // Ürünü çek
            const r = await axios.get(`${API_ENDPOINTS.ADMIN_PRODUCTS}/${id}`, { headers });
            const p = r.data || {};

            const routeId = Number(id);
            const apiId   = Number(p.id) || routeId;

            // Ürünün kategorisi geçerli mi? değilse ilk kategoriye düş
            const catFromApi = Number(p.categoryId) || 0;
            const validCatId = currentCats.some((c) => c.id === catFromApi)
                ? catFromApi
                : (currentCats[0]?.id || 0);

            setEditing(routeId);
            setForm({
                id: apiId,                                             // sayı
                name: p.name ?? "",
                brand: p.brand ?? "",
                description: p.description ?? "",
                price: p.price != null ? String(p.price) : "",         // string (input için)
                stockQuantity: p.stockQuantity != null ? String(p.stockQuantity) : "",
                isActive: !!p.isActive,
                imageUrl: p.imageUrl ?? "",
                color: p.color ?? "",
                size: p.size ?? "",
                categoryId: validCatId,
            });
            setShowForm(true);
        } catch (err) {
            const data = err.response?.data;
            const printable =
                typeof data === "string"
                    ? data
                    : data?.errors
                        ? data.errors
                        : (data?.title || data || "Bilinmeyen hata");

            console.log("STATUS", err.response?.status);
            console.log("DATA", data);
            console.log("ERRORS", data?.errors);
            alert(typeof printable === "string" ? printable : JSON.stringify(printable, null, 2));
        }
    };

    const save = async () => {
        const payload = {
            name: (form.name || "").trim(),
            brand: (form.brand || "").trim(),
            description: (form.description || "").trim(),
            price: toNumber(form.price),                 // number
            stockQuantity: toInt(form.stockQuantity),    // number
            isActive: !!form.isActive,
            imageUrl: (form.imageUrl || "").trim(),
            color: form.color?.trim() || null,
            size: form.size?.trim() || null,
            categoryId: Number(form.categoryId) || 0,
        };

        if (!payload.name) { alert("Ürün adı zorunlu."); return; }
        if (!payload.categoryId) { alert("Kategori seçin."); return; }

        const cfg = {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            validateStatus: () => true,
        };

        const idNum = Number(form.id || 0); // güvene al
        const url = editing ? `${API_ENDPOINTS.ADMIN_PRODUCTS}/${idNum}` : API_ENDPOINTS.ADMIN_PRODUCTS;
        const body = editing ? { id: idNum, ...payload } : payload;

        console.log("REQ", editing ? "PUT" : "POST", url, body);

        const resp = await axios({ method: editing ? "PUT" : "POST", url, data: body, ...cfg });

        if (resp.status >= 200 && resp.status < 300) {
            setEditing(null);
            setForm(emptyForm);
            setShowForm(false);
            load();
            return;
        }

        const data = resp.data;
        const printable = typeof data === "string"
            ? data
            : data?.errors ? data.errors : (data?.title || data || "Bilinmeyen hata");

        console.log("REQ", editing ? "PUT" : "POST", url, body);
        console.log("STATUS", resp.status);
        console.log("DATA", data);
        alert(typeof printable === "string" ? printable : JSON.stringify(printable, null, 2));
    };

    const del = async (id) => {
        if (!window.confirm("Silinsin mi?")) return;
        try {
            await axios.delete(`${API_ENDPOINTS.ADMIN_PRODUCTS}/${id}`, { headers });
            load();
        } catch (err) {
            console.log("STATUS", err.response?.status);
            console.log("DATA", err.response?.data);
            console.log("ERRORS", err.response?.data?.errors);
            alert(JSON.stringify(err.response?.data?.errors ?? err.response?.data));
        }
    };

    return (
        <div>
            <h2>Ürünler</h2>

            <div className="toolbar">
                <input
                    placeholder="Ara..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
                <button onClick={load}>Ara</button>
                <button onClick={startCreate}>+ Yeni Ürün</button>
            </div>

            {showForm && (
                <div className="card" style={{ margin: "12px 0", padding: 12 }}>
                    <h3>{editing ? "Ürünü Güncelle" : "Yeni Ürün"}</h3>
                    <div className="grid2">
                        <label>
                            Ad
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </label>
                        <label>
                            Marka
                            <input
                                value={form.brand}
                                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                            />
                        </label>
                        <label>
                            Kategori
                            <select
                                value={form.categoryId}
                                onChange={(e) =>
                                    setForm({ ...form, categoryId: Number(e.target.value) })
                                }
                            >
                                {cats.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Fiyat
                            <input
                                type="text"
                                inputMode="decimal"
                                value={form.price}
                                onChange={(e) => setForm({ ...form, price: e.target.value })}
                            />
                        </label>
                        <label>
                            Stok
                            <input
                                type="text"
                                inputMode="numeric"
                                value={form.stockQuantity}
                                onChange={(e) =>
                                    setForm({ ...form, stockQuantity: e.target.value })
                                }
                            />
                        </label>
                        <label>
                            Aktif
                            <input
                                type="checkbox"
                                checked={form.isActive}
                                onChange={(e) =>
                                    setForm({ ...form, isActive: e.target.checked })
                                }
                            />
                        </label>
                        <label>
                            Görsel URL
                            <input
                                value={form.imageUrl}
                                onChange={(e) =>
                                    setForm({ ...form, imageUrl: e.target.value })
                                }
                            />
                        </label>
                        <label>
                            Renk
                            <input
                                value={form.color}
                                onChange={(e) => setForm({ ...form, color: e.target.value })}
                            />
                        </label>
                        <label>
                            Beden/Size
                            <input
                                value={form.size}
                                onChange={(e) => setForm({ ...form, size: e.target.value })}
                            />
                        </label>
                    </div>
                    <label>
                        Açıklama
                        <textarea
                            rows={4}
                            value={form.description}
                            onChange={(e) =>
                                setForm({ ...form, description: e.target.value })
                            }
                        />
                    </label>

                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button onClick={save}>{editing ? "Kaydet" : "Ekle"}</button>
                        <button
                            className="btn-outline"
                            onClick={() => {
                                setEditing(null);
                                setForm(emptyForm);
                                setShowForm(false);
                            }}
                        >
                            İptal
                        </button>
                    </div>
                </div>
            )}

            <table className="admin-table">
                <thead>
                <tr>
                    <th>#</th>
                    <th>Ad</th>
                    <th>Marka</th>
                    <th>Kategori</th>
                    <th>Fiyat</th>
                    <th>Stok</th>
                    <th>Aktif</th>
                    <th></th>
                </tr>
                </thead>
                <tbody>
                {list.map((p) => (
                    <tr key={p.id}>
                        <td>{p.id}</td>
                        <td>{p.name}</td>
                        <td>{p.brand}</td>
                        <td>{p.categoryName}</td>
                        <td>₺{Number(p.price).toLocaleString("tr-TR")}</td>
                        <td>{p.stockQuantity}</td>
                        <td>{p.isActive ? "Evet" : "Hayır"}</td>
                        <td style={{ whiteSpace: "nowrap", display: "flex", gap: "8px" }}>
                            <button className="btn-link" onClick={() => startEdit(p.id)}>
                                Düzenle
                            </button>
                            <button
                                className="btn-link danger"
                                onClick={() => del(p.id)}
                            >
                                Sil
                            </button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
