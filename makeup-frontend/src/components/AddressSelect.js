// src/components/AddressSelect.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import "./AddressSelect.css";

export default function AddressSelect({ value, onChange, onNew }) {
    const token = localStorage.getItem("token");
    const [items, setItems] = useState([]);
    const [selectedId, setSelectedId] = useState(0);

    // İsim map'leri
    const [cityMap, setCityMap] = useState({});           // { [cityId]: cityName }
    const [districtMap, setDistrictMap] = useState({});   // { [districtId]: districtName }
    const [nbhdMap, setNbhdMap] = useState({});           // { [neighborhoodId]: neighborhoodName }

    // 1) Adresleri çek
    useEffect(() => {
        axios
            .get(API_ENDPOINTS.ADDRESSES, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => setItems(r.data || []))
            .catch(() => setItems([]));
    }, [token]);

    // 2) İsimleri batch olarak doldur
    useEffect(() => {
        if (!items.length) return;

        // a) Şehirler: tek istek
        axios.get(API_ENDPOINTS.GEO_CITIES).then((r) => {
            const m = {};
            for (const c of r.data || []) m[c.id] = c.name;
            setCityMap(m);
        });

        // b) İlçeler: unique cityId’ler için istek at, her dönüşten district id->name map çıkar
        (async () => {
            const uniqueCityIds = [...new Set(items.map(i => i.cityId).filter(Boolean))];
            const dMap = {};
            await Promise.all(
                uniqueCityIds.map(cid =>
                    axios.get(API_ENDPOINTS.GEO_DISTRICTS(cid)).then(res => {
                        for (const d of res.data || []) dMap[d.id] = d.name;
                    })
                )
            );
            setDistrictMap(dMap);
        })();

        // c) Mahalleler: unique districtId’ler için istek at, nbhd id->name map
        (async () => {
            const uniqueDistIds = [...new Set(items.map(i => i.districtId).filter(Boolean))];
            const nMap = {};
            await Promise.all(
                uniqueDistIds.map(did =>
                    axios.get(API_ENDPOINTS.GEO_NBHDS(did)).then(res => {
                        for (const n of res.data || []) nMap[n.id] = n.name;
                    })
                )
            );
            setNbhdMap(nMap);
        })();
    }, [items]);

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

    // Seçim olduğunda Checkout'a zenginleştirilmiş obje gönder
    useEffect(() => {
        if (!selected) return;
        setSelectedId(selected.id);

        const enriched = {
            ...selected,
            city: cityMap[selected.cityId],                 // kartta da kullanılabilir
            district: districtMap[selected.districtId],
            neighborhood: nbhdMap[selected.neighborhoodId],
            cityName: cityMap[selected.cityId],            // Checkout formu için açık adlar
            districtName: districtMap[selected.districtId],
            neighborhoodName: nbhdMap[selected.neighborhoodId],
        };
        onChange?.(enriched);
        // cityMap/districtMap/nbhdMap doldukça tekrar tetiklenir ve form isimlerle güncellenir
    }, [selected, cityMap, districtMap, nbhdMap, onChange]);

    const handleSelect = (addr) => {
        setSelectedId(addr.id);
        const enriched = {
            ...addr,
            city: cityMap[addr.cityId],
            district: districtMap[addr.districtId],
            neighborhood: nbhdMap[addr.neighborhoodId],
            cityName: cityMap[addr.cityId],
            districtName: districtMap[addr.districtId],
            neighborhoodName: nbhdMap[addr.neighborhoodId],
        };
        onChange?.(enriched);
    };

    const nameOrId = (id, map) => map[id] ?? id ?? "";

    return (
        <div className="address-grid">
            {items.map((a) => (
                <div
                    key={a.id}
                    className={`address-card ${selectedId === a.id ? "selected" : ""}`}
                    onClick={() => handleSelect(a)}
                >
                    <div className="address-header">
                        <span className="address-title">{a.title || "Adres"}</span>
                        {a.isDefault && <span className="default-badge">Varsayılan</span>}
                    </div>

                    <div className="address-info">
                        <div className="line">
                            <strong>{a.fullName}</strong> · {a.phone}
                        </div>
                        <div className="line">
                            {a.street} {a.buildingNo && `No:${a.buildingNo}`}{" "}
                            {a.apartmentNo && `D:${a.apartmentNo}`}
                        </div>
                        <div className="line">
                            {nameOrId(a.neighborhoodId, nbhdMap)} / {nameOrId(a.districtId, districtMap)} / {nameOrId(a.cityId, cityMap)}
                        </div>
                        {a.postalCode && <div className="line">PK {a.postalCode}</div>}
                    </div>
                </div>
            ))}

            <div className="address-card add-new" onClick={onNew}>
                <div className="plus">+</div>
                <div>Yeni Adres Ekle</div>
            </div>
        </div>
    );
}
