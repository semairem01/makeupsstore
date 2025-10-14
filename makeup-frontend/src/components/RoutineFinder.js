// src/pages/RoutineFinder.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_ENDPOINTS, API_BASE_URL } from "../config";
import "./RoutineFinder.css";

const SKIN = ["Dry","Oily","Combination","Sensitive","Normal"];
const VIBE = ["Natural","Soft Glam","Bold"];
const ENV  = ["Office/Daylight","Indoor Evening","Outdoor/Sunny","Party"];
const MUST = ["Lips","Eyes","Base","Cheeks"];
const UNDERTONE = ["Warm","Cool","Neutral"];
const EYES = ["Brown/Black","Hazel/Green","Blue/Gray"];

function Pill({active, children, onClick}) {
    return <button className={`rf-pill ${active?"active":""}`} onClick={onClick}>{children}</button>;
}

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
            alert("Sepete eklendi!");
            if (onAdded) onAdded(1);
        } catch (err) {
            alert("Sepete eklenirken hata: " + (err.response?.data || err.message));
        }
    };

    return (
        <div className="rf-product-card">
            <img
                src={`${API_BASE_URL}${product.imageUrl}`}
                alt={product.name}
                onError={(e) => {
                    e.currentTarget.src = "https://via.placeholder.com/200x200?text=No+Image";
                }}
            />
            <div className="rf-product-info">
                <div className="rf-product-brand">{product.brand}</div>
                <div className="rf-product-name">{product.name}</div>
                <div className="rf-product-category">{product.category}</div>
                {product.shadeFamily && (
                    <div className="rf-product-shade">🎨 {product.shadeFamily}</div>
                )}
                {product.badges && product.badges.length > 0 && (
                    <div className="rf-product-badges">
                        {product.badges.map((badge, i) => (
                            <span key={i} className="rf-badge">{badge}</span>
                        ))}
                    </div>
                )}
                <div className="rf-product-price">₺{product.price.toLocaleString("tr-TR")}</div>
                <button className="rf-add-to-cart" onClick={addToCart}>
                    Sepete Ekle
                </button>
            </div>
        </div>
    );
}

export default function RoutineFinder({ onAdded }){
    const [step,setStep] = useState(1);
    const [skin,setSkin] = useState("");
    const [vibe,setVibe] = useState("");
    const [env,setEnv]   = useState("");
    const [must,setMust] = useState("");
    const [more,setMore] = useState(false);
    const [tone,setTone] = useState("");
    const [eyes,setEyes] = useState("");

    // ✨ Backend sonuçları için state
    const [loading, setLoading] = useState(false);
    const [backendResult, setBackendResult] = useState(null);

    const nav = useNavigate();

    const canNext = (step===1 && skin) || (step===2 && vibe) || (step===3 && env) || (step===4 && must);

    // ---- KURALLAR (fallback için) ----
    const shadeFromTone = (t)=> {
        if (t==="Warm")   return ["coral","peach","terracotta","gold","bronze","warm pink"];
        if (t==="Cool")   return ["rose","mauve","berry","plum","taupe","silver"];
        return ["nude","beige","soft pink","brown","champagne"];
    };

    const eyeBoost = (e)=> {
        if (e==="Brown/Black") return ["emerald","navy","bronze"];
        if (e==="Hazel/Green") return ["plum","mauve","copper"];
        if (e==="Blue/Gray")   return ["warm brown","peach","gold"];
        return [];
    };

    const baseBySkin = (s)=> {
        if (s==="Dry")        return { title:"Hydration Glow", tags:["hyaluronic","dewy","hydrating primer"] };
        if (s==="Oily")       return { title:"Matte Control",  tags:["mattifying","oil-control","powder"] };
        if (s==="Combination")return { title:"Soft Balance",   tags:["balancing","natural finish"] };
        if (s==="Sensitive")  return { title:"Calm & Care",    tags:["fragrance-free","soothing"] };
        return { title:"Balanced Radiance", tags:["skin-like","natural"] };
    };

    const tagsByVibe = (v)=> {
        if (v==="Natural")   return ["no-makeup","sheer","tinted"];
        if (v==="Soft Glam") return ["soft-focus","glow","defined"];
        return ["bold","longwear","high pigment"];
    };

    const tagsByEnv = (e)=> {
        const t=[];
        if (e==="Outdoor/Sunny")  t.push("spf","sweat-resistant");
        if (e==="Indoor Evening") t.push("photo-friendly","setting spray");
        if (e==="Office/Daylight")t.push("lightweight","fresh");
        if (e==="Party")          t.push("glitter","shimmer","longwear");
        return t;
    };

    const categories = {
        Lips:   ["lipstick","lip gloss","liner"],
        Eyes:   ["mascara","eyeliner","eyeshadow"],
        Base:   ["primer","foundation","concealer","powder"],
        Cheeks: ["blush","highlighter","bronzer"]
    };

    const result = useMemo(()=>{
        if (!skin || !vibe || !env || !must) return null;

        const base = baseBySkin(skin);
        const vibeTags = tagsByVibe(vibe);
        const envTags  = tagsByEnv(env);

        const shade = tone ? shadeFromTone(tone) : ["nude","soft pink","brown"];
        const eyePlus = eyes ? eyeBoost(eyes) : [];

        const order = [must, ...Object.keys(categories).filter(k=>k!==must)];
        const buckets = order.map(k => ({
            bucket: k,
            catTags: categories[k],
            shades: (k==="Eyes" ? [...shade, ...eyePlus] : shade).slice(0,4)
        }));

        const allTags = [
            ...base.tags, ...vibeTags, ...envTags, ...shade, ...eyePlus, ...categories[must]
        ];

        const q = encodeURIComponent(allTags.join(" "));
        return {
            title: base.title,
            buckets,
            queryUrl: `/products?q=${q}`
        };
    },[skin,vibe,env,must,tone,eyes]);

    // ✨ Backend'den öneri al
    const getRecommendations = async () => {
        if (!skin || !vibe || !env || !must) {
            alert("Lütfen tüm zorunlu alanları doldurun!");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                skin,
                vibe,
                env,
                must,
                undertone: tone || null,
                eyeColor: eyes || null,
            };

            const response = await axios.post(API_ENDPOINTS.RECOMMEND_ROUTINE, payload);
            setBackendResult(response.data);
        } catch (err) {
            console.error("Backend öneri hatası:", err);
            // Hata durumunda fallback: arama URL'sine yönlendir
            if (result) {
                nav(result.queryUrl);
            } else {
                alert("Öneriler yüklenirken hata oluştu. Lütfen tekrar deneyin.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rf-wrap">
            <h2>Find Your Perfect Routine 💕</h2>
            <p className="rf-sub">Tell us your skin type & vibe — we'll build your look.</p>

            {/* steps */}
            <div className="rf-steps">
                <div className={`dot ${step>=1?"on":""}`}>1</div><div className={`bar ${step>1?"on":""}`}/>
                <div className={`dot ${step>=2?"on":""}`}>2</div><div className={`bar ${step>2?"on":""}`}/>
                <div className={`dot ${step>=3?"on":""}`}>3</div><div className={`bar ${step>3?"on":""}`}/>
                <div className={`dot ${step>=4?"on":""}`}>4</div>
            </div>

            {step===1 && (
                <section className="rf-card">
                    <h3>Cilt Tipi</h3>
                    <div className="rf-pills">{SKIN.map(s=><Pill key={s} active={skin===s} onClick={()=>setSkin(s)}>{s}</Pill>)}</div>
                </section>
            )}

            {step===2 && (
                <section className="rf-card">
                    <h3>Makyaj Tarzı</h3>
                    <div className="rf-pills">{VIBE.map(s=><Pill key={s} active={vibe===s} onClick={()=>setVibe(s)}>{s}</Pill>)}</div>
                </section>
            )}

            {step===3 && (
                <section className="rf-card">
                    <h3>Ortam / Işık</h3>
                    <div className="rf-pills">{ENV.map(s=><Pill key={s} active={env===s} onClick={()=>setEnv(s)}>{s}</Pill>)}</div>
                </section>
            )}

            {step===4 && (
                <section className="rf-card">
                    <h3>Olmazsa Olmaz</h3>
                    <div className="rf-pills">{MUST.map(s=><Pill key={s} active={must===s} onClick={()=>setMust(s)}>{s}</Pill>)}</div>

                    <div className="rf-more">
                        <label>
                            <input type="checkbox" checked={more} onChange={e=>setMore(e.target.checked)} />
                            <span> Daha da kişiselleştir (30 sn)</span>
                        </label>
                    </div>

                    {more && (
                        <div className="rf-more-grid">
                            <div>
                                <div className="rf-more-label">Undertone</div>
                                <div className="rf-pills small">{UNDERTONE.map(s=>
                                    <Pill key={s} active={tone===s} onClick={()=>setTone(s)}>{s}</Pill>)}
                                </div>
                            </div>
                            <div>
                                <div className="rf-more-label">Göz Rengi</div>
                                <div className="rf-pills small">{EYES.map(s=>
                                    <Pill key={s} active={eyes===s} onClick={()=>setEyes(s)}>{s}</Pill>)}
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            )}

            <div className="rf-actions">
                <button className="rf-ghost" disabled={step===1} onClick={()=>setStep(step-1)}>Geri</button>
                {step<4 ? (
                    <button className="rf-btn" disabled={!canNext} onClick={()=>setStep(step+1)}>İleri</button>
                ) : (
                    <button
                        className="rf-btn"
                        disabled={!result || loading}
                        onClick={getRecommendations}
                    >
                        {loading ? "Yükleniyor..." : "Önerilen Ürünleri Gör →"}
                    </button>
                )}
            </div>

            {/* Özet - Backend sonucu yoksa eski görünüm */}
            {!backendResult && result && (
                <div className="rf-result">
                    <div className="rf-title">Your Routine: <b>{result.title}</b></div>
                    <div className="rf-buckets">
                        {result.buckets.map(b=>(
                            <div key={b.bucket} className="rf-bucket">
                                <div className="rf-bucket-title">{b.bucket}</div>
                                <div className="rf-tags">
                                    {b.catTags.slice(0,3).map((t,i)=><span key={i} className="rf-tag">#{t}</span>)}
                                </div>
                                <div className="rf-shades">
                                    {b.shades.map((s,i)=><span key={i} className="rf-chip">{s}</span>)}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="rf-hint">İpucu: Buton tıklandığında backend'den kişiselleştirilmiş ürünler gelecek.</div>
                </div>
            )}

            {/* ✨ Backend Sonuçları */}
            {backendResult && (
                <div className="rf-result">
                    <div className="rf-title">Your Routine: <b>{backendResult.title}</b></div>

                    {/* Must-Have Kategori (Öncelikli) */}
                    <div className="rf-bucket-section">
                        <h3 className="rf-bucket-title">✨ {must} (Olmazsa Olmaz)</h3>
                        <div className="rf-products-grid">
                            {backendResult[must.toLowerCase()]?.slice(0, 3).map((p) => (
                                <ProductCard key={p.id} product={p} onAdded={onAdded} />
                            ))}
                        </div>
                    </div>

                    {/* Diğer Kategoriler */}
                    {["Lips", "Eyes", "Base", "Cheeks"]
                        .filter((cat) => cat !== must)
                        .map((cat) => {
                            const products = backendResult[cat.toLowerCase()];
                            if (!products || products.length === 0) return null;
                            return (
                                <div key={cat} className="rf-bucket-section">
                                    <h3 className="rf-bucket-title">{cat}</h3>
                                    <div className="rf-products-grid">
                                        {products.slice(0, 3).map((p) => (
                                            <ProductCard key={p.id} product={p} onAdded={onAdded} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
}