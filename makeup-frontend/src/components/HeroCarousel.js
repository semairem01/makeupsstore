import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./HeroCarousel.css";

/**
 * Basit, bağımsız hero slider
 * - Otomatik geçiş (default 4sn)
 * - Hover'da durur
 * - Nokta/dot kontrolü
 */
export default function HeroCarousel({
                                         slides = [],
                                         intervalMs = 4000,
                                     }) {
    const [index, setIndex] = useState(0);
    const timerRef = useRef(null);
    const hovering = useRef(false);

    const next = () => setIndex((i) => (i + 1) % slides.length);
    const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);

    useEffect(() => {
        if (!slides.length) return;
        clearInterval(timerRef.current);
        if (!hovering.current) {
            timerRef.current = setInterval(next, intervalMs);
        }
        return () => clearInterval(timerRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index, slides.length]);

    if (!slides.length) return null;

    return (
        <section
            className="hero"
            onMouseEnter={() => {
                hovering.current = true;
                clearInterval(timerRef.current);
            }}
            onMouseLeave={() => {
                hovering.current = false;
                timerRef.current = setInterval(next, intervalMs);
            }}
        >
            {slides.map((s, i) => (
                <article
                    key={i}
                    className={`hero-slide ${i === index ? "is-active" : ""}`}
                    style={{ backgroundImage: `url(${s.image})` }}
                    aria-hidden={i !== index}
                >
                    <div className={`hero-overlay ${s.overlay || "default"}`} />
                    <div className="hero-content">
                        {s.kicker && <div className="hero-kicker">{s.kicker}</div>}
                        {s.title && <h2 className="hero-title">{s.title}</h2>}
                        {s.subtitle && <p className="hero-sub">{s.subtitle}</p>}
                        {s.cta && (
                            <Link to={s.cta.to} className="hero-cta">
                                {s.cta.label}
                            </Link>
                        )}
                    </div>
                </article>
            ))}

            {/* Dots */}
            <div className="hero-dots" role="tablist" aria-label="Slide dots">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        className={`dot ${i === index ? "active" : ""}`}
                        onClick={() => setIndex(i)}
                        aria-label={`Go to slide ${i + 1}`}
                    />
                ))}
            </div>
        </section>
    );
}
