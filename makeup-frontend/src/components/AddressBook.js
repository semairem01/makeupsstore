// src/components/AddressBook.jsx
import React, {useEffect, useState} from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import "./AddressBook.css";

export default function AddressBook() {
    const token = localStorage.getItem("token");
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [edit, setEdit] = useState(null);

    const hdr = { Authorization: `Bearer ${token}` };

    const load = async () => {
        const r = await axios.get(API_ENDPOINTS.ADDRESSES, { headers: hdr });
        setItems(r.data || []);
    };
    useEffect(() => { load(); }, []);

    const delItem = async (id) => {
        if (!window.confirm("Adres silinsin mi?")) return;
        await axios.delete(`${API_ENDPOINTS.ADDRESSES}/${id}`, { headers: hdr });
        load();
    };
    const setDefault = async (id) => {
        await axios.post(`${API_ENDPOINTS.ADDRESSES}/${id}/default`, {}, { headers: hdr });
        load();
    };

    return (
        <div className="addr-wrap">
            <div className="addr-head">
                <div>
                    <h3>Adreslerim</h3>
                    <p>Kargo ve faturalandırma için kayıtlı adreslerin.</p>
                </div>
                <button className="btn btn-add" onClick={() => { setEdit(null); setOpen(true); }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Yeni Adres
                </button>
            </div>

            {!items.length && (
                <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                    <h4>Henüz adres eklemediniz</h4>
                    <p>Hızlı teslimat için bir adres ekleyin</p>
                </div>
            )}

            <div className="addr-grid">
                {items.map(a => (
                    <div key={a.id} className={`addr-card ${a.isDefault ? "default": ""}`}>
                        {a.isDefault && (
                            <div className="default-badge">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                                Varsayılan
                            </div>
                        )}

                        <div className="addr-header">
                            <div className="addr-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                </svg>
                            </div>
                            <h4>{a.title || "Adres"}</h4>
                        </div>

                        <div className="addr-body">
                            <div className="addr-row">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <span>{a.fullName}</span>
                            </div>
                            <div className="addr-row">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                </svg>
                                <span>{a.phone}</span>
                            </div>
                            <div className="addr-row addr-full">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                <div>
                                    <div>{a.street} {a.buildingNo && `No:${a.buildingNo}`} {a.apartmentNo && `D:${a.apartmentNo}`}</div>
                                    <div className="addr-location">{a.neighborhood} / {a.district} / {a.city}</div>
                                    {a.postalCode && <div className="addr-postal">{a.postalCode}</div>}
                                </div>
                            </div>
                            {a.notes && (
                                <div className="addr-notes">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                    </svg>
                                    {a.notes}
                                </div>
                            )}
                        </div>

                        <div className="addr-actions">
                            {!a.isDefault && (
                                <button className="btn-action btn-secondary" onClick={() => setDefault(a.id)}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                    </svg>
                                    Varsayılan Yap
                                </button>
                            )}
                            <button className="btn-action btn-edit" onClick={() => { setEdit(a); setOpen(true); }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Düzenle
                            </button>
                            <button className="btn-action btn-delete" onClick={() => delItem(a.id)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Sil
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {open && (
                <AddressModal
                    initial={edit}
                    onClose={() => setOpen(false)}
                    onSaved={() => { setOpen(false); load(); }}
                />
            )}
        </div>
    );
}

function AddressModal({ initial, onClose, onSaved }) {
    const token = localStorage.getItem("token");
    const hdr = { Authorization: `Bearer ${token}` };

    const [cities, setCities] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [nbhds, setNbhds] = useState([]);

    const [f, setF] = useState(initial ?? {
        title: "Ev", fullName: "", phone: "",
        cityId: 0, districtId: 0, neighborhoodId: 0,
        street: "", buildingNo: "", apartmentNo: "", postalCode: "", notes: "", isDefault: false
    });

    useEffect(() => {
        axios.get(API_ENDPOINTS.GEO_CITIES).then(r => setCities(r.data));
    }, []);

    useEffect(() => {
        if (!f.cityId) { setDistricts([]); setNbhds([]); return; }
        axios.get(API_ENDPOINTS.GEO_DISTRICTS(f.cityId)).then(r => setDistricts(r.data));
    }, [f.cityId]);

    useEffect(() => {
        if (!f.districtId) { setNbhds([]); return; }
        axios.get(API_ENDPOINTS.GEO_NBHDS(f.districtId)).then(r => setNbhds(r.data));
    }, [f.districtId]);

    const save = async () => {
        // Validasyon
        if (!f.fullName || !f.phone) {
            alert("Ad Soyad ve Telefon alanları zorunludur!");
            return;
        }
        if (!f.cityId || f.cityId === 0 || !f.districtId || f.districtId === 0 || !f.neighborhoodId || f.neighborhoodId === 0) {
            alert("İl, İlçe ve Mahalle seçmelisiniz!");
            return;
        }
        if (!f.street) {
            alert("Cadde/Sokak alanı zorunludur!");
            return;
        }

        const payload = {
            title: f.title || "Ev",
            fullName: f.fullName.trim(),
            phone: f.phone.trim(),
            cityId: Number(f.cityId),
            districtId: Number(f.districtId),
            neighborhoodId: Number(f.neighborhoodId),
            street: f.street.trim(),
            buildingNo: f.buildingNo?.trim() || "",
            apartmentNo: f.apartmentNo?.trim() || "",
            postalCode: f.postalCode?.trim() || "",
            notes: f.notes?.trim() || "",
            isDefault: !!f.isDefault
        };

        try {
            if (initial?.id) {
                await axios.put(`${API_ENDPOINTS.ADDRESSES}/${initial.id}`, payload, { headers: hdr });
            } else {
                await axios.post(API_ENDPOINTS.ADDRESSES, payload, { headers: hdr });
            }
            onSaved();
        } catch (error) {
            console.error("Kayıt hatası:", error.response?.data || error.message);
            alert("Adres kaydedilemedi: " + (error.response?.data?.message || error.message));
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                        <h3>{initial ? "Adresi Düzenle" : "Yeni Adres Ekle"}</h3>
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
                    <div className="form-grid">
                        <div className="form-group full">
                            <label>Adres Başlığı</label>
                            <input
                                type="text"
                                placeholder="Ev, İş, vb."
                                value={f.title}
                                onChange={e=>setF({...f, title:e.target.value})}
                            />
                        </div>

                        <div className="form-group">
                            <label>Ad Soyad *</label>
                            <input
                                type="text"
                                placeholder="Alıcı adı soyadı"
                                value={f.fullName}
                                onChange={e=>setF({...f, fullName:e.target.value})}
                            />
                        </div>

                        <div className="form-group">
                            <label>Telefon *</label>
                            <input
                                type="tel"
                                placeholder="0555 555 55 55"
                                value={f.phone}
                                onChange={e=>setF({...f, phone:e.target.value})}
                            />
                        </div>

                        <div className="form-group">
                            <label>İl *</label>
                            <select value={f.cityId} onChange={e=>setF({...f, cityId:e.target.value, districtId:0, neighborhoodId:0})}>
                                <option value={0}>Şehir Seçiniz</option>
                                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>İlçe *</label>
                            <select value={f.districtId} onChange={e=>setF({...f, districtId:e.target.value, neighborhoodId:0})} disabled={!f.cityId}>
                                <option value={0}>İlçe Seçiniz</option>
                                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>

                        <div className="form-group full">
                            <label>Mahalle *</label>
                            <select value={f.neighborhoodId} onChange={e=>setF({...f, neighborhoodId:e.target.value})} disabled={!f.districtId}>
                                <option value={0}>Mahalle Seçiniz</option>
                                {nbhds.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                            </select>
                        </div>

                        <div className="form-group full">
                            <label>Cadde/Sokak *</label>
                            <input
                                type="text"
                                placeholder="Cadde veya sokak adı"
                                value={f.street}
                                onChange={e=>setF({...f, street:e.target.value})}
                            />
                        </div>

                        <div className="form-group">
                            <label>Bina No</label>
                            <input
                                type="text"
                                placeholder="Bina numarası"
                                value={f.buildingNo}
                                onChange={e=>setF({...f, buildingNo:e.target.value})}
                            />
                        </div>

                        <div className="form-group">
                            <label>Daire No</label>
                            <input
                                type="text"
                                placeholder="Daire numarası"
                                value={f.apartmentNo}
                                onChange={e=>setF({...f, apartmentNo:e.target.value})}
                            />
                        </div>

                        <div className="form-group full">
                            <label>Posta Kodu</label>
                            <input
                                type="text"
                                placeholder="Posta kodu (opsiyonel)"
                                value={f.postalCode}
                                onChange={e=>setF({...f, postalCode:e.target.value})}
                            />
                        </div>

                        <div className="form-group full">
                            <label>Adres Tarifi (Opsiyonel)</label>
                            <textarea
                                rows="3"
                                placeholder="Kargocuya yardımcı olacak ek bilgiler..."
                                value={f.notes}
                                onChange={e=>setF({...f, notes:e.target.value})}
                            />
                        </div>

                        <div className="form-group full checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={!!f.isDefault}
                                    onChange={e=>setF({...f, isDefault:e.target.checked})}
                                />
                                <span className="checkbox-custom"></span>
                                <span>Bu adresi varsayılan adresim yap</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>İptal</button>
                    <button className="btn-save" onClick={save}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                        {initial ? "Güncelle" : "Kaydet"}
                    </button>
                </div>
            </div>
        </div>
    );
}
export const __INTERNAL__AddressModal = AddressModal;