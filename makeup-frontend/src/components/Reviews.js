// src/components/Reviews.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";

function Star({ filled, onClick }) {
    return (
        <span
            onClick={onClick}
            style={{
                cursor: onClick ? "pointer" : "default",
                fontSize: 20,
                marginRight: 4,
                color: filled ? "#ff69b4" : "#ccc",
            }}
            aria-label={filled ? "doldu" : "boş"}
        >
      {filled ? "★" : "☆"}
    </span>
    );
}

// ⭐ variantId prop'u eklendi
export default function Reviews({ productId, variantId }) {
    const token = localStorage.getItem("token");

    const auth = useMemo(
        () => (token ? { Authorization: `Bearer ${token}` } : undefined),
        [token]
    );

    const [data, setData] = useState({
        average: 0,
        count: 0,
        distribution: {},
        items: [],
    });

    const [meReviewId, setMeReviewId] = useState(null);

    const [newRating, setNewRating] = useState(5);
    const [newComment, setNewComment] = useState("");

    const [editingId, setEditingId] = useState(null);
    const [editRating, setEditRating] = useState(5);
    const [editComment, setEditComment] = useState("");

    // ⭐ Listeyi yükle (variantId varsa query param olarak ekle)
    const load = useCallback(() => {
        const params = new URLSearchParams();
        if (variantId) params.set("variantId", String(variantId)); // ⭐
        return axios
            .get(`${API_ENDPOINTS.REVIEWS}/product/${productId}?${params.toString()}`)
            .then((r) => setData(r.data))
            .catch(() => {});
    }, [productId, variantId]); // ⭐

    // ⭐ “Benim yorumum var mı?” (varyant bazlı tutacaksan query param ekle)
    const fetchMine = useCallback(async () => {
        if (!auth) {
            setMeReviewId(null);
            return;
        }
        try {
            const params = new URLSearchParams();
            if (variantId) params.set("variantId", String(variantId)); // ⭐
            const r = await axios.get(
                `${API_ENDPOINTS.REVIEWS}/my/${productId}?${params.toString()}`, // ⭐
                { headers: auth }
            );
            setMeReviewId(r.data?.id ?? null);
        } catch {
            setMeReviewId(null);
        }
    }, [auth, productId, variantId]); // ⭐

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        fetchMine();
    }, [fetchMine]);

    // Yeni yorum gönder (body'ye variantId ekle)
    const submitNew = async () => {
        if (!auth) {
            alert("Yorum yapmak için giriş yapın.");
            return;
        }
        try {
            await axios.post(
                `${API_ENDPOINTS.REVIEWS}`,
                {
                    productId,
                    variantId: variantId ?? null, // ⭐
                    rating: newRating,
                    comment: newComment.trim(),
                },
                { headers: auth }
            );
            setNewComment("");
            setNewRating(5);
            await load();
            await fetchMine();
        } catch (e) {
            if (e?.response?.status === 409) {
                alert("Bu ürüne zaten bir yorumunuz var. Düzenleyebilirsiniz.");
            } else {
                alert(e?.response?.data || "Yorum kaydedilemedi.");
            }
        }
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditRating(item.rating);
        setEditComment(item.comment ?? "");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditRating(5);
        setEditComment("");
    };

    const updateReview = async () => {
        if (!auth || !editingId) return;
        try {
            await axios.put(
                `${API_ENDPOINTS.REVIEWS}/${editingId}`,
                { rating: editRating, comment: editComment.trim() },
                { headers: auth }
            );
            cancelEdit();
            await load();
        } catch (e) {
            alert(e?.response?.data || "Yorum güncellenemedi.");
        }
    };

    const deleteReview = async (id) => {
        if (!auth) return;
        if (!window.confirm("Yorumu silmek istediğinize emin misiniz?")) return;
        try {
            await axios.delete(`${API_ENDPOINTS.REVIEWS}/${id}`, { headers: auth });
            if (meReviewId === id) setMeReviewId(null);
            await load();
            await fetchMine();
        } catch (e) {
            alert(e?.response?.data || "Yorum silinemedi.");
        }
    };

    const distArr = useMemo(() => {
        const d = data.distribution || {};
        return [5, 4, 3, 2, 1].map((s) => ({ star: s, count: d[s] || 0 }));
    }, [data]);

    return (
        <div style={{ marginTop: 24 }}>
            <h3>Değerlendirmeler</h3>

            {/* Özet */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                    style={{ fontSize: 36, fontWeight: 700, color: "#ff69b4" }}
                    aria-label="ortalama puan"
                >
                    {data.average?.toFixed(1) || "0.0"}
                </div>
                <div>
                    <div>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} filled={i <= Math.round(data.average || 0)} />
                        ))}
                    </div>
                    <div style={{ color: "#666", fontSize: 14 }}>
                        {data.count} yorum{" "}
                        {variantId ? (
                            <em style={{ marginLeft: 6 }}>(Bu varyant için)</em> // ⭐
                        ) : (
                            <em style={{ marginLeft: 6 }}>(Tüm ürün)</em>
                        )}
                    </div>
                </div>
            </div>

            {/* Dağılım */}
            <div style={{ marginTop: 8 }}>
                {distArr.map((row) => (
                    <div
                        key={row.star}
                        style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                        <span style={{ width: 20 }}>{row.star}★</span>
                        <div
                            style={{
                                background: "#eee",
                                flex: 1,
                                height: 8,
                                borderRadius: 6,
                                overflow: "hidden",
                            }}
                        >
                            <div
                                style={{
                                    width: data.count ? `${(row.count / data.count) * 100}%` : "0%",
                                    height: "100%",
                                    background: "#ff69b4",
                                }}
                            />
                        </div>
                        <span style={{ width: 30, textAlign: "right" }}>{row.count}</span>
                    </div>
                ))}
            </div>

            {/* YENİ YORUM – Sadece girişli ve henüz yorum bırakmamışsa */}
            {auth && !meReviewId && (
                <div
                    style={{
                        marginTop: 16,
                        borderTop: "1px solid #f1f1f1",
                        paddingTop: 12,
                    }}
                >
                    <div style={{ marginBottom: 8 }}>Puanınız:</div>
                    <div style={{ marginBottom: 8 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} filled={i <= newRating} onClick={() => setNewRating(i)} />
                        ))}
                    </div>
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Yorumunuzu yazın (opsiyonel)"
                        style={{
                            width: "100%",
                            minHeight: 80,
                            padding: 10,
                            borderRadius: 8,
                            border: "1px solid #eee",
                        }}
                    />
                    <button onClick={submitNew} className="btn" style={{ marginTop: 8 }}>
                        Gönder
                    </button>
                </div>
            )}

            {/* LİSTE */}
            <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
                {(data.items || []).map((it) => {
                    const isMine = meReviewId === it.id;
                    const isEditing = editingId === it.id;

                    return (
                        <li key={it.id} style={{ borderBottom: "1px solid #f3f3f3", padding: "10px 0" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <strong>{it.userDisplayName}</strong>
                                <span style={{ color: "#999", fontSize: 12 }}>
                  {new Date(it.createdAt).toLocaleDateString("tr-TR")}
                </span>

                                {isMine && !isEditing && (
                                    <span
                                        style={{
                                            marginLeft: "auto",
                                            display: "flex",
                                            gap: 8,
                                            alignItems: "center",
                                        }}
                                    >
                    <button onClick={() => startEdit(it)} className="btn-outline">
                      Düzenle
                    </button>
                    <button onClick={() => deleteReview(it.id)} className="btn-outline danger">
                      Sil
                    </button>
                  </span>
                                )}
                            </div>

                            {!isEditing && (
                                <>
                                    <div style={{ margin: "6px 0" }}>
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <Star key={i} filled={i <= it.rating} />
                                        ))}
                                    </div>
                                    {it.comment && <div style={{ color: "#444" }}>{it.comment}</div>}
                                </>
                            )}

                            {isEditing && (
                                <div
                                    style={{
                                        marginTop: 8,
                                        background: "#fff",
                                        border: "1px solid #f1f1f1",
                                        padding: 10,
                                        borderRadius: 10,
                                    }}
                                >
                                    <div style={{ marginBottom: 8, display: "flex", gap: 4 }}>
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <Star key={i} filled={i <= editRating} onClick={() => setEditRating(i)} />
                                        ))}
                                    </div>
                                    <textarea
                                        value={editComment}
                                        onChange={(e) => setEditComment(e.target.value)}
                                        placeholder="Yorumunuzu güncelleyin"
                                        style={{
                                            width: "100%",
                                            minHeight: 80,
                                            padding: 10,
                                            borderRadius: 8,
                                            border: "1px solid #eee",
                                        }}
                                    />
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 8,
                                            justifyContent: "flex-end",
                                            marginTop: 8,
                                        }}
                                    >
                                        <button onClick={cancelEdit} className="btn-outline">
                                            İptal
                                        </button>
                                        <button onClick={updateReview} className="btn">
                                            Kaydet
                                        </button>
                                    </div>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
