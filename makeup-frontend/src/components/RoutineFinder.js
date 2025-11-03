import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_ENDPOINTS, API_BASE_URL } from "../config";
import "./RoutineFinder.css";

// Sadece EK: ikon/emoji'yi doğru çizdirmek için küçük yardımcı
function OptionIcon({ icon }) {
    if (typeof icon === "string") {
        const isPath = icon.startsWith("/") || icon.startsWith("http");
        return isPath ? <img src={icon} alt="" className="rf-icon-img" /> : <span>{icon}</span>;
    }
    return <>{icon}</>;
}

const QUESTIONS = [
    {
        id: "skin",
        title: "What's your skin type?",
        emoji: "/icons/gem.png",
        options: [
            { value: "Dry", icon: "/icons/dry.png", desc: "Tight & flaky" },
            { value: "Oily", icon: "/icons/oily.png", desc: "Shiny T-zone" },
            { value: "Combination", icon: "/icons/combination.png", desc: "Mixed zones" },
            { value: "Sensitive", icon: "/icons/sensitive.png", desc: "Easily irritated" },
            { value: "Normal", icon: "/icons/normal.png", desc: "Balanced & happy" },
        ]
    },
    {
        id: "vibe",
        title: "What's your makeup vibe?",
        emoji: "/icons/lipstick.png",
        options: [
            { value: "Natural", icon: "/icons/natural.png", desc: "Effortless & minimal" },
            { value: "Soft Glam", icon: "/icons/glam.png", desc: "Elegant & glowy" },
            { value: "Bold", icon: "/icons/bold.png", desc: "Statement & dramatic" },
        ]
    },
    {
        id: "env",
        title: "Where are you headed?",
        emoji: "/icons/event.png",
        options: [
            { value: "Office/Daylight", icon: "/icons/office.png", desc: "Professional vibes" },
            { value: "Indoor Evening", icon: "/icons/indoor.png", desc: "Dinner & dates" },
            { value: "Outdoor/Sunny", icon: "/icons/sun.png", desc: "Beach & sun" },
            { value: "Party", icon: "/icons/party.png", desc: "Dance floor ready" },
        ]
    },
    {
        id: "must",
        title: "What's your must-have?",
        emoji: "/icons/imp.png",
        options: [
            { value: "Lips", icon: "/icons/lips.png", desc: "The finishing touch" },
            { value: "Eyes", icon: "/icons/eye.png", desc: "Windows to the soul" },
            { value: "Base", icon: "/icons/base.png", desc: "Flawless canvas" },
            { value: "Cheeks", icon: "/icons/peach.png", desc: "Natural flush" },
        ]
    }
];

const EXTRA_QUESTIONS = [
    {
        id: "undertone",
        title: "What's your undertone?",
        options: [
            { value: "Warm", icon: "🌅", desc: "Peachy & golden" },
            { value: "Cool", icon: "🌸", desc: "Rosy & pink" },
            { value: "Neutral", icon: "🤍", desc: "Balanced mix" },
        ]
    },
    {
        id: "eyeColor",
        title: "Your eye color?",
        options: [
            { value: "Brown/Black", icon: "🤎", desc: "Deep & rich" },
            { value: "Hazel/Green", icon: "💚", desc: "Earthy tones" },
            { value: "Blue/Gray", icon: "💙", desc: "Cool shades" },
        ]
    }
];

function ProductCard({ product, onAdded }) {
    const token = localStorage.getItem("token");

    const addToCart = async (e) => {
        e.preventDefault();
        if (!token) {
            alert("Lütfen giriş yapın!");
            return;
        }
        try {
            await axios.post(
                "http://localhost:5011/api/cart",
                { productId: product.id, quantity: 1 },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert("✨ Sepete eklendi!");
            if (onAdded) onAdded(1);
        } catch (err) {
            alert("Sepete eklenirken hata: " + (err.response?.data || err.message));
        }
    };

    return (
        <div className="rf-product-card-new">
            <div className="rf-product-image-wrap">
                <img
                    src={`${API_BASE_URL}${product.imageUrl}`}
                    alt={product.name}
                    onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/300x300?text=No+Image";
                    }}
                />
                {product.badges && product.badges.length > 0 && (
                    <div className="rf-product-badges-overlay">
                        {product.badges.slice(0, 2).map((badge, i) => (
                            <span key={i} className="rf-badge-overlay">{badge}</span>
                        ))}
                    </div>
                )}
            </div>
            <div className="rf-product-content">
                <div className="rf-product-brand-new">{product.brand}</div>
                <h4 className="rf-product-name-new">{product.name}</h4>
                {product.matchReason && (
                    <div className="rf-match-reason">
                        ✨ {product.matchReason}
                    </div>
                )}
                {product.shadeFamily && (
                    <div className="rf-product-shade-new">🎨 {product.shadeFamily}</div>
                )}
                <div className="rf-product-footer">
                    <div className="rf-product-price-new">₺{product.price.toLocaleString("tr-TR")}</div>
                    <button className="rf-add-btn" onClick={addToCart}>
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function RoutineFinder({ onAdded }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [showExtra, setShowExtra] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const isMainQuestionsComplete = QUESTIONS.every(q => answers[q.id]);
    const currentQuestion = showExtra
        ? EXTRA_QUESTIONS[currentStep - QUESTIONS.length]
        : QUESTIONS[currentStep];

    const handleAnswer = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));

        // Auto advance
        setTimeout(() => {
            if (currentStep < QUESTIONS.length - 1) {
                setCurrentStep(currentStep + 1);
            } else if (showExtra && currentStep < QUESTIONS.length + EXTRA_QUESTIONS.length - 1) {
                setCurrentStep(currentStep + 1);
            }
        }, 300);
    };

    const handleGetResults = async () => {
        if (!isMainQuestionsComplete) {
            alert("Lütfen tüm soruları cevaplayın!");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                skin: answers.skin,
                vibe: answers.vibe,
                env: answers.env,
                must: answers.must,
                undertone: answers.undertone || null,
                eyeColor: answers.eyeColor || null,
            };

            const response = await axios.post(API_ENDPOINTS.RECOMMEND_ROUTINE, payload);
            setResult(response.data);

            // Scroll to results
            setTimeout(() => {
                document.querySelector('.rf-results')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 100);
        } catch (err) {
            console.error("Backend öneri hatası:", err);
            alert("Öneriler yüklenirken hata oluştu: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const resetQuiz = () => {
        setCurrentStep(0);
        setAnswers({});
        setShowExtra(false);
        setResult(null);
    };

    if (result) {
        return (
            <div className="rf-results">
                {/* Persona Card */}
                <div className="rf-persona-reveal">
                    <div className="rf-persona-icon" style={{ color: result.personaColor }}>
                        {result.personaIcon}
                    </div>
                    <h2 className="rf-persona-name">You're {result.personaName}!</h2>
                    <p className="rf-persona-desc">{result.personaDescription}</p>
                    <button className="rf-retake-btn" onClick={resetQuiz}>
                        Take Quiz Again
                    </button>
                </div>

                {/* Product Recommendations */}
                <div className="rf-recommendations">
                    <h3 className="rf-recommendations-title">Your Personalized Picks ✨</h3>

                    {/* Must-Have Category First */}
                    {result[answers.must?.toLowerCase()] && result[answers.must.toLowerCase()].length > 0 && (
                        <div className="rf-category-section priority">
                            <h4 className="rf-category-title">
                                <span className="rf-category-icon">💖</span>
                                {answers.must} (Your Must-Have!)
                            </h4>
                            <div className="rf-products-grid-new">
                                {result[answers.must.toLowerCase()].map((p) => (
                                    <ProductCard key={p.id} product={p} onAdded={onAdded} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Other Categories */}
                    {["lips", "eyes", "base", "cheeks"]
                        .filter(cat => cat !== answers.must?.toLowerCase())
                        .map((cat) => {
                            const products = result[cat];
                            if (!products || products.length === 0) return null;

                            const icons = {
                                lips: "💋",
                                eyes: "👁️",
                                base: "🧴",
                                cheeks: "🍑"
                            };

                            return (
                                <div key={cat} className="rf-category-section">
                                    <h4 className="rf-category-title">
                                        <span className="rf-category-icon">{icons[cat]}</span>
                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </h4>
                                    <div className="rf-products-grid-new">
                                        {products.map((p) => (
                                            <ProductCard key={p.id} product={p} onAdded={onAdded} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
        );
    }

    return (
        <div className="rf-container">
            {/* Hero Section */}
            <div className="rf-hero">
                <h1 className="rf-hero-title">
                    Discover Your Beauty DNA
                </h1>
                <p className="rf-hero-subtitle">
                    Take our quiz and unlock your perfect makeup routine ✨
                </p>
            </div>

            {/* Progress Bar */}
            <div className="rf-progress-container">
                <div className="rf-progress-bar">
                    <div
                        className="rf-progress-fill"
                        style={{
                            width: `${((currentStep + 1) / (showExtra ? QUESTIONS.length + EXTRA_QUESTIONS.length : QUESTIONS.length)) * 100}%`
                        }}
                    />
                </div>
                <div className="rf-progress-text">
                    Question {currentStep + 1} of {showExtra ? QUESTIONS.length + EXTRA_QUESTIONS.length : QUESTIONS.length}
                </div>
            </div>

            {/* Question Card */}
            <div className="rf-question-card">
                <div className="rf-question-emoji">
                    <OptionIcon icon={currentQuestion.emoji} />
                </div>
                <h2 className="rf-question-title">{currentQuestion.title}</h2>

                <div className="rf-options-grid">
                    {currentQuestion.options.map((option) => {
                        const isSelected = answers[currentQuestion.id] === option.value;
                        return (
                            <button
                                key={option.value}
                                className={`rf-option-card ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleAnswer(currentQuestion.id, option.value)}
                            >
                                <div className="rf-option-icon">
                                    <OptionIcon icon={option.icon} />
                                </div>
                                <div className="rf-option-value">{option.value}</div>
                                <div className="rf-option-desc">{option.desc}</div>
                                {isSelected && <div className="rf-option-checkmark">✓</div>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="rf-nav-buttons">
                {currentStep > 0 && (
                    <button
                        className="rf-nav-btn rf-nav-back"
                        onClick={() => setCurrentStep(currentStep - 1)}
                    >
                        ← Back
                    </button>
                )}

                {currentStep === QUESTIONS.length - 1 && !showExtra && isMainQuestionsComplete && (
                    <div className="rf-final-actions">
                        <button
                            className="rf-nav-btn rf-nav-extra"
                            onClick={() => {
                                setShowExtra(true);
                                setCurrentStep(QUESTIONS.length);
                            }}
                        >
                            ✨ Get Even More Personalized
                        </button>
                        <button
                            className="rf-nav-btn rf-nav-submit"
                            onClick={handleGetResults}
                            disabled={loading}
                        >
                            {loading ? '✨ Creating Your Routine...' : 'See My Results →'}
                        </button>
                    </div>
                )}

                {showExtra && currentStep === QUESTIONS.length + EXTRA_QUESTIONS.length - 1 && (
                    <button
                        className="rf-nav-btn rf-nav-submit"
                        onClick={handleGetResults}
                        disabled={loading}
                    >
                        {loading ? '✨ Creating Your Routine...' : 'See My Results →'}
                    </button>
                )}
            </div>

            {/* Skip Extra Questions */}
            {showExtra && (
                <button
                    className="rf-skip-btn"
                    onClick={handleGetResults}
                    disabled={loading}
                >
                    Skip & See Results
                </button>
            )}
        </div>
    );
}
