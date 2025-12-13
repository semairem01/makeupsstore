import React, { useState, useEffect } from "react";
import { X, Moon, Star, Sparkles } from "lucide-react";

const LunaraDiscountPopup = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState("initial"); // initial, selecting, revealed
    const [selectedMoon, setSelectedMoon] = useState(null);
    const [discount, setDiscount] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);

    const moonPhases = [
        {
            id: 1,
            name: "Crescent Moon",
            value: 10,
            condition: "Orders over ₺750",
            image:
                "https://images.unsplash.com/photo-1532693322450-2cb5c511067d?w=400&h=400&fit=crop",
            glow: "rgba(251, 191, 36, 0.5)",
        },
        {
            id: 2,
            name: "Harvest Moon",
            value: 12,
            condition: "Orders over ₺1,000",
            image:
                "https://images.unsplash.com/photo-1509773896068-7fd415d91e2e?w=400&h=400&fit=crop",
            glow: "rgba(245, 158, 11, 0.5)",
        },
        {
            id: 3,
            name: "Blue Moon",
            value: 15,
            condition: "Orders over ₺1,500",
            image:
                "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=400&h=400&fit=crop",
            glow: "rgba(59, 130, 246, 0.5)",
        },
        {
            id: 4,
            name: "Blood Moon",
            value: 18,
            condition: "Orders over ₺2,000",
            image:
                "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?w=400&h=400&fit=crop",
            glow: "rgba(239, 68, 68, 0.5)",
        },
        {
            id: 5,
            name: "Super Moon",
            value: 20,
            condition: "Orders over ₺2,500",
            image:
                "https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=400&h=400&fit=crop",
            glow: "rgba(251, 191, 36, 0.6)",
        },
        {
            id: 6,
            name: "Wolf Moon",
            value: 22,
            condition: "Orders over ₺3,000",
            image:
                "https://images.unsplash.com/photo-1473892635345-9414f45c6ae0?w=400&h=400&fit=crop",
            glow: "rgba(156, 163, 175, 0.5)",
        },
        {
            id: 7,
            name: "Pink Moon",
            value: 25,
            condition: "Orders over ₺3,500",
            image:
                "https://images.unsplash.com/photo-1494253109108-2e30c049369b?w=400&h=400&fit=crop",
            glow: "rgba(236, 72, 153, 0.5)",
        },
        {
            id: 8,
            name: "Strawberry Moon",
            value: 28,
            condition: "Orders over ₺4,000",
            image:
                "https://images.unsplash.com/photo-1495344517868-8ebaf0a2044a?w=400&h=400&fit=crop",
            glow: "rgba(251, 113, 133, 0.5)",
        },
        {
            id: 9,
            name: "Eclipse Moon",
            value: 30,
            condition: "Orders over ₺5,000",
            image:
                "https://images.unsplash.com/photo-1464802686167-b939a6910659?w=400&h=400&fit=crop",
            glow: "rgba(99, 102, 241, 0.6)",
        },
        {
            id: 10,
            name: "Golden Moon",
            value: 35,
            condition: "Orders over ₺7,500",
            image:
                "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=400&fit=crop",
            glow: "rgba(234, 179, 8, 0.7)",
        },
    ];

    // İlk girişte popup'ı aç
    useEffect(() => {
        const hasSeenPopup = sessionStorage.getItem("lunaraSeen");
        if (!hasSeenPopup) {
            const t = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(t);
        }
    }, []);

    // Popup açıkken scroll kilitle
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    const handleMoonClick = (moonId) => {
        if (step !== "initial" || isAnimating) return;

        setIsAnimating(true);
        setSelectedMoon(moonId);
        setStep("selecting");

        const randomDiscount =
            moonPhases[Math.floor(Math.random() * moonPhases.length)];

        setTimeout(() => {
            setDiscount(randomDiscount);
            setStep("revealed");
            setIsAnimating(false);
        }, 1800);
    };

    const handleClose = () => {
        // test için ister kalıcı bırak ister kaldır
        console.log("Lunara popup close clicked");

        sessionStorage.setItem("lunaraSeen", "true");
        if (discount) {
            localStorage.setItem("lunaraDiscount", JSON.stringify(discount));
        }
        setIsOpen(false);
    };

    const handleClaim = () => {
        if (discount) {
            localStorage.setItem("lunaraDiscount", JSON.stringify(discount));
            alert(
                `🌙 Lunara ${discount.value}% Moonlight discount added to your cart!\n✨ Valid for ${discount.condition}`
            );
        }
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className="lunara-overlay flex items-center justify-center bg-gradient-to-b from-indigo-950/95 via-purple-950/95 to-indigo-950/95 backdrop-blur-sm animate-fadeIn">
            {/* Twinkling stars */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(40)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2 + Math.random() * 2}s`,
                        }}
                    />
                ))}
            </div>

            <div className="relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden border border-yellow-500/30">
                {/* Golden glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-amber-500/10 pointer-events-none" />

                {/* Floating stars */}
                <div className="absolute top-6 left-6 text-yellow-300 animate-float">
                    <Star size={16} fill="currentColor" />
                </div>
                <div
                    className="absolute top-12 right-12 text-amber-300 animate-float"
                    style={{ animationDelay: "0.5s" }}
                >
                    <Star size={12} fill="currentColor" />
                </div>
                <div
                    className="absolute bottom-16 left-12 text-yellow-400 animate-float"
                    style={{ animationDelay: "1s" }}
                >
                    <Star size={14} fill="currentColor" />
                </div>

                {/* Close button */}
                <button
                    type="button"
                    onClick={handleClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all hover:scale-110 border border-white/20"
                >
                    <X size={20} className="text-white" />
                </button>

                <div className="p-8 pt-12 relative z-10">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="mb-3 flex items-center justify-center gap-2">
                            <Moon size={32} className="text-amber-300 animate-pulse" />
                            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-200 to-yellow-200">
                                Lunara
                            </h2>
                            <Sparkles
                                size={28}
                                className="text-yellow-300 animate-pulse"
                                style={{ animationDelay: "0.3s" }}
                            />
                        </div>
                        <h3 className="text-2xl font-semibold text-white mb-2">
                            Moonlight Discount ✨
                        </h3>
                        <p className="text-purple-200/80 text-sm">
                            {step === "initial" &&
                                "Choose a mythological moon and reveal your celestial discount"}
                            {step === "selecting" && "The moonlight is guiding you..."}
                            {step === "revealed" && "The stars have aligned in your favor!"}
                        </p>
                    </div>

                    {/* Moon grid */}
                    {step !== "revealed" && (
                        <div className="grid grid-cols-3 gap-4 mb-6 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                            {moonPhases.map((moon) => (
                                <button
                                    key={moon.id}
                                    type="button"
                                    onClick={() => handleMoonClick(moon.id)}
                                    disabled={isAnimating}
                                    className={`relative aspect-square rounded-2xl transition-all duration-500 transform overflow-hidden group ${
                                        selectedMoon === moon.id
                                            ? "scale-110 animate-pulse ring-4 ring-yellow-400/50"
                                            : "hover:scale-105"
                                    } ${
                                        isAnimating && selectedMoon !== moon.id
                                            ? "opacity-30 scale-90"
                                            : ""
                                    }`}
                                    style={{
                                        boxShadow:
                                            selectedMoon === moon.id
                                                ? `0 0 40px ${moon.glow}, 0 0 60px ${moon.glow}`
                                                : `0 0 20px ${moon.glow}`,
                                    }}
                                >
                                    <img
                                        src={moon.image}
                                        alt={moon.name}
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />

                                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-amber-500/10 to-transparent" />

                                    <div
                                        className="absolute inset-0 bg-gradient-to-tr from-transparent via-yellow-200/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                        style={{
                                            transform: "translateX(-100%) rotate(45deg)",
                                            animation:
                                                selectedMoon === moon.id ? "shine 2s infinite" : "none",
                                        }}
                                    />

                                    <div className="absolute inset-0 flex items-end p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                        {selectedMoon !== moon.id && (
                                            <div className="text-white font-semibold text-sm drop-shadow-lg">
                                                {moon.name}
                                            </div>
                                        )}
                                    </div>

                                    <div
                                        className="absolute inset-0 rounded-2xl opacity-50 animate-pulse"
                                        style={{
                                            background: `radial-gradient(circle at 50% 50%, ${moon.glow} 0%, transparent 70%)`,
                                        }}
                                    />

                                    {selectedMoon === moon.id && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-6xl animate-spin-slow">🌙</div>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Revealed Discount */}
                    {step === "revealed" && discount && (
                        <div className="mb-6 animate-scaleIn">
                            <div
                                className="relative rounded-3xl p-8 text-center overflow-hidden shadow-2xl border-2 border-yellow-400/50"
                                style={{
                                    background:
                                        "radial-gradient(circle at 50% 0%, rgba(234, 179, 8, 0.3) 0%, rgba(30, 27, 75, 0.9) 100%)",
                                    boxShadow: `0 0 60px ${discount.glow}, inset 0 0 40px ${discount.glow}`,
                                }}
                            >
                                <div className="relative mb-4 mx-auto w-32 h-32 rounded-full overflow-hidden border-4 border-yellow-400/50 shadow-xl">
                                    <img
                                        src={discount.image}
                                        alt={discount.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/30 to-transparent" />
                                </div>

                                <div className="text-yellow-200 text-2xl font-medium mb-3">
                                    {discount.name}
                                </div>
                                <div className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-200 to-yellow-300 mb-2">
                                    {discount.value}%
                                </div>
                                <div className="text-2xl font-semibold text-yellow-100 mb-3">
                                    DISCOUNT
                                </div>
                                <div className="text-sm text-yellow-100 bg-yellow-500/30 backdrop-blur-sm rounded-full px-5 py-2 inline-block border border-yellow-400/40">
                                    ✨ {discount.condition}
                                </div>

                                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                    {[...Array(12)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="absolute w-1 h-16 bg-gradient-to-b from-yellow-200 via-amber-300 to-transparent animate-shoot"
                                            style={{
                                                left: `${20 + Math.random() * 60}%`,
                                                top: "-20px",
                                                animationDelay: `${Math.random() * 2}s`,
                                                animationDuration: `${1 + Math.random()}s`,
                                                transform: `rotate(${
                                                    -30 + Math.random() * 60
                                                }deg)`,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {step === "revealed" ? (
                        <button
                            type="button"
                            onClick={handleClaim}
                            className="w-full py-4 rounded-xl font-semibold text-gray-900 text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-yellow-500/50 border-2 border-yellow-400/50"
                            style={{
                                background:
                                    "linear-gradient(135deg, rgba(250, 204, 21, 0.9) 0%, rgba(251, 191, 36, 0.9) 100%)",
                            }}
                        >
                            🌙 Claim Moonlight Discount
                        </button>
                    ) : (
                        <div className="text-center text-sm text-purple-300/60">
                            ⭐ One-time exclusive offer for each visitor
                        </div>
                    )}

                    {/* Lunara branding */}
                    <div className="mt-6 text-center">
                        <p className="text-yellow-300/40 text-xs font-light italic">
                            "Beauty Shines in the Moonlight" - Lunara Beauty
                        </p>
                    </div>
                </div>

                {/* Animasyonlar */}
                <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes twinkle {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.5); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          @keyframes shoot {
            0% { transform: translateY(0) translateX(0); opacity: 1; }
            100% { transform: translateY(300px) translateX(100px); opacity: 0; }
          }
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes shine {
            0% { transform: translateX(-100%) rotate(45deg); }
            100% { transform: translateX(100%) rotate(45deg); }
          }

          .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
          .animate-scaleIn { animation: scaleIn 0.6s ease-out; }
          .animate-twinkle { animation: twinkle linear infinite; }
          .animate-float { animation: float 3s ease-in-out infinite; }
          .animate-shoot { animation: shoot linear forwards; }
          .animate-spin-slow { animation: spin-slow 2s linear infinite; }

          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(251, 191, 36, 0.5);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(251, 191, 36, 0.7);
          }

          .lunara-overlay {
            position: fixed;
            inset: 0;
            z-index: 99999;
          }
        `}</style>
            </div>
        </div>
    );
};

export default LunaraDiscountPopup;
