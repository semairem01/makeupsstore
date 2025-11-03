import React, { useEffect, useRef, useState } from "react";
import "./Magnify.css";

export default function MagnifyImage({
                                         src,
                                         alt,
                                         zoom = 2.5,
                                         lensSize = 180,
                                         className = "",
                                     }) {
    const wrapRef = useRef(null);
    const imgRef = useRef(null);
    const lensRef = useRef(null);

    const [show, setShow] = useState(false);
    const [bgSize, setBgSize] = useState("0px 0px");
    const [lightbox, setLightbox] = useState(false);

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    // Görsel yüklendiğinde ve resize'da arka plan boyutunu güncelle
    useEffect(() => {
        const updateBgSize = () => {
            const wrap = wrapRef.current;
            if (!wrap) return;
            const rect = wrap.getBoundingClientRect();
            const w = rect.width * Math.max(zoom, 1);   // zoom < 1 olmasın
            const h = rect.height * Math.max(zoom, 1);
            setBgSize(`${w}px ${h}px`);
        };

        updateBgSize();

        const onLoad = () => updateBgSize();
        const onResize = () => updateBgSize();

        imgRef.current?.addEventListener("load", onLoad);
        window.addEventListener("resize", onResize);
        return () => {
            imgRef.current?.removeEventListener("load", onLoad);
            window.removeEventListener("resize", onResize);
        };
    }, [src, zoom]);

    const moveAt = (clientX, clientY) => {
        const wrap = wrapRef.current;
        const lens = lensRef.current;
        if (!wrap || !lens) return;

        const rect = wrap.getBoundingClientRect();
        // imleç konumu (wrapper içinde)
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // lens merkezini sınırlar içinde tut
        const r = lensSize / 2;
        const cx = Math.max(r, Math.min(x, rect.width - r));
        const cy = Math.max(r, Math.min(y, rect.height - r));

        // lens kutusunu konumlandır
        lens.style.left = `${cx - r}px`;
        lens.style.top  = `${cy - r}px`;

        // 🔑 büyütülmüş arka planı tam merkeze eşle
        const bgX = -(cx * zoom - r);
        const bgY = -(cy * zoom - r);
        lens.style.backgroundPosition = `${bgX}px ${bgY}px`;
    };

    // Fare olayları
    const onMouseMove = (e) => moveAt(e.clientX, e.clientY);

    // Pointer (touch + mouse) desteği istersen:
    // const onPointerMove = (e) => moveAt(e.clientX, e.clientY);

    return (
        <>
            <div
                className={`magnify-wrap ${className}`}
                ref={wrapRef}
                onMouseEnter={() => !isMobile && setShow(true)}
                onMouseLeave={() => !isMobile && setShow(false)}
                onMouseMove={!isMobile ? onMouseMove : undefined}
                onClick={() => isMobile && setLightbox(true)}
            >
                <img ref={imgRef} src={src} alt={alt} draggable={false} />
                {show && (
                    <div
                        ref={lensRef}
                        className="magnify-lens"
                        style={{
                            width: lensSize,
                            height: lensSize,
                            backgroundImage: `url(${src})`,
                            backgroundSize: bgSize,          // (wrapWidth*zoom, wrapHeight*zoom)
                            // backgroundPosition JS ile her harekette güncelleniyor
                        }}
                    />
                )}
            </div>

            {lightbox && (
                <div className="magnify-lightbox" onClick={() => setLightbox(false)}>
                    <img src={src} alt={alt} />
                </div>
            )}
        </>
    );
}
