// src/admin/ProductsAdmin.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS, API_BASE_URL } from "../config";

// ---- helpers ----
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
function getAxiosErrorMessage(errOrResp) {
    const r = errOrResp?.response ?? errOrResp;
    const d = r?.data;
    if (typeof d === "string") return d;
    if (d?.message) return d.message;
    if (d?.detail) return d.detail;
    if (d?.title) return `${d.title} (${r?.status ?? ""})`;
    if (d?.errors) {
        try { return Object.values(d.errors).flat().join("\n"); } catch {}
    }
    try { return JSON.stringify(d ?? errOrResp); } catch { return String(d ?? errOrResp); }
}

// ✅ Bit-mask seçenekleri
const SKIN = [
    { bit: 1,  label: "Dry" },
    { bit: 2,  label: "Oily" },
    { bit: 4,  label: "Combination" },
    { bit: 8,  label: "Sensitive" },
    { bit: 16, label: "Normal" },
];
const toggleBit = (mask, bit) => (mask & bit) ? (mask & ~bit) : (mask | bit);
const ALL_SKIN_MASK = SKIN.reduce((m, s) => (m | s.bit), 0);

// (Opsiyonel) preset butonlarında duplicate'siz tag eklemek için ufak helper
function mergeTags(current, addList) {
    const cur = (current || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
    for (const t of addList) if (!cur.includes(t)) cur.push(t);
    return cur.join(", ");
}

export default function ProductsAdmin() {
    const token = localStorage.getItem("token");
    const authHeaders = { Authorization: `Bearer ${token}` };

    const [list, setList] = useState([]);
    const [cats, setCats] = useState([]);     // parent + subCategories
    const [q, setQ] = useState("");
    const [editing, setEditing] = useState(null); // null => create, sayı => edit id
    const [showForm, setShowForm] = useState(false);

    // form state (price & stock string tutulur)
    const emptyForm = {
        id: 0,
        name: "",
        brand: "",
        description: "",
        price: "",            // string
        stockQuantity: "",    // string
        isActive: true,
        imageUrl: "/images/placeholder.png",
        color: "",
        size: "",
        categoryId: 0,
        discountPercent: "",
        suitableForSkin: ALL_SKIN_MASK,   // varsayılan: tüm ciltlere uygun
        finish: "",
        coverage: "",
        longwear: false,
        waterproof: false,
        photoFriendly: false,
        hasSpf: false,
        fragranceFree: false,
        nonComedogenic: false,
        shadeFamily: "",
        tags: ""
    };
    const [form, setForm] = useState(emptyForm);

    // upload
    const fileRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    const load = () => {
        const qs = q ? `?q=${encodeURIComponent(q)}` : "";
        axios
            .get(`${API_ENDPOINTS.ADMIN_PRODUCTS}${qs}`, { headers: authHeaders })
            .then((r) => setList(r.data || []))
            .catch(() => setList([]));
    };
    const loadCats = async () => {
        try {
            const r = await axios.get(API_ENDPOINTS.ADMIN_CATEGORIES, { headers: authHeaders });
            setCats(r.data || []);
            return r.data || [];
        } catch {
            setCats([]);
            return [];
        }
    };

    useEffect(() => {
        load();
        loadCats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // parent+child kategorileri düz listeye çevir
    const flatCategories = useMemo(() => {
        const out = [];
        for (const p of cats) {
            const children = Array.isArray(p.subCategories) ? p.subCategories : [];
            if (children.length === 0) {
                out.push({ id: p.id, label: p.name });
            } else {
                for (const c of children) out.push({ id: c.id, label: `${p.name} › ${c.name}` });
            }
        }
        return out;
    }, [cats]);

    const startCreate = () => {
        const firstId = flatCategories[0]?.id || 0;
        setEditing(null);
        setForm({ ...emptyForm, categoryId: firstId });
        setShowForm(true);
    };

    const startEdit = async (id) => {
        try {
            let currentCats = cats;
            if (!currentCats.length) currentCats = await loadCats();

            const r = await axios.get(`${API_ENDPOINTS.ADMIN_PRODUCTS}/${id}`, { headers: authHeaders });
            const p = r.data || {};
            const routeId = Number(id);
            const apiId = Number(p.id) || routeId;

            const catFromApi = Number(p.categoryId) || 0;
            const validCatId = currentCats.some((c) =>
                c.id === catFromApi || (Array.isArray(c.subCategories) && c.subCategories.some(sc => sc.id === catFromApi))
            )
                ? catFromApi
                : (flatCategories[0]?.id || 0);

            setEditing(routeId);
            setForm({
                id: apiId,
                name: p.name ?? "",
                brand: p.brand ?? "",
                description: p.description ?? "",
                price: p.price != null ? String(p.price) : "",
                stockQuantity: p.stockQuantity != null ? String(p.stockQuantity) : "",
                isActive: !!p.isActive,
                imageUrl: p.imageUrl ?? "",
                color: p.color ?? "",
                size: p.size ?? "",
                categoryId: validCatId,
                discountPercent: p.discountPercent != null ? String(p.discountPercent) : "",
                suitableForSkin: Number(p.suitableForSkin ?? ALL_SKIN_MASK),
                finish: p.finish ?? "",
                coverage: p.coverage ?? "",
                longwear: !!p.longwear,
                waterproof: !!p.waterproof,
                photoFriendly: !!p.photoFriendly,
                hasSpf: !!p.hasSpf,
                fragranceFree: !!p.fragranceFree,
                nonComedogenic: !!p.nonComedogenic,
                shadeFamily: p.shadeFamily ?? "",
                tags: p.tags ?? ""
            });
            setShowForm(true);
        } catch (err) {
            console.error("startEdit error:", err);
            alert(getAxiosErrorMessage(err));
        }
    };

    const onUploadClick = () => fileRef.current?.click();
    const onFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploading(true);
            const fd = new FormData();
            fd.append("file", file);
            const res = await axios.post(API_ENDPOINTS.ADMIN_UPLOAD_IMAGE, fd, { headers: authHeaders });
            const path = res.data?.path;
            if (path) setForm((prev) => ({ ...prev, imageUrl: path }));
            else alert("Sunucudan geçerli bir yol dönmedi.");
        } catch (err) {
            alert(getAxiosErrorMessage(err));
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const save = async () => {
        try {
            const payload = {
                name: form.name,
                brand: form.brand,
                description: form.description,
                price: toNumber(form.price),               // number
                stockQuantity: toInt(form.stockQuantity),  // number
                isActive: !!form.isActive,
                imageUrl: form.imageUrl,
                color: form.color || null,
                size: form.size || null,
                categoryId: Number(form.categoryId) || 0,
                discountPercent: form.discountPercent !== "" ? toNumber(form.discountPercent) : null, // ← düzeltildi
                suitableForSkin: Number(form.suitableForSkin || 0),
                finish: form.finish || null,
                coverage: form.coverage || null,
                longwear: !!form.longwear,
                waterproof: !!form.waterproof,
                photoFriendly: !!form.photoFriendly,
                hasSpf: !!form.hasSpf,
                fragranceFree: !!form.fragranceFree,
                nonComedogenic: !!form.nonComedogenic,
                shadeFamily: form.shadeFamily || null,
                tags: form.tags || null
            };

            if (!payload.name) { alert("Ürün adı zorunlu."); return; }
            if (!payload.categoryId) { alert("Kategori seçin."); return; }

            if (editing) {
                const idNum = Number(form.id || editing);
                const url = `${API_ENDPOINTS.ADMIN_PRODUCTS}/${idNum}`;
                const body = { id: idNum, ...payload }; // controller id == dto.Id
                const resp = await axios.put(url, body, { headers: authHeaders, validateStatus: () => true });
                if (resp.status < 200 || resp.status >= 300) {
                    console.log("PUT FAIL", url, body, resp.status, resp.data);
                    alert(getAxiosErrorMessage(resp));
                    return;
                }
            } else {
                const resp = await axios.post(API_ENDPOINTS.ADMIN_PRODUCTS, payload, {
                    headers: authHeaders,
                    validateStatus: () => true,
                });
                if (resp.status < 200 || resp.status >= 300) {
                    console.log("POST FAIL", payload, resp.status, resp.data);
                    alert(getAxiosErrorMessage(resp));
                    return;
                }
            }

            setEditing(null);
            setForm(emptyForm);
            setShowForm(false);
            load();
        } catch (err) {
            console.error("save error:", err);
            alert(getAxiosErrorMessage(err));
        }
    };

    const del = async (id) => {
        if (!window.confirm("Silinsin mi?")) return;
        try {
            await axios.delete(`${API_ENDPOINTS.ADMIN_PRODUCTS}/${id}`, { headers: authHeaders });
            load();
        } catch (err) {
            alert(getAxiosErrorMessage(err));
        }
    };

    return (
        <div>
            <h2>Ürünler</h2>

            <div className="toolbar">
                <input placeholder="Ara..." value={q} onChange={(e) => setQ(e.target.value)} />
                <button onClick={load}>Ara</button>
                <button onClick={startCreate}>+ Yeni Ürün</button>
            </div>

            {showForm && (
                <div className="card card--pink admin-form" style={{ margin: "12px 0", padding: 12 }}>
                    <h3>{editing ? "Ürünü Güncelle" : "Yeni Ürün"}</h3>

                    {/* Görsel önizleme + yükleme */}
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                        <div style={{ width: 84, height: 84, borderRadius: 12, overflow: "hidden", border: "1px solid #f3c7dd" }}>
                            <img
                                src={`${API_BASE_URL}${form.imageUrl || ""}`}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/84x84?text=IMG"; }}
                            />
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <button type="button" onClick={onUploadClick} disabled={uploading}>
                                {uploading ? "Yükleniyor…" : "Görsel Yükle"}
                            </button>
                            <input
                                style={{ minWidth: 280 }}
                                placeholder="/images/products/xxx.png"
                                value={form.imageUrl}
                                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                            />
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={onFileChange}
                            />
                        </div>
                    </div>

                    {/* *** 1. grid2: responsive *** */}
                    <div
                        className="grid2"
                        style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:12 }}
                    >
                        <label>
                            Ad
                            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </label>
                        <label>
                            Marka
                            <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                        </label>

                        <label>
                            Kategori
                            <select
                                value={form.categoryId}
                                onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                            >
                                <option value={0}>— Kategori seç —</option>
                                {flatCategories.map((opt) => (
                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
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
                            İndirim (%)
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="örnek: 20"
                                value={form.discountPercent}
                                onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                            />
                        </label>
                        <label>
                            Stok
                            <input
                                type="text"
                                inputMode="numeric"
                                value={form.stockQuantity}
                                onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                            />
                        </label>
                        <label>
                            Aktif
                            <input
                                type="checkbox"
                                checked={form.isActive}
                                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                            />
                        </label>
                        <label>
                            Renk
                            <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                        </label>
                        <label>
                            Beden/Size
                            <input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
                        </label>
                    </div>

                    <label>
                        Açıklama
                        <textarea
                            rows={4}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                        />
                    </label>

                    {/* --- Öneri Motoru Alanları --- */}
                    <div className="card" style={{marginTop:12, padding:12}}>
                        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:12}}>
                            <h4 style={{margin:0}}>Öneri / Rutin Alanları</h4>

                            {/* Preset butonları */}
                            <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                                <button type="button" className="btn-outline"
                                        title="Günlük/doğal"
                                        onClick={()=>setForm(f=>({
                                            ...f,
                                            finish: "Natural", coverage: f.coverage || "Sheer",
                                            longwear:false, waterproof:false, photoFriendly:false, hasSpf:false,
                                            tags: mergeTags(f.tags, ["skin-like"])
                                        }))}>
                                    Preset: Office
                                </button>

                                <button type="button" className="btn-outline"
                                        title="Açık hava"
                                        onClick={()=>setForm(f=>({
                                            ...f,
                                            hasSpf:true, waterproof:true, longwear:true,
                                            finish: f.finish || "Natural",
                                            tags: mergeTags(f.tags, ["spf"])
                                        }))}>
                                    Preset: Outdoor
                                </button>

                                <button type="button" className="btn-outline"
                                        title="Akşam/parti"
                                        onClick={()=>setForm(f=>({
                                            ...f,
                                            finish:"Shimmer", longwear:true, photoFriendly:true,
                                            tags: mergeTags(f.tags, ["glitter","metallic"])
                                        }))}>
                                    Preset: Party
                                </button>

                                <button type="button" className="btn-outline"
                                        title="Yumuşak ışıltı"
                                        onClick={()=>setForm(f=>({
                                            ...f,
                                            finish: f.finish || "Dewy",
                                            coverage: f.coverage || "Medium",
                                            longwear:true
                                        }))}>
                                    Preset: Soft Glam
                                </button>
                            </div>
                        </div>

                        {/* *** 2. grid2: responsive *** */}
                        <div
                            className="grid2"
                            style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:12, marginTop:10 }}
                        >
                            <label>
                                Finish
                                <select value={form.finish} onChange={e=>setForm({...form, finish:e.target.value})}>
                                    <option value="">—</option>
                                    <option value="Dewy">Dewy</option>
                                    <option value="Natural">Natural</option>
                                    <option value="Matte">Matte</option>
                                    <option value="Shimmer">Shimmer</option>
                                </select>
                            </label>

                            <label>
                                Coverage
                                <select value={form.coverage} onChange={e=>setForm({...form, coverage:e.target.value})}>
                                    <option value="">—</option>
                                    <option value="Sheer">Sheer</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Full">Full</option>
                                </select>
                            </label>

                            <label>
                                ShadeFamily (ör. coral|peach|mauve)
                                <input value={form.shadeFamily} onChange={e=>setForm({...form, shadeFamily:e.target.value})}/>
                            </label>

                            <label>
                                Tags (virgülle ayırın)
                                <input value={form.tags} onChange={e=>setForm({...form, tags:e.target.value})}/>
                            </label>
                        </div>

                        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:8}}>
                            <div>
                                <div style={{fontWeight:600, marginBottom:6}}>Cilt Uyumu</div>

                                {/* Hızlı aksiyonlar */}
                                <div style={{display:"flex", gap:8, marginBottom:6}}>
                                    <button type="button" className="btn-outline" onClick={() => setForm(f => ({...f, suitableForSkin: ALL_SKIN_MASK}))}>
                                        Tümünü Seç
                                    </button>
                                    <button type="button" className="btn-outline" onClick={() => setForm(f => ({...f, suitableForSkin: 0}))}>
                                        Temizle
                                    </button>
                                </div>

                                <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
                                    {SKIN.map(s=>(
                                        <label key={s.bit} style={{display:"inline-flex", gap:6, alignItems:"center"}}>
                                            <input
                                                type="checkbox"
                                                checked={(form.suitableForSkin & s.bit) === s.bit}
                                                onChange={()=>setForm(f=>({...f, suitableForSkin: toggleBit(f.suitableForSkin, s.bit)}))}
                                            />
                                            <span>{s.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div style={{fontWeight:600, marginBottom:6}}>Özellikler</div>
                                <div className="grid2" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:12 }}>
                                    <label><input type="checkbox" checked={form.longwear} onChange={e=>setForm({...form, longwear:e.target.checked})}/> Longwear</label>
                                    <label><input type="checkbox" checked={form.waterproof} onChange={e=>setForm({...form, waterproof:e.target.checked})}/> Waterproof</label>
                                    <label><input type="checkbox" checked={form.photoFriendly} onChange={e=>setForm({...form, photoFriendly:e.target.checked})}/> Photo Friendly</label>
                                    <label><input type="checkbox" checked={form.hasSpf} onChange={e=>setForm({...form, hasSpf:e.target.checked})}/> SPF</label>
                                    <label><input type="checkbox" checked={form.fragranceFree} onChange={e=>setForm({...form, fragranceFree:e.target.checked})}/> Fragrance Free</label>
                                    <label><input type="checkbox" checked={form.nonComedogenic} onChange={e=>setForm({...form, nonComedogenic:e.target.checked})}/> Non-Comedogenic</label>
                                </div>

                                {/* (Opsiyonel) Rozet önizleme */}
                                <div style={{marginTop:8, display:"flex", gap:6, flexWrap:"wrap"}}>
                                    {form.hasSpf && <span className="chip">SPF</span>}
                                    {form.longwear && <span className="chip">Longwear</span>}
                                    {form.waterproof && <span className="chip">Waterproof</span>}
                                    {form.photoFriendly && <span className="chip">Photo</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="admin-form__actions" style={{ display: "flex", gap: 8 }}>
                        <button onClick={save}>{editing ? "Kaydet" : "Ekle"}</button>
                        <button className="btn-outline" onClick={() => setShowForm(false)}>İptal</button>
                    </div>
                </div>
            )}

            <div className="admin-table-wrap">
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
                            <td style={{ whiteSpace: "nowrap" }}>
                                <button className="btn-link" onClick={() => startEdit(p.id)}>Düzenle</button>
                                <button className="btn-link danger" onClick={() => del(p.id)}>Sil</button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
