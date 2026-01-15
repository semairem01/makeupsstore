import React, { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import "./AdminImageUpload.css";
import { API_BASE_URL, API_ENDPOINTS } from "../config";

export default function AdminImageUpload({
                                             productId,
                                             variantId = null, // ✅ Yeni prop
                                             initialImages = []
                                         }) {
    const [images, setImages] = useState(initialImages);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);

    const token = localStorage.getItem("token");
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    // ✅ Varyanta özel görselleri yükle
    useEffect(() => {
        loadImages();
    }, [productId, variantId]);

    const loadImages = async () => {
        setLoading(true);
        try {
            const params = variantId ? `?variantId=${variantId}` : '';
            const res = await axios.get(
                `${API_ENDPOINTS.PRODUCT_IMAGES(productId)}${params}`,
                { headers: authHeaders }
            );
            setImages(res.data || []);
        } catch (err) {
            console.error("Görsel yükleme hatası:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleFiles = useCallback(async (files) => {
        if (!files || files.length === 0) return;

        const formData = new FormData();
        for (const file of files) formData.append("files", file);

        // ✅ variantId parametresini ekle
        const params = variantId ? `?variantId=${variantId}` : '';
        setUploading(true);

        try {
            const res = await axios.post(
                `${API_ENDPOINTS.PRODUCT_IMAGES(productId)}${params}`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                        ...authHeaders
                    }
                }
            );
            setImages((prev) => [...prev, ...res.data]);
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err?.message || "Yükleme başarısız";
            alert("Yükleme başarısız: " + errorMsg);
        } finally {
            setUploading(false);
        }
    }, [productId, variantId, authHeaders]);

    const onDragEnd = async (result) => {
        if (!result.destination) return;

        const newOrder = Array.from(images);
        const [moved] = newOrder.splice(result.source.index, 1);
        newOrder.splice(result.destination.index, 0, moved);
        setImages(newOrder);

        // Backend'e sıralama kaydet
        try {
            await axios.post(
                API_ENDPOINTS.PRODUCT_IMAGES_REORDER(productId),
                {
                    order: newOrder.map((img, i) => ({
                        id: img.id,
                        sortOrder: i + 1,
                    })),
                },
                { headers: authHeaders }
            );
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data ||
                err?.message ||
                "Sıralama kaydedilemedi";
            alert(msg);
            // Başarısızsa görselleri yeniden yükle
            loadImages();
        }
    };

    const removeImage = async (id) => {
        if (!window.confirm("Bu resmi silmek istiyor musun?")) return;

        try {
            await axios.delete(
                API_ENDPOINTS.DELETE_PRODUCT_IMAGE(id),
                { headers: authHeaders }
            );
            setImages((prev) => prev.filter((x) => x.id !== id));
        } catch (err) {
            alert("Silme başarısız: " + (err?.response?.data?.message || err.message));
        }
    };

    if (loading) {
        return <div className="upload-area">Görseller yükleniyor...</div>;
    }

    return (
        <div className="upload-area">
            {/* ✅ Varyant bilgisi göster */}
            {variantId && (
                <div className="variant-info">
                    <small style={{ color: "#666", fontWeight: 600 }}>
                        🎨 Varyant #{variantId} için görseller
                    </small>
                </div>
            )}

            <label className="upload-label">
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFiles(e.target.files)}
                    disabled={uploading}
                    style={{ display: 'none' }}
                />
                {uploading ? "Yükleniyor..." : "📸 Görsel Ekle"}
            </label>

            {images.length > 0 ? (
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="images" direction="horizontal">
                        {(provided) => (
                            <div
                                className="image-list"
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                            >
                                {images.map((img, index) => (
                                    <Draggable key={img.id} draggableId={String(img.id)} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                className={`image-card ${snapshot.isDragging ? 'dragging' : ''}`}
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                            >
                                                <img
                                                    src={img.url?.startsWith("http") ? img.url : `${API_BASE_URL}${img.url}`}
                                                    alt={`Görsel ${index + 1}`}
                                                    onError={(e) => {
                                                        e.target.src = 'https://via.placeholder.com/120x120?text=Yok';
                                                    }}
                                                />
                                                <div className="image-order">{index + 1}</div>
                                                <button
                                                    className="remove-btn"
                                                    onClick={() => removeImage(img.id)}
                                                    title="Sil"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            ) : (
                <div className="no-images">
                    <p style={{ color: "#999", marginTop: "1rem" }}>
                        {variantId
                            ? "Bu varyant için henüz görsel eklenmemiş"
                            : "Henüz görsel eklenmemiş"}
                    </p>
                </div>
            )}
        </div>
    );
}