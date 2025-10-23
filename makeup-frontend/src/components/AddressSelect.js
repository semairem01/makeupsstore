// src/components/AddressSelect.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";

export default function AddressSelect({ value, onChange, onNew }) {
    const token = localStorage.getItem("token");
    const [items, setItems] = useState([]);

    useEffect(() => {
        axios
            .get(API_ENDPOINTS.ADDRESSES, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => setItems(r.data || []))
            .catch(() => setItems([]));
    }, [token]);

    // value -> id çözümü (id ya da obje gelebilir)
    const valueId = useMemo(() => {
        if (value && typeof value === "object") return value.id;
        if (typeof value === "number") return value;
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }, [value]);

    // Seçili adres: prop id/object > default adres > ilk adres
    const selected = useMemo(() => {
        return (
            items.find((x) => x.id === valueId) ||
            items.find((x) => x.isDefault) ||
            items[0] ||
            null
        );
    }, [items, valueId]);

    const handleChange = (e) => {
        const v = e.target.value;
        if (v === "__NEW__") {
            onNew?.();
            return;
        }
        const id = Number(v);
        const obj = items.find((x) => x.id === id) || null;
        onChange?.(obj);
    };

    return (
        <div className="addr-select">
            <label style={{ display: "block", marginBottom: 6 }}>Teslimat Adresi</label>
            <select
                value={selected?.id ?? ""}
                onChange={handleChange}
                style={{ width: "100%" }}
            >
                {items.map((a) => (
                    <option key={a.id} value={a.id}>
                        {a.title} – {a.neighborhood}/{a.district}/{a.city}
                    </option>
                ))}
                <option value="__NEW__">➕ Yeni adres ekle…</option>
            </select>

            {selected && (
                <div style={{ marginTop: 8, fontSize: 13, color: "#6b6b6b" }}>
                    <div>
                        <strong>{selected.fullName}</strong> · {selected.phone}
                    </div>
                    <div>
                        {selected.street} {selected.buildingNo && `No:${selected.buildingNo}`}{" "}
                        {selected.apartmentNo && `D:${selected.apartmentNo}`}
                    </div>
                    <div>
                        {selected.neighborhood} / {selected.district} / {selected.city}{" "}
                        {selected.postalCode && <> (PK {selected.postalCode})</>}
                    </div>
                </div>
            )}
        </div>
    );
}
