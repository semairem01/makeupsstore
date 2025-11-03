import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./HeroCarousel.css";

/**
 * HeroCarousel (net görüntü odaklı)
 * - <picture> + srcSet ile responsive görseller
 * - Hover'da durur
 * - Sadece aktif slayt CTA tıklanır
 */
export default function HeroCarousel({ slides = [], intervalMs = 4000 }) {
    const [index, setIndex] = useState(0);
    const timerRef = useRef(null);
    const hovering = useRef(false);

    const next = () => setIndex((i) => (i + 1) % slides.length);

    useEffect(() => {
        if (!slides.length) return;
        clearInterval(timerRef.current);
        if (!hovering.current) timerRef.current = setInterval(next, intervalMs);
        return () => clearInterval(timerRef.current);
    }, [index, slides.length, intervalMs]);

    if (!slides.length) return null;

    return (
        <section
            className="hero-carousel"
            onMouseEnter={() => {
                hovering.current = true;
                clearInterval(timerRef.current);
            }}
            onMouseLeave={() => {
                hovering.current = false;
                timerRef.current = setInterval(next, intervalMs);
            }}
            aria-roledescription="carousel"
        >
            {slides.map((s, i) => {
                // s.image: base 1920px; opsiyonel s.srcSet dizisi ekleyebileceksin
                const active = i === index;
                return (
                    <article
                        key={i}
                        className={`hc-slide ${active ? "is-active" : ""}`}
                        aria-hidden={!active}
                    >
                        {/* ----- Görsel ----- */}
                        <picture className="hc-media">
                            {/* İstiyorsan AVIF/WEBP kaynaklarını ekle */}
                            {s.imageAvif && (
                                <source
                                    type="image/avif"
                                    srcSet={s.imageAvif}
                                />
                            )}
                            {s.imageWebp && (
                                <source
                                    type="image/webp"
                                    srcSet={s.imageWebp}
                                />
                            )}
                            <img
                                src={(s.image || "").includes("?") ? s.image : `${s.image}?v=2`}
                                srcSet={
                                    s.srcSet ??
                                    undefined /* Ör: "/banners/wp-1280.jpg 1280w, /banners/wp-1920.jpg 1920w, /banners/wp-3840.jpg 3840w" */
                                }
                                sizes="100vw"
                                alt={s.alt || "Hero"}
                                loading={i === 0 ? "eager" : "lazy"}
                                decoding="async"
                            />
                        </picture>

                        {/* ----- Overlay (degrade, blur yok) ----- */}
                        <div className={`hc-overlay ${s.overlay || "default"}`} />

                        {/* ----- Metin/CTA ----- */}
                        <div className="hc-content">
                            {s.kicker && <div className="hc-kicker">{s.kicker}</div>}
                            {s.title && <h2 className="hc-title">{s.title}</h2>}
                            {s.subtitle && <p className="hc-sub">{s.subtitle}</p>}

                            {s.cta && (
                                <Link
                                    to={s.cta.to}
                                    className="hc-cta"
                                    style={{ pointerEvents: active ? "auto" : "none", opacity: active ? 1 : 0 }}
                                    onClick={(e) => {
                                        if (!active) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }
                                    }}
                                >
                                    {s.cta.label}
                                </Link>
                            )}
                        </div>
                    </article>
                );
            })}

            {/* Noktalar */}
            <div className="hc-dots" role="tablist" aria-label="Slides">
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
