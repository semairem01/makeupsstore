import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./HeroCarousel.css";

/**
 * HeroCarousel
 * - Otomatik geçiş (default 4sn)
 * - Hover'da durur
 * - Her slide kendi CTA butonuna gider
 * - SADECE aktif slide'ın butonu tıklanabilir
 */
export default function HeroCarousel({ slides = [], intervalMs = 4000 }) {
    const [index, setIndex] = useState(0);
    const timerRef = useRef(null);
    const hovering = useRef(false);

    // Sonraki slayta geçiş
    const next = () => setIndex((i) => (i + 1) % slides.length);

    useEffect(() => {
        if (!slides.length) return;
        clearInterval(timerRef.current);
        if (!hovering.current) {
            timerRef.current = setInterval(next, intervalMs);
        }
        return () => clearInterval(timerRef.current);
    }, [index, slides.length, intervalMs]);

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

                        {/* CTA butonu - SADECE aktif slide'da tıklanabilir */}
                        {s.cta && (
                            <Link
                                to={s.cta.to}
                                className="hero-cta"
                                style={{
                                    pointerEvents: i === index ? 'auto' : 'none',
                                    opacity: i === index ? 1 : 0
                                }}
                                onClick={(e) => {
                                    // Güvenlik için: sadece aktif slide'da çalışsın
                                    if (i !== index) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        return;
                                    }
                                }}
                            >
                                {s.cta.label}
                            </Link>
                        )}
                    </div>
                </article>
            ))}

            {/* Nokta kontrolü */}
            <div className="hero-dots" role="tablist" aria-label="Slide dots">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        className={`dot ${i === index ? "active" : ""}`}
                        onClick={() => setIndex(i)}
                        aria-label={`Go to slide ${i + 1}`}
                        type="button"
                    />
                ))}
            </div>
        </section>
    );
}