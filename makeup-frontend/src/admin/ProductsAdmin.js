import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS, API_BASE_URL } from "../config";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import "./ProductsAdmin.css";

// ---- helpers ----
const parseTags = (s = "") =>
    s.split(",").map(t => t.trim()).filter(Boolean);

const stringifyTags = (arr) =>
    [...new Set(arr.map(t => t.toLowerCase()))].join(", ");

const hasTag = (tagsStr, tag) =>
    parseTags(tagsStr).some(t => t.toLowerCase() === tag.toLowerCase());

const toggleTag = (tagsStr, tag) => {
    const arr = parseTags(tagsStr);
    const idx = arr.findIndex(t => t.toLowerCase() === tag.toLowerCase());
    if (idx >= 0) arr.splice(idx, 1); else arr.push(tag);
    return stringifyTags(arr);
};
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

const SKIN = [
    { bit: 1,  label: "Dry" },
    { bit: 2,  label: "Oily" },
    { bit: 4,  label: "Combination" },
    { bit: 8,  label: "Sensitive" },
    { bit: 16, label: "Normal" },
];
const toggleBit = (mask, bit) => (mask & bit) ? (mask & ~bit) : (mask | bit);
const ALL_SKIN_MASK = SKIN.reduce((m, s) => (m | s.bit), 0);

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
    const [cats, setCats] = useState([]);
    const [q, setQ] = useState("");
    const [editing, setEditing] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState("genel");

    const emptyForm = {
        id: 0,
        name: "",
        brand: "",
        description: "",
        price: "",
        stockQuantity: "",
        isActive: true,
        imageUrl: "/images/placeholder.png",
        color: "",
        size: "",
        categoryId: 0,
        discountPercent: "",
        suitableForSkin: ALL_SKIN_MASK,
        finish: "",
        coverage: "",
        longwear: false,
        waterproof: false,
        photoFriendly: false,
        hasSpf: false,
        fragranceFree: false,
        nonComedogenic: false,
        shadeFamily: "",
        tags: "",
        ingredients: ""
    };
    const [form, setForm] = useState(emptyForm);

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
    }, []);

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
        setActiveTab("genel");
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
                tags: p.tags ?? "",
                ingredients: p.ingredients ?? "",
            });
            setActiveTab("genel");
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
                price: toNumber(form.price),
                stockQuantity: toInt(form.stockQuantity),
                isActive: !!form.isActive,
                imageUrl: form.imageUrl,
                color: form.color || null,
                size: form.size || null,
                categoryId: Number(form.categoryId) || 0,
                discountPercent: form.discountPercent !== "" ? toNumber(form.discountPercent) : null,
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
                tags: form.tags || null,
                ingredients: form.ingredients || null
            };

            if (!payload.name) { alert("Ürün adı zorunlu."); return; }
            if (!payload.categoryId) { alert("Kategori seçin."); return; }

            if (editing) {
                const idNum = Number(form.id || editing);
                const url = `${API_ENDPOINTS.ADMIN_PRODUCTS}/${idNum}`;
                const body = { id: idNum, ...payload };
                const resp = await axios.put(url, body, { headers: authHeaders, validateStatus: () => true });
                if (resp.status < 200 || resp.status >= 300) {
                    alert(getAxiosErrorMessage(resp));
                    return;
                }
            } else {
                const resp = await axios.post(API_ENDPOINTS.ADMIN_PRODUCTS, payload, {
                    headers: authHeaders,
                    validateStatus: () => true,
                });
                if (resp.status < 200 || resp.status >= 300) {
                    alert(getAxiosErrorMessage(resp));
                    return;
                }
            }

            setEditing(null);
            setForm(emptyForm);
            setShowForm(false);
            load();
        } catch (err) {
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
        <div className="admin-products">
            {/* Header */}
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">Ürün Yönetimi</h1>
                    <p className="admin-subtitle">Ürünlerinizi ekleyin, düzenleyin ve yönetin</p>
                </div>
                <button className="btn-primary" onClick={startCreate}>
                    <span>+</span> Yeni Ürün Ekle
                </button>
            </div>

            {/* Search Bar */}
            <div className="search-bar">
                <input
                    type="text"
                    placeholder="Ürün ara..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && load()}
                />
                <button className="btn-search" onClick={load}>Ara</button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h2>{editing ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}</h2>
                            <button className="btn-close" onClick={() => setShowForm(false)}>×</button>
                        </div>

                        {/* Tabs */}
                        <div className="tabs-container">
                            <button
                                className={`tab ${activeTab === "genel" ? "active" : ""}`}
                                onClick={() => setActiveTab("genel")}
                            >
                                📝 Genel Bilgiler
                            </button>
                            {Boolean(editing || form.id) && (
                                <>
                                    <button
                                        className={`tab ${activeTab === "varyantlar" ? "active" : ""}`}
                                        onClick={() => setActiveTab("varyantlar")}
                                    >
                                        🎨 Varyantlar
                                    </button>
                                    <button
                                        className={`tab ${activeTab === "gorseller" ? "active" : ""}`}
                                        onClick={() => setActiveTab("gorseller")}
                                    >
                                        📸 Görseller
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="modal-content">
                            {activeTab === "genel" && (
                                <GeneralTab
                                    form={form}
                                    setForm={setForm}
                                    flatCategories={flatCategories}
                                    onUploadClick={onUploadClick}
                                    uploading={uploading}
                                    fileRef={fileRef}
                                    onFileChange={onFileChange}
                                    save={save}
                                    setShowForm={setShowForm}
                                    editing={editing}
                                />
                            )}

                            {activeTab === "varyantlar" && Boolean(editing || form.id) && (
                                <VariantsPanel
                                    productId={Number(form.id || editing)}
                                    authHeaders={authHeaders}
                                    onUploadedImageEndpoint={API_ENDPOINTS.ADMIN_UPLOAD_IMAGE}
                                />
                            )}

                            {activeTab === "gorseller" && Boolean(editing || form.id) && (
                                <ImagesPanel
                                    productId={Number(form.id || editing)}
                                    authHeaders={authHeaders}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Products Grid */}
            <div className="products-grid">
                {list.map((p) => (
                    <div key={p.id} className="product-card">
                        <div className="product-image">
                            <img
                                src={`${API_BASE_URL}${p.imageUrl}`}
                                alt={p.name}
                                onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/200x200?text=IMG"; }}
                            />
                            {p.discountPercent > 0 && (
                                <div className="discount-badge">-%{p.discountPercent}</div>
                            )}
                        </div>
                        <div className="product-info">
                            <div className="product-brand">{p.brand}</div>
                            <h3 className="product-name">{p.name}</h3>
                            <div className="product-category">{p.categoryName}</div>
                            <div className="product-meta">
                                <span className="product-price">₺{Number(p.price).toLocaleString("tr-TR")}</span>
                                <span className={`stock-badge ${p.stockQuantity > 0 ? 'in-stock' : 'out-of-stock'}`}>
                                    {p.stockQuantity > 0 ? `${p.stockQuantity} stok` : 'Tükendi'}
                                </span>
                            </div>
                            <div className="product-actions">
                                <button className="btn-edit" onClick={() => startEdit(p.id)}>
                                    ✏️ Düzenle
                                </button>
                                <button className="btn-delete" onClick={() => del(p.id)}>
                                    🗑️ Sil
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {list.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">📦</div>
                    <h3>Henüz ürün yok</h3>
                    <p>İlk ürününüzü eklemek için yukarıdaki butonu kullanın</p>
                </div>
            )}
        </div>
    );
}

// ✨ GENEL BİLGİLER SEKME COMPONENT
function GeneralTab({ form, setForm, flatCategories, onUploadClick, uploading, fileRef, onFileChange, save, setShowForm, editing }) {
    return (
        <div className="form-section">
            {/* Görsel Yükleme */}
            <div className="image-upload-section">
                <div className="image-preview">
                    <img
                        src={`${API_BASE_URL}${form.imageUrl || ""}`}
                        alt="Preview"
                        onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/120x120?text=IMG"; }}
                    />
                </div>
                <div className="upload-controls">
                    <button type="button" className="btn-upload" onClick={onUploadClick} disabled={uploading}>
                        {uploading ? "⏳ Yükleniyor..." : "📤 Görsel Yükle"}
                    </button>
                    <input
                        type="text"
                        className="input-url"
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

            {/* Temel Bilgiler */}
            <div className="form-grid">
                <div className="form-group">
                    <label>Ürün Adı ⭐</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="ör: Unlimited Double Touch 46"
                    />
                </div>

                <div className="form-group">
                    <label>Marka ⭐</label>
                    <input
                        type="text"
                        value={form.brand}
                        onChange={(e) => setForm({ ...form, brand: e.target.value })}
                        placeholder="ör: KIKO Milano"
                    />
                </div>

                <div className="form-group">
                    <label>Kategori ⭐</label>
                    <select
                        value={form.categoryId}
                        onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                    >
                        <option value={0}>— Kategori seç —</option>
                        {flatCategories.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Fiyat (₺) ⭐</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        placeholder="399.90"
                    />
                </div>

                <div className="form-group">
                    <label>İndirim (%)</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="20"
                        value={form.discountPercent}
                        onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label>Stok Adedi ⭐</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={form.stockQuantity}
                        onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                        placeholder="100"
                    />
                </div>
            </div>

            {/* Açıklama */}
            <div className="form-group full-width">
                <label>Ürün Açıklaması</label>
                <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Ürünün özelliklerini ve kullanım alanlarını yazın..."
                />
            </div>

            {/* Preset Butonları */}
            <div className="preset-section">
                <h3>🎯 Hızlı Preset'ler</h3>
                <div className="preset-buttons">
                    <button
                        type="button"
                        className="btn-preset"
                        onClick={() => setForm(f => ({
                            ...f,
                            finish: "Natural",
                            coverage: "Sheer",
                            longwear: false,
                            waterproof: false,
                            photoFriendly: false,
                            hasSpf: false,
                            tags: mergeTags(f.tags, ["skin-like", "natural", "lightweight", "fresh", "breathable", "minimal"])
                        }))}
                    >
                        🏢 Office Look
                        <small style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                            Doğal & Hafif
                        </small>
                    </button>

                    <button
                        type="button"
                        className="btn-preset"
                        onClick={() => setForm(f => ({
                            ...f,
                            hasSpf: true,
                            waterproof: true,
                            longwear: true,
                            finish: f.finish || "Natural",
                            tags: mergeTags(f.tags, ["spf", "waterproof", "sweat-resistant", "long-lasting", "fade-resistant"])
                        }))}
                    >
                        ☀️ Outdoor
                        <small style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                            SPF & Su Geçirmez
                        </small>
                    </button>

                    <button
                        type="button"
                        className="btn-preset"
                        onClick={() => setForm(f => ({
                            ...f,
                            finish: "Shimmer",
                            longwear: true,
                            photoFriendly: true,
                            tags: mergeTags(f.tags, ["glitter", "metallic", "party", "shimmer", "sparkle", "dramatic"])
                        }))}
                    >
                        🎉 Party Glam
                        <small style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                            Parlak & Uzun Süre
                        </small>
                    </button>

                    <button
                        type="button"
                        className="btn-preset"
                        onClick={() => setForm(f => ({
                            ...f,
                            finish: "Dewy",
                            coverage: "Medium",
                            longwear: true,
                            tags: mergeTags(f.tags, ["soft-focus", "glow", "defined", "elegant", "romantic", "pearl"])
                        }))}
                    >
                        ✨ Soft Glam
                        <small style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                            Işıltılı & Zarif
                        </small>
                    </button>

                    <button
                        type="button"
                        className="btn-preset"
                        onClick={() => setForm(f => ({
                            ...f,
                            finish: "Matte",
                            coverage: "Full",
                            longwear: true,
                            tags: mergeTags(f.tags, ["high pigment", "bold", "vibrant", "intense", "statement", "full-coverage"])
                        }))}
                    >
                        💄 Bold & Matte
                        <small style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                            Yoğun Pigment
                        </small>
                    </button>

                    <button
                        type="button"
                        className="btn-preset"
                        onClick={() => setForm(f => ({
                            ...f,
                            finish: "Dewy",
                            fragranceFree: true,
                            nonComedogenic: true,
                            tags: mergeTags(f.tags, ["hydrating", "nourishing", "glow", "moisture", "luminous", "creamy"])
                        }))}
                    >
                        💧 Hydrating
                        <small style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                            Nemlendirici & Işıltılı
                        </small>
                    </button>
                </div>
            </div>

            {/* Öneri Motoru Alanları */}
            <div className="recommendation-section">
                <h3>🤖 Öneri Motoru Ayarları</h3>

                {/* Etiket Önerileri */}
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#e3f2fd', borderRadius: '8px', border: '2px solid #64b5f6' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: '#1976d2' }}>
                        💡 Popüler Etiketler
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {[
                            'dewy','matte','satin','shimmer','hydrating','longwear','waterproof',
                            'transfer-proof','high pigment','buildable','lightweight','full-coverage',
                            'natural','bold','nude','vibrant','coral','peach','mauve','rose','plum',
                            'berry','spf','fragrance-free','vegan','cruelty-free','glitter','metallic',
                            'pearl','sparkle'
                        ].map(tag => {
                            const active = hasTag(form.tags, tag);
                            return (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => setForm({ ...form, tags: toggleTag(form.tags, tag) })}
                                    style={{
                                        padding:'0.375rem 0.75rem',
                                        background: active ? '#ff6b9d' : 'white',
                                        color: active ? 'white' : '#666',
                                        border:'2px solid', borderColor: active ? '#ff6b9d' : '#e0e0e0',
                                        borderRadius:20, fontSize:'0.8rem', cursor:'pointer', fontWeight: active?600:400
                                    }}
                                >
                                    {tag}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label>Finish</label>
                        <select value={form.finish} onChange={e => setForm({ ...form, finish: e.target.value })}>
                            <option value="">—</option>
                            <option value="Dewy">Dewy</option>
                            <option value="Natural">Natural</option>
                            <option value="Matte">Matte</option>
                            <option value="Shimmer">Shimmer</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Coverage</label>
                        <select value={form.coverage} onChange={e => setForm({ ...form, coverage: e.target.value })}>
                            <option value="">—</option>
                            <option value="Sheer">Sheer</option>
                            <option value="Medium">Medium</option>
                            <option value="Full">Full</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Renk Ailesi</label>
                        <input
                            type="text"
                            value={form.shadeFamily}
                            onChange={e => setForm({ ...form, shadeFamily: e.target.value })}
                            placeholder="coral, peach, mauve"
                        />
                    </div>

                    <div className="form-group">
                        <label>Etiketler (virgülle ayırın)</label>
                        <input
                            type="text"
                            value={form.tags}
                            onChange={e => setForm({ ...form, tags: e.target.value })}
                            placeholder="dewy, hydrating, glow"
                        />
                    </div>
                    <div className="form-group">
                        <label>İçindekiler (virgülle ayırın)</label>
                        <textarea
                            value={form.ingredients || ""}
                            onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                            placeholder="Aqua, Glycerin, Hyaluronic Acid, ..."
                            rows={4}
                        />
                    </div>
                </div>

                {/* Cilt Tipi Checkboxları */}
                <div className="checkbox-section">
                    <label className="section-label">Uygun Cilt Tipleri</label>
                    <div className="checkbox-grid">
                        {SKIN.map(s => (
                            <label key={s.bit} className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={(form.suitableForSkin & s.bit) === s.bit}
                                    onChange={() => setForm(f => ({ ...f, suitableForSkin: toggleBit(f.suitableForSkin, s.bit) }))}
                                />
                                <span>{s.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Özellikler */}
                <div className="checkbox-section">
                    <label className="section-label">Ürün Özellikleri</label>
                    <div className="checkbox-grid">
                        <label className="checkbox-label">
                            <input type="checkbox" checked={form.longwear} onChange={e => setForm({ ...form, longwear: e.target.checked })} />
                            <span>🕐 Longwear</span>
                        </label>
                        <label className="checkbox-label">
                            <input type="checkbox" checked={form.waterproof} onChange={e => setForm({ ...form, waterproof: e.target.checked })} />
                            <span>💧 Waterproof</span>
                        </label>
                        <label className="checkbox-label">
                            <input type="checkbox" checked={form.photoFriendly} onChange={e => setForm({ ...form, photoFriendly: e.target.checked })} />
                            <span>📷 Photo Friendly</span>
                        </label>
                        <label className="checkbox-label">
                            <input type="checkbox" checked={form.hasSpf} onChange={e => setForm({ ...form, hasSpf: e.target.checked })} />
                            <span>☀️ SPF</span>
                        </label>
                        <label className="checkbox-label">
                            <input type="checkbox" checked={form.fragranceFree} onChange={e => setForm({ ...form, fragranceFree: e.target.checked })} />
                            <span>🌸 Fragrance Free</span>
                        </label>
                        <label className="checkbox-label">
                            <input type="checkbox" checked={form.nonComedogenic} onChange={e => setForm({ ...form, nonComedogenic: e.target.checked })} />
                            <span>✨ Non-Comedogenic</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
                <button type="button" className="btn-primary" onClick={save}>
                    {editing ? "💾 Değişiklikleri Kaydet" : "➕ Ürünü Ekle"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                    ❌ İptal
                </button>
            </div>
        </div>
    );
}


/* ---------------- ImagesPanel (Drag & Drop + Düzeltilmiş) ---------------- */

function ImagesPanel({ productId, authHeaders }) {
    const [images, setImages] = React.useState([]);
    const [uploading, setUploading] = React.useState(false);
    const [selectedVariant, setSelectedVariant] = React.useState(null);
    const [variants, setVariants] = React.useState([]);
    const fileInputRef = React.useRef(null);

    const load = React.useCallback(async () => {
        try {
            const variantsRes = await axios.get(
                API_ENDPOINTS.ADMIN_PRODUCT_VARIANTS(productId),
                { headers: authHeaders }
            );
            setVariants(variantsRes.data || []);

            const params = selectedVariant ? `?variantId=${selectedVariant}` : '';
            const imagesRes = await axios.get(
                `${API_BASE_URL}/api/admin/products/${productId}/images${params}`,
                { headers: authHeaders }
            );

            setImages(imagesRes.data || []);
        } catch (err) {
            console.error('Görsel yükleme hatası:', err);
            setImages([]);
        }
    }, [productId, authHeaders, selectedVariant]);

    React.useEffect(() => {
        if (productId) load();
    }, [productId, selectedVariant, load]);

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFilesChange = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setUploading(true);

        try {
            const formData = new FormData();
            files.forEach(file => formData.append('files', file));

            let url = `${API_BASE_URL}/api/admin/products/${productId}/images`;
            if (selectedVariant) {
                url += `?variantId=${selectedVariant}`;
            }

            await axios.post(url, formData, {
                headers: {
                    ...authHeaders,
                    'Content-Type': 'multipart/form-data'
                }
            });

            alert(`✅ ${files.length} görsel başarıyla yüklendi!`);
            await load();

        } catch (err) {
            const errorMsg = err?.response?.data?.message ||
                err?.response?.data ||
                err?.message ||
                'Yükleme başarısız';
            alert('❌ Hata: ' + errorMsg);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // ✅ Drag & Drop ile sıralama
    const onDragEnd = async (result) => {
        if (!result.destination) return;

        const reordered = Array.from(images);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);

        // Optimistic update
        setImages(reordered);

        try {
            await axios.post(
                `${API_BASE_URL}/api/admin/products/${productId}/images/reorder`,
                {
                    order: reordered.map((img, idx) => ({
                        id: img.id,
                        sortOrder: idx + 1
                    }))
                },
                { headers: authHeaders }
            );
        } catch (err) {
            alert('❌ Sıralama kaydedilemedi: ' + getAxiosErrorMessage(err));
            load(); // Eski haline döndür
        }
    };

    const deleteImage = async (id) => {
        if (!window.confirm('Bu görseli silmek istediğinize emin misiniz?')) return;

        try {
            await axios.delete(
                `${API_BASE_URL}/api/admin/products/images/${id}`,
                { headers: authHeaders }
            );

            alert('✅ Görsel silindi!');
            load();
        } catch (err) {
            alert('❌ Silme başarısız: ' + getAxiosErrorMessage(err));
        }
    };

    const selectedVariantInfo = variants.find(v => v.id === selectedVariant);

    return (
        <div style={{ padding: 20, background: '#fafafa', borderRadius: 12 }}>
            <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 12px', color: '#333' }}>📸 Ürün Görselleri</h4>

                {variants.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <label style={{
                            display: 'block',
                            marginBottom: 8,
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: '#555'
                        }}>
                            🎨 Görselleri yüklemek istediğiniz varyantı seçin:
                        </label>
                        <select
                            value={selectedVariant || ''}
                            onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : null;
                                setSelectedVariant(val);
                            }}
                            style={{
                                padding: '10px 12px',
                                borderRadius: 8,
                                border: '2px solid #f1798a',
                                fontSize: '0.95rem',
                                minWidth: 280,
                                background: '#fff',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            <option value="">📦 Ana Ürün Görselleri (Ortak)</option>
                            {variants.map(v => (
                                <option key={v.id} value={v.id}>
                                    🎨 {v.name} {v.shadeCode ? `(#${v.shadeCode})` : ''}
                                    {v.isDefault ? ' ⭐' : ''}
                                </option>
                            ))}
                        </select>

                        {selectedVariantInfo && (
                            <div style={{
                                marginTop: 12,
                                padding: '12px 16px',
                                background: '#ffe3f1',
                                borderRadius: 8,
                                border: '2px solid #f1798a'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    marginBottom: 8
                                }}>
                                    {selectedVariantInfo.hexColor && (
                                        <div style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            background: selectedVariantInfo.hexColor,
                                            border: '3px solid #fff',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                        }} />
                                    )}
                                    <div>
                                        <div style={{
                                            fontWeight: 700,
                                            color: '#b2206d',
                                            fontSize: '1rem'
                                        }}>
                                            {selectedVariantInfo.name}
                                        </div>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            color: '#666',
                                            marginTop: 2
                                        }}>
                                            SKU: {selectedVariantInfo.sku} | Stok: {selectedVariantInfo.stockQuantity}
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: '0.85rem',
                                    color: '#b2206d',
                                    fontWeight: 600
                                }}>
                                    ℹ️ Bu görseller sadece "{selectedVariantInfo.name}" varyantı seçildiğinde görünecektir.
                                </div>
                            </div>
                        )}

                        {!selectedVariant && (
                            <div style={{
                                marginTop: 12,
                                padding: '12px 16px',
                                background: '#e3f2fd',
                                borderRadius: 8,
                                border: '2px solid #64b5f6',
                                fontSize: '0.85rem',
                                color: '#1976d2',
                                fontWeight: 600
                            }}>
                                ℹ️ Ana ürün görselleri tüm varyantlar için ortak olarak görünür.
                            </div>
                        )}
                    </div>
                )}

                <button
                    onClick={handleFileSelect}
                    disabled={uploading}
                    style={{
                        padding: '12px 24px',
                        background: uploading ? '#ccc' : '#e91e63',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        opacity: uploading ? 0.6 : 1,
                        boxShadow: uploading ? 'none' : '0 2px 8px rgba(233, 30, 99, 0.3)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}
                >
                    {uploading ? '⏳ Yükleniyor...' : '+ Görsel Ekle'}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFilesChange}
                    style={{ display: 'none' }}
                />
            </div>

            {/* ✅ Drag & Drop Galeri */}
            {images.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: 60,
                    background: '#fff',
                    borderRadius: 12,
                    color: '#999',
                    border: '2px dashed #ddd'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12 }}>📷</div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem' }}>
                        {selectedVariant
                            ? `"${selectedVariantInfo?.name}" için henüz görsel eklenmemiş`
                            : 'Ana ürün için henüz görsel eklenmemiş'}
                    </p>
                    <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#aaa' }}>
                        Yukarıdaki butonu kullanarak görsel ekleyebilirsiniz
                    </p>
                </div>
            ) : (
                <>
                    <div style={{
                        marginBottom: 12,
                        padding: '8px 12px',
                        background: '#e8f5e9',
                        borderRadius: 6,
                        color: '#2e7d32',
                        fontWeight: 600,
                        fontSize: '0.9rem'
                    }}>
                        ✅ {images.length} görsel yüklü • 🖱️ Sürükle-bırak ile sıralayın
                    </div>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="images-grid" direction="horizontal">
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                        gap: 16,
                                        padding: snapshot.isDraggingOver ? '8px' : '0',
                                        background: snapshot.isDraggingOver ? '#f0f7ff' : 'transparent',
                                        borderRadius: 12,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {images.map((img, index) => (
                                        <Draggable key={img.id} draggableId={String(img.id)} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    style={{
                                                        position: 'relative',
                                                        borderRadius: 12,
                                                        overflow: 'hidden',
                                                        border: index === 0
                                                            ? '3px solid #4caf50'
                                                            : '2px solid #f1798a',
                                                        background: '#fff',
                                                        boxShadow: snapshot.isDragging
                                                            ? '0 8px 24px rgba(0,0,0,0.25)'
                                                            : '0 2px 8px rgba(0,0,0,0.1)',
                                                        transform: snapshot.isDragging ? 'rotate(3deg)' : 'none',
                                                        transition: 'all 0.2s',
                                                        cursor: 'grab',
                                                        ...provided.draggableProps.style
                                                    }}
                                                >
                                                    {/* Sıra Badge */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 8,
                                                        left: 8,
                                                        background: index === 0
                                                            ? 'linear-gradient(135deg, #4caf50, #66bb6a)'
                                                            : 'rgba(0,0,0,0.7)',
                                                        color: '#fff',
                                                        borderRadius: '50%',
                                                        width: 32,
                                                        height: 32,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.9rem',
                                                        fontWeight: 700,
                                                        zIndex: 2,
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                                    }}>
                                                        {index === 0 ? '★' : index + 1}
                                                    </div>

                                                    {/* Görsel */}
                                                    <img
                                                        src={`${API_BASE_URL}${img.url}`}
                                                        alt={`Görsel ${index + 1}`}
                                                        style={{
                                                            width: '100%',
                                                            height: 150,
                                                            objectFit: 'cover',
                                                            display: 'block',
                                                            pointerEvents: 'none'
                                                        }}
                                                        onError={(e) => {
                                                            e.currentTarget.src = 'https://via.placeholder.com/150x150?text=IMG';
                                                        }}
                                                    />

                                                    {/* Silme Butonu */}
                                                    <button
                                                        onClick={() => deleteImage(img.id)}
                                                        style={{
                                                            position: 'absolute',
                                                            top: 8,
                                                            right: 8,
                                                            background: 'rgba(220, 53, 69, 0.9)',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '50%',
                                                            width: 32,
                                                            height: 32,
                                                            cursor: 'pointer',
                                                            fontSize: '1.1rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            zIndex: 2,
                                                            transition: 'all 0.2s',
                                                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                                                        }}
                                                        onMouseOver={(e) => {
                                                            e.currentTarget.style.background = 'rgba(220, 53, 69, 1)';
                                                            e.currentTarget.style.transform = 'scale(1.1)';
                                                        }}
                                                        onMouseOut={(e) => {
                                                            e.currentTarget.style.background = 'rgba(220, 53, 69, 0.9)';
                                                            e.currentTarget.style.transform = 'scale(1)';
                                                        }}
                                                    >
                                                        ✕
                                                    </button>

                                                    {/* İlk Görsel Badge */}
                                                    {index === 0 && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            bottom: 0,
                                                            left: 0,
                                                            right: 0,
                                                            background: 'linear-gradient(135deg, #4caf50, #66bb6a)',
                                                            color: '#fff',
                                                            padding: '6px 8px',
                                                            fontSize: '0.75rem',
                                                            textAlign: 'center',
                                                            fontWeight: 700,
                                                            letterSpacing: '0.5px'
                                                        }}>
                                                            ⭐ ÖN YÜZDE GÖRÜNECEK
                                                        </div>
                                                    )}

                                                    {/* Varyant Etiketi */}
                                                    {img.variantId && index !== 0 && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            bottom: 0,
                                                            left: 0,
                                                            right: 0,
                                                            background: 'rgba(233, 30, 99, 0.95)',
                                                            color: '#fff',
                                                            padding: '6px 8px',
                                                            fontSize: '0.75rem',
                                                            textAlign: 'center',
                                                            fontWeight: 600
                                                        }}>
                                                            🎨 Varyant
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </>
            )}

            {images.length > 0 && (
                <div style={{
                    marginTop: 20,
                    padding: '12px 16px',
                    background: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    color: '#666'
                }}>
                    <strong>💡 İpucu:</strong> Görselleri sürükleyerek sıralayın.
                    İlk görsel ön yüzde ve thumbnail'lerde gösterilir. ⭐ işareti ilk görseli belirtir.
                </div>
            )}
        </div>
    );
}

/* ---------------- VariantsPanel ---------------- */

function VariantsPanel({ productId, authHeaders, onUploadedImageEndpoint }) {
    const [list, setList] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [editingRow, setEditingRow] = React.useState(null);
    const [showForm, setShowForm] = React.useState(false);

    const fmtNum = (n) => (Number(n) || 0);

    const load = React.useCallback(() => {
        setLoading(true);
        axios
            .get(API_ENDPOINTS.ADMIN_PRODUCT_VARIANTS(productId), { headers: authHeaders })
            .then(r => setList(r.data || []))
            .catch(() => setList([]))
            .finally(() => setLoading(false));
    }, [productId, authHeaders]);

    React.useEffect(() => { if (productId) load(); }, [productId, load]);

    const emptyV = {
        id: 0,
        sku: "",
        barcode: "",
        name: "",
        shadeCode: "",
        shadeFamily: "",
        hexColor: "#000000",
        swatchImageUrl: "",
        imageUrl: "",
        price: "",
        discountPercent: "",
        stockQuantity: "",
        isActive: true,
        isDefault: false,
    };

    const startNew = () => {
        setEditingRow({ ...emptyV });
        setShowForm(true);
    };

    const startEdit = (v) => {
        setEditingRow({
            ...v,
            price: String(v.price ?? ""),
            discountPercent: v.discountPercent ?? "",
            stockQuantity: String(v.stockQuantity ?? "")
        });
        setShowForm(true);
    };

    const cancelEdit = () => {
        setEditingRow(null);
        setShowForm(false);
    };

    const uploadImage = async (file) => {
        const fd = new FormData();
        fd.append("file", file);
        const res = await axios.post(onUploadedImageEndpoint, fd, { headers: authHeaders });
        return res.data?.path || "";
    };

    const handleFilePick = (field, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        uploadImage(file)
            .then((path) => setEditingRow((prev) => ({ ...prev, [field]: path })))
            .catch((err) => alert(getAxiosErrorMessage(err)))
            .finally(() => { e.target.value = ""; });
    };

    const saveRow = async () => {
        const dto = {
            id: editingRow.id || 0,
            productId,
            sku: editingRow.sku,
            barcode: editingRow.barcode || null,
            name: editingRow.name,
            shadeCode: editingRow.shadeCode || null,
            shadeFamily: editingRow.shadeFamily || null,
            hexColor: editingRow.hexColor || null,
            swatchImageUrl: editingRow.swatchImageUrl || null,
            imageUrl: editingRow.imageUrl,
            price: fmtNum(editingRow.price),
            discountPercent: editingRow.discountPercent === "" ? null : fmtNum(editingRow.discountPercent),
            stockQuantity: parseInt(editingRow.stockQuantity || "0", 10),
            isActive: !!editingRow.isActive,
            isDefault: !!editingRow.isDefault,
        };

        try {
            if (!dto.sku) { alert("SKU zorunlu"); return; }
            if (!dto.name) { alert("İsim zorunlu"); return; }
            if (!dto.imageUrl) { alert("Görsel zorunlu"); return; }

            if (editingRow.id) {
                await axios.put(
                    API_ENDPOINTS.ADMIN_PRODUCT_VARIANT(productId, editingRow.id),
                    dto,
                    { headers: authHeaders }
                );
            } else {
                await axios.post(
                    API_ENDPOINTS.ADMIN_PRODUCT_VARIANTS(productId),
                    dto,
                    { headers: authHeaders }
                );
            }

            setEditingRow(null);
            setShowForm(false);
            load();
        } catch (err) {
            alert(getAxiosErrorMessage(err));
        }
    };

    const delRow = async (id) => {
        if (!window.confirm("Varyant silinsin mi?")) return;
        try {
            await axios.delete(
                API_ENDPOINTS.ADMIN_PRODUCT_VARIANT(productId, id),
                { headers: authHeaders }
            );
            load();
        } catch (err) {
            alert(getAxiosErrorMessage(err));
        }
    };

    const VariantCard = ({ variant }) => {
        const price = Number(variant.price || 0);
        const discount = Number(variant.discountPercent || 0);
        const finalPrice = discount > 0 ? price * (1 - discount / 100) : price;

        return (
            <div style={{
                border: variant.isDefault ? '2px solid #e91e63' : '1px solid #ddd',
                borderRadius: 12,
                padding: 16,
                background: '#fff',
                position: 'relative',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
                {variant.isDefault && (
                    <div style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: '#e91e63',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: '0.7rem',
                        fontWeight: 700
                    }}>
                        VARSAYILAN
                    </div>
                )}

                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <div style={{
                        width: 80,
                        height: 80,
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: '1px solid #eee',
                        flexShrink: 0
                    }}>
                        <img
                            src={variant.imageUrl?.startsWith('http')
                                ? variant.imageUrl
                                : `${API_BASE_URL}${variant.imageUrl}`}
                            alt={variant.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/80x80?text=IMG' }}
                        />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#333' }}>
                            {variant.name}
                        </h4>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                            {variant.hexColor && (
                                <div style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    background: variant.hexColor,
                                    border: '2px solid #fff',
                                    boxShadow: '0 0 0 1px #ddd'
                                }} />
                            )}
                            {variant.shadeCode && (
                                <span style={{
                                    fontSize: '0.85rem',
                                    color: '#666',
                                    fontWeight: 600
                                }}>
                                    #{variant.shadeCode}
                                </span>
                            )}
                        </div>

                        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: 4 }}>
                            SKU: {variant.sku}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#e91e63' }}>
                                ₺{finalPrice.toFixed(2)}
                            </span>
                            {discount > 0 && (
                                <>
                                    <span style={{ fontSize: '0.9rem', color: '#999', textDecoration: 'line-through' }}>
                                        ₺{price.toFixed(2)}
                                    </span>
                                    <span style={{
                                        background: '#ffe3f1',
                                        color: '#b2206d',
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                    }}>
                                        %{discount}
                                    </span>
                                </>
                            )}
                        </div>

                        <div style={{ marginTop: 6, fontSize: '0.8rem', color: variant.stockQuantity > 0 ? '#2e7d32' : '#d32f2f' }}>
                            Stok: {variant.stockQuantity} {variant.isActive ? '✓ Aktif' : '✗ Pasif'}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                        onClick={() => startEdit(variant)}
                        className="btn-outline"
                        style={{
                            flex: 1,
                            padding: '6px 12px',
                            fontSize: '0.85rem',
                            fontWeight: 600
                        }}
                    >
                        Düzenle
                    </button>
                    <button
                        onClick={() => delRow(variant.id)}
                        className="btn-link danger"
                        style={{
                            padding: '6px 12px',
                            fontSize: '0.85rem'
                        }}
                    >
                        Sil
                    </button>
                </div>
            </div>
        );
    };

    const VariantFormCard = () => {
        return (
            <div style={{
                background: '#f9f9f9',
                border: '2px solid #e91e63',
                borderRadius: 12,
                padding: 20,
                marginBottom: 20
            }}>
                <h3 style={{ margin: '0 0 16px', color: '#e91e63' }}>
                    {editingRow?.id ? '✏️ Varyant Düzenle' : '➕ Yeni Varyant Ekle'}
                </h3>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                    marginBottom: 16
                }}>
                    <label style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ marginBottom: 4, fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>
                            Varyant Adı ⭐
                        </span>
                        <input
                            type="text"
                            value={editingRow?.name || ''}
                            onChange={(e) => setEditingRow(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="ör: 46 Marvellous Mauve"
                            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem' }}
                        />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ marginBottom: 4, fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>SKU ⭐</span>
                        <input
                            type="text"
                            value={editingRow?.sku || ''}
                            onChange={(e) => setEditingRow(prev => ({ ...prev, sku: e.target.value }))}
                            placeholder="ör: KIKO-LG-46"
                            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem' }}
                        />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ marginBottom: 4, fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>Renk Kodu</span>
                        <input
                            type="text"
                            value={editingRow?.shadeCode || ''}
                            onChange={(e) => setEditingRow(prev => ({ ...prev, shadeCode: e.target.value }))}
                            placeholder="ör: 46"
                            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem' }}
                        />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ marginBottom: 4, fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>Barkod</span>
                        <input
                            type="text"
                            value={editingRow?.barcode || ''}
                            onChange={(e) => setEditingRow(prev => ({ ...prev, barcode: e.target.value }))}
                            placeholder="Opsiyonel"
                            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem' }}
                        />
                    </label>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 16,
                    marginBottom: 16
                }}>
                    <div>
                        <label style={{ display: 'flex', flexDirection: 'column', marginBottom: 12 }}>
                            <span style={{ marginBottom: 4, fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>
                                Renk Ailesi
                            </span>
                            <input
                                type="text"
                                value={editingRow?.shadeFamily || ''}
                                onChange={(e) => setEditingRow(prev => ({ ...prev, shadeFamily: e.target.value }))}
                                placeholder="ör: mauve, coral, nude"
                                style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem' }}
                            />
                        </label>

                        <label style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ marginBottom: 4, fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>
                                Hex Renk Kodu
                            </span>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    type="color"
                                    value={editingRow?.hexColor || '#000000'}
                                    onChange={(e) => setEditingRow(prev => ({ ...prev, hexColor: e.target.value }))}
                                    style={{ width: 60, height: 40, border: 'none', borderRadius: 6, cursor: 'pointer' }}
                                />
                                <input
                                    type="text"
                                    value={editingRow?.hexColor || '#000000'}
                                    onChange={(e) => setEditingRow(prev => ({ ...prev, hexColor: e.target.value }))}
                                    placeholder="#E7A4B1"
                                    style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem' }}
                                />
                            </div>
                        </label>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>
                            Ürün Görseli ⭐
                        </label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                            <div style={{
                                width: 60,
                                height: 60,
                                borderRadius: 8,
                                overflow: 'hidden',
                                border: '1px solid #ddd',
                                flexShrink: 0
                            }}>
                                <img
                                    src={editingRow?.imageUrl ? `${API_BASE_URL}${editingRow.imageUrl}` : 'https://via.placeholder.com/60'}
                                    alt="Preview"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                            <input
                                type="text"
                                value={editingRow?.imageUrl || ''}
                                onChange={(e) => setEditingRow(prev => ({ ...prev, imageUrl: e.target.value }))}
                                placeholder="/images/products/xxx.png"
                                style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem' }}
                            />
                            <label style={{
                                padding: '8px 12px',
                                background: '#e91e63',
                                color: '#fff',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                whiteSpace: 'nowrap'
                            }}>
                                Yükle
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFilePick('imageUrl', e)}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        </div>
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 12,
                    marginBottom: 16
                }}>
                    <label style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ marginBottom: 4, fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>Fiyat (₺) ⭐</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={editingRow?.price || ''}
                            onChange={(e) => setEditingRow(prev => ({ ...prev, price: e.target.value }))}
                            placeholder="399.90"
                            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem' }}
                        />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ marginBottom: 4, fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>İndirim (%)</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={editingRow?.discountPercent || ''}
                            onChange={(e) => setEditingRow(prev => ({ ...prev, discountPercent: e.target.value }))}
                            placeholder="20"
                            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem' }}
                        />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ marginBottom: 4, fontSize: '0.85rem', fontWeight: 600, color: '#333' }}>Stok Adedi ⭐</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={editingRow?.stockQuantity || ''}
                            onChange={(e) => setEditingRow(prev => ({ ...prev, stockQuantity: e.target.value }))}
                            placeholder="100"
                            style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem' }}
                        />
                    </label>
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={editingRow?.isActive || false}
                            onChange={(e) => setEditingRow(prev => ({ ...prev, isActive: e.target.checked }))}
                            style={{ width: 18, height: 18 }}
                        />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Aktif</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={editingRow?.isDefault || false}
                            onChange={(e) => setEditingRow(prev => ({ ...prev, isDefault: e.target.checked }))}
                            style={{ width: 18, height: 18 }}
                        />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Varsayılan Varyant</span>
                    </label>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={saveRow}
                        style={{
                            flex: 1,
                            padding: '10px 16px',
                            background: '#e91e63',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: 600
                        }}
                    >
                        {editingRow?.id ? 'Güncelle' : 'Ekle'}
                    </button>
                    <button
                        onClick={cancelEdit}
                        className="btn-outline"
                        style={{
                            padding: '10px 16px',
                            fontSize: '0.95rem'
                        }}
                    >
                        İptal
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: 20, background: '#fafafa', borderRadius: 12 }}>
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h4 style={{ margin: '0 0 4px', color: '#333' }}>🎨 Ürün Varyantları</h4>
                    <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>Ürününüzün farklı renk ve tonlarını yönetin</p>
                </div>
                <button
                    onClick={startNew}
                    style={{
                        padding: '10px 20px',
                        background: '#e91e63',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 2px 8px rgba(233, 30, 99, 0.3)'
                    }}
                >
                    <span style={{ fontSize: '1.2rem' }}>+</span>
                    Yeni Varyant Ekle
                </button>
            </div>

            {showForm && <VariantFormCard />}

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Yükleniyor...</div>
            ) : list.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: 60,
                    background: '#fff',
                    borderRadius: 12,
                    color: '#999',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎨</div>
                    <h3 style={{ margin: '0 0 8px', color: '#666' }}>Henüz varyant yok</h3>
                    <p style={{ margin: 0 }}>Yukarıdaki butonu kullanarak ilk varyantınızı ekleyin</p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: 16
                }}>
                    {list.map(variant => (
                        <VariantCard key={variant.id} variant={variant} />
                    ))}
                </div>
            )}
        </div>
    );
}