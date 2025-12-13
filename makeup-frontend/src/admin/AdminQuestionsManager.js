import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AdminQuestionsManager.css";

export default function AdminQuestionsManager() {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("unanswered");
    const [answeringId, setAnsweringId] = useState(null);
    const [answerText, setAnswerText] = useState("");
    const token = localStorage.getItem("token");

    useEffect(() => {
        loadQuestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadQuestions = async () => {
        try {
            const productsRes = await axios.get("http://localhost:5011/api/product", {
                headers: { Authorization: `Bearer ${token}` }
            });

            const allQuestions = [];
            for (const product of productsRes.data) {
                try {
                    const qRes = await axios.get(
                        `http://localhost:5011/api/products/${product.id}/questions/admin/all`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    allQuestions.push(...qRes.data.map(q => ({ ...q, productName: product.name })));
                } catch (err) {
                    console.error(`Ürün ${product.id} soruları yüklenemedi:`, err);
                }
            }

            setQuestions(allQuestions.sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            ));
        } catch (err) {
            console.error("Sorular yüklenemedi:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = async (productId, questionId) => {
        if (!answerText.trim()) return;

        try {
            await axios.post(
                `http://localhost:5011/api/products/${productId}/questions/${questionId}/answer`,
                { questionId, answer: answerText },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setAnsweringId(null);
            setAnswerText("");
            alert("Yanıt yayınlandı!");
            loadQuestions();
        } catch (err) {
            alert("Yanıt gönderilemedi: " + (err.response?.data || err.message));
        }
    };

    const handleDelete = async (productId, questionId) => {
        // eslint-disable-next-line no-restricted-globals
        if (!window.confirm("Bu soruyu silmek istediğinizden emin misiniz?")) return;

        try {
            await axios.delete(
                `http://localhost:5011/api/products/${productId}/questions/${questionId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert("Soru silindi");
            loadQuestions();
        } catch (err) {
            alert("Soru silinemedi: " + (err.response?.data || err.message));
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("tr-TR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const filteredQuestions = questions.filter(q => {
        if (filter === "unanswered") return !q.answer;
        if (filter === "answered") return q.answer;
        return true;
    });

    if (loading) {
        return <div className="admin-qa-loading">Yükleniyor...</div>;
    }

    return (
        <div className="admin-qa-container">
            <div className="admin-qa-header">
                <h1>Ürün Soruları Yönetimi</h1>
                <div className="qa-stats">
                    <div className="stat-card">
                        <span className="stat-label">Toplam</span>
                        <span className="stat-value">{questions.length}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Cevaplanmamış</span>
                        <span className="stat-value unanswered">
                            {questions.filter(q => !q.answer).length}
                        </span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Yayında</span>
                        <span className="stat-value published">
                            {questions.filter(q => q.isPublished).length}
                        </span>
                    </div>
                </div>
            </div>

            <div className="admin-qa-filters">
                <button
                    className={`filter-btn ${filter === "all" ? "active" : ""}`}
                    onClick={() => setFilter("all")}
                >
                    Tümü
                </button>
                <button
                    className={`filter-btn ${filter === "unanswered" ? "active" : ""}`}
                    onClick={() => setFilter("unanswered")}
                >
                    Cevaplanmamış ({questions.filter(q => !q.answer).length})
                </button>
                <button
                    className={`filter-btn ${filter === "answered" ? "active" : ""}`}
                    onClick={() => setFilter("answered")}
                >
                    Cevaplanmış ({questions.filter(q => q.answer).length})
                </button>
            </div>

            <div className="admin-qa-list">
                {filteredQuestions.length === 0 ? (
                    <div className="empty-state">
                        <p>Bu kategoride soru bulunmamaktadır.</p>
                    </div>
                ) : (
                    filteredQuestions.map((q) => (
                        <div key={q.id} className={`admin-qa-item ${!q.answer ? "pending" : ""}`}>
                            <div className="qa-item-header">
                                <div className="product-info">
                                    <span className="product-name">{q.productName}</span>
                                    {!q.answer && <span className="pending-badge">Yanıt Bekliyor</span>}
                                    {q.isPublished && <span className="published-badge">Yayında</span>}
                                </div>
                                <button
                                    className="delete-btn"
                                    onClick={() => handleDelete(q.productId, q.id)}
                                    title="Sil"
                                >
                                    🗑️
                                </button>
                            </div>

                            <div className="qa-item-body">
                                <div className="question-section">
                                    <div className="user-meta">
                                        <span className="user-name">👤 {q.userName}</span>
                                        <span className="date">{formatDate(q.createdAt)}</span>
                                    </div>
                                    <p className="question-text">{q.question}</p>
                                </div>

                                {q.answer ? (
                                    <div className="answer-section">
                                        <div className="answer-header">
                                            <span className="answer-label">✓ Yanıtınız</span>
                                            {q.answeredAt && (
                                                <span className="date">{formatDate(q.answeredAt)}</span>
                                            )}
                                        </div>
                                        <p className="answer-text">{q.answer}</p>
                                    </div>
                                ) : answeringId === q.id ? (
                                    <div className="answer-form">
                                        <textarea
                                            className="answer-textarea"
                                            value={answerText}
                                            onChange={(e) => setAnswerText(e.target.value)}
                                            placeholder="Yanıtınızı yazın..."
                                            rows={4}
                                            maxLength={1000}
                                        />
                                        <div className="form-actions">
                                            <button
                                                className="btn-cancel"
                                                onClick={() => {
                                                    setAnsweringId(null);
                                                    setAnswerText("");
                                                }}
                                            >
                                                İptal
                                            </button>
                                            <button
                                                className="btn-submit"
                                                onClick={() => handleAnswer(q.productId, q.id)}
                                                disabled={!answerText.trim()}
                                            >
                                                Yanıtla ve Yayınla
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        className="answer-btn"
                                        onClick={() => setAnsweringId(q.id)}
                                    >
                                        💬 Yanıtla
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}