import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ProductQuestions.css";

export default function ProductQuestions({ productId }) {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newQuestion, setNewQuestion] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const token = localStorage.getItem("token");

    useEffect(() => {
        loadQuestions();
    }, [productId]);

    const loadQuestions = async () => {
        try {
            const res = await axios.get(`http://localhost:5011/api/products/${productId}/questions`);
            setQuestions(res.data || []);
        } catch (err) {
            console.error("Sorular yüklenemedi:", err);
            setQuestions([]);
        } finally {
            setLoading(false);
        }
    };

    // Kullanıcı adını maskele: "meltemyilmaz123" -> "mel***z123"
    const maskUsername = (name) => {
        if (!name || name.length < 4) return "Kullanıcı";
        const first = name.slice(0, 3);
        const last = name.slice(-3);
        return `${first}***${last}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token) { alert("Soru sormak için lütfen giriş yapın."); return; }
        if (!newQuestion.trim()) { alert("Lütfen sorunuzu yazın."); return; }
        if (newQuestion.length > 500) { alert("Soru en fazla 500 karakter olabilir."); return; }

        setSubmitting(true);
        try {
            await axios.post(
                `http://localhost:5011/api/products/${productId}/questions`,
                { question: newQuestion.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNewQuestion("");
            alert("Sorunuz alındı! Yanıtlandığında burada görünecektir.");
        } catch (err) {
            alert(err.response?.data || "Soru gönderilemedi.");
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diff === 0) return "Bugün";
        if (diff === 1) return "Dün";
        if (diff < 7) return `${diff} gün önce`;
        if (diff < 30) return `${Math.floor(diff / 7)} hafta önce`;

        return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
    };

    if (loading) {
        return (
            <div className="pq-premium-loading">
                <div className="pq-loader">
                    <span></span><span></span><span></span>
                </div>
                <p>Sorular yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="pq-premium">
            {/* Header */}
            <div className="pq-premium-header">
                <div className="pq-header-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                </div>
                <div className="pq-header-content">
                    <h2>Soru & Cevap</h2>
                    <p>Ürün hakkında merak ettiklerinizi sorun, uzmanlarımız yanıtlasın</p>
                </div>
                <div className="pq-stats-badge">
                    <span className="pq-stats-number">{questions.length}</span>
                    <span className="pq-stats-label">Yanıt</span>
                </div>
            </div>

            {/* Form */}
            <div className="pq-premium-form">
                <div className="pq-form-inner">
                    <div className="pq-avatar-placeholder">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                    </div>
                    <div className="pq-form-content">
                        <textarea
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            placeholder="Bu ürün hakkında bir sorunuz mu var? Buraya yazın..."
                            rows={3}
                            maxLength={500}
                            disabled={submitting}
                        />
                        <div className="pq-form-actions">
                            <div className="pq-char-indicator">
                                <svg viewBox="0 0 36 36" className={newQuestion.length > 450 ? "warning" : ""}>
                                    <circle cx="18" cy="18" r="16" fill="none" strokeWidth="3" stroke="#e0e0e0"/>
                                    <circle cx="18" cy="18" r="16" fill="none" strokeWidth="3"
                                            stroke={newQuestion.length > 450 ? "#ff6b6b" : "#e91e63"}
                                            strokeDasharray={`${(newQuestion.length / 500) * 100} 100`}
                                            transform="rotate(-90 18 18)"/>
                                </svg>
                                <span>{500 - newQuestion.length}</span>
                            </div>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !newQuestion.trim()}
                                className="pq-submit-premium"
                            >
                                {submitting ? (
                                    <>
                                        <span className="pq-btn-spinner"></span>
                                        Gönderiliyor
                                    </>
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                                        </svg>
                                        Soruyu Gönder
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Questions List */}
            <div className="pq-premium-list">
                {questions.length === 0 ? (
                    <div className="pq-empty-premium">
                        <div className="pq-empty-illustration">
                            <svg viewBox="0 0 120 120" fill="none">
                                <circle cx="60" cy="60" r="50" fill="#fff5f8"/>
                                <path d="M60 30c-16.5 0-30 13.5-30 30s13.5 30 30 30 30-13.5 30-30-13.5-30-30-30zm3 45h-6v-6h6v6zm0-12h-6V45h6v18z" fill="#e91e63"/>
                            </svg>
                        </div>
                        <h3>Henüz soru yok</h3>
                        <p>Bu ürün hakkında ilk soruyu siz sorun!</p>
                    </div>
                ) : (
                    questions.map((q, idx) => (
                        <div
                            key={q.id}
                            className={`pq-item-premium ${expandedId === q.id ? 'expanded' : ''}`}
                            style={{ animationDelay: `${idx * 0.1}s` }}
                        >
                            <div className="pq-question-premium">
                                <div className="pq-q-badge">S</div>
                                <div className="pq-q-content">
                                    <div className="pq-q-meta">
                                        <span className="pq-q-user">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                            </svg>
                                            {maskUsername(q.userName)}
                                        </span>
                                        <span className="pq-q-time">{formatDate(q.createdAt)}</span>
                                    </div>
                                    <p className="pq-q-text">{q.question}</p>
                                </div>
                            </div>

                            {q.answer && (
                                <div className="pq-answer-premium">
                                    <div className="pq-a-badge">
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                                        </svg>
                                    </div>
                                    <div className="pq-a-content">
                                        <div className="pq-a-header">
                                            <span className="pq-a-brand">
                                                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                                </svg>
                                                Mağaza Yanıtı
                                            </span>
                                            <span className="pq-a-time">{formatDate(q.answeredAt)}</span>
                                        </div>
                                        <p className="pq-a-text">{q.answer}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {questions.length > 0 && (
                <div className="pq-footer-note">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                    Sorularınız mağaza ekibimiz tarafından en kısa sürede yanıtlanır
                </div>
            )}
        </div>
    );
}