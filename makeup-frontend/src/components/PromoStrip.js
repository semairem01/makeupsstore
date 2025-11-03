import React from "react";
import "./PromoStrip.css";

export default function PromoStrip() {
    const messages = [
        { icon: "/icons/free.png", text: "Free shipping on orders over ₺600!" },
        { icon: "/icons/sale.png", text: "Up to 40% off selected beauty essentials!" },
        { icon: "/icons/beauty.png", text: "Discover expert beauty tips — shine your own way!" },
        { icon: "/icons/quiz.png", text: "Take our beauty quiz and find your perfect match!" },
    ];

    return (
        <div className="promo-strip">
            <div className="promo-track">
                {/* 🔁 Mesajları iki kez tekrarla — boşluk olmasın */}
                {[...messages, ...messages].map((msg, i) => (
                    <span className="promo-msg" key={i}>
                        <img src={msg.icon} alt="" className="promo-icon" />
                        {msg.text}
                    </span>
                ))}
            </div>
        </div>
    );
}
