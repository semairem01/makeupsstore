import React, { useState } from 'react';

const BeautyTips = () => {
    const [hoveredCard, setHoveredCard] = useState(null);
    const [activeCategory, setActiveCategory] = useState('skincare');

    const tipsData = [
        {
            id: 1,
            title: 'Morning Glow Routine',
            subtitle: 'Wake up your skin with vitamin C and hydration',
            image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=1200&q=80',
            tips: ['Gentle cleanser', 'Vitamin C serum', 'SPF 50+ daily'],
            color: '#b8696d'
        },
        {
            id: 2,
            title: 'Flawless Base',
            subtitle: 'Foundation techniques for natural coverage',
            image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=1200&q=80',
            tips: ['Primer first', 'Damp sponge blend', 'Set with mist'],
            color: '#c97a7e'
        },
        {
            id: 3,
            title: 'Night Recovery',
            subtitle: 'Repair and rejuvenate while you sleep',
            image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=1200&q=80',
            tips: ['Double cleanse', 'Retinol serum', 'Rich moisturizer'],
            color: '#a85a5e'
        },
        {
            id: 4,
            title: 'Perfect Winged Liner',
            subtitle: 'Master the cat-eye in simple steps',
            image: 'https://images.unsplash.com/photo-1596704017254-9b121068ec31?w=1200&q=80',
            tips: ['Use tape guide', 'Small strokes', 'Steady hand'],
            color: '#d88b8f'
        }
    ];

    const quickTips = [
        {
            title: 'Hydration Boost',
            desc: 'Drink water, use hyaluronic acid',
            icon: '💧'
        },
        {
            title: 'Sun Protection',
            desc: 'SPF daily, reapply every 2 hours',
            icon: '☀️'
        },
        {
            title: 'Gentle Exfoliation',
            desc: 'Remove dead skin 2-3x weekly',
            icon: '✨'
        },
        {
            title: 'Beauty Sleep',
            desc: '7-9 hours for skin regeneration',
            icon: '😴'
        }
    ];

    const categories = [
        { id: 'skincare', label: 'Skincare', icon: '🧴' },
        { id: 'makeup', label: 'Makeup', icon: '💄' },
        { id: 'haircare', label: 'Hair Care', icon: '💇‍♀️' },
        { id: 'nails', label: 'Nails', icon: '💅' }
    ];

    const categoryTips = {
        skincare: [
            {
                title: 'Double Cleansing Method',
                image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80',
                description:
                    'Start with oil cleanser to remove makeup, follow with water-based cleanser for deep clean',
                steps: ['Oil cleanser first', 'Massage 60 seconds', 'Water cleanser second', 'Pat dry gently']
            },
            {
                title: 'Layering Serums',
                image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80',
                description:
                    'Apply serums from thinnest to thickest consistency for maximum absorption',
                steps: ['Wait 30 seconds between', 'Thinnest first', "Press don't rub", 'Lock with moisturizer']
            },
            {
                title: 'Weekly Face Masks',
                image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&q=80',
                description:
                    'Target specific concerns with clay, sheet, or sleeping masks 2-3 times per week',
                steps: ['Clay for oil control', 'Sheet for hydration', 'Sleeping mask overnight', "Don't overdo it"]
            }
        ],
        makeup: [
            {
                title: 'Color Correcting',
                image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80',
                description: 'Neutralize discoloration before foundation for flawless skin',
                steps: ['Green for redness', 'Peach for dark circles', 'Purple for sallow', 'Blend with sponge']
            },
            {
                title: 'Contouring Basics',
                image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&q=80',
                description:
                    'Enhance your natural bone structure with strategic shading and highlighting',
                steps: ['Shade hollow areas', 'Highlight high points', 'Blend thoroughly', 'Less is more']
            },
            {
                title: 'Long-lasting Lips',
                image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&q=80',
                description: 'Make your lipstick last all day with proper prep and technique',
                steps: ['Exfoliate first', 'Line with pencil', 'Blot and powder', 'Reapply center']
            }
        ],
        haircare: [
            {
                title: 'Scalp Care Routine',
                image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
                description:
                    'Healthy hair starts with a healthy scalp - massage and exfoliate regularly',
                steps: ['Massage 5 minutes', 'Use scalp scrub', 'Deep condition', 'Rinse thoroughly']
            },
            {
                title: 'Heat Protection',
                image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800&q=80',
                description: 'Always use heat protectant before styling to prevent damage',
                steps: ['Spray on damp hair', 'Dry 80% first', 'Use lowest heat', 'Cool shot to finish']
            },
            {
                title: 'Deep Conditioning',
                image: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&q=80',
                description: 'Weekly hair masks restore moisture and repair damage',
                steps: ['Apply mid to ends', 'Cover with cap', 'Leave 20-30 min', 'Rinse with cool water']
            }
        ],
        nails: [
            {
                title: 'Perfect Manicure',
                image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80',
                description:
                    'Salon-quality nails at home with proper prep and technique',
                steps: ['Push back cuticles', 'File in one direction', 'Base coat first', 'Thin polish layers']
            },
            {
                title: 'Nail Health',
                image: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=800&q=80',
                description: 'Strong, healthy nails need proper care and nutrition',
                steps: ['Cuticle oil daily', 'Biotin supplement', 'Avoid harsh polish', 'Let nails breathe']
            },
            {
                title: 'Gel Polish Care',
                image: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80',
                description:
                    'Extend your gel manicure and remove safely without damage',
                steps: ['Cap the edges', 'Avoid hot water', 'Oil cuticles daily', 'Proper removal only']
            }
        ]
    };

    return (
        <div
            style={{
                width: '100vw',
                minHeight: '100vh',
                background:
                    'linear-gradient(180deg, #fdf9f7 0%, #fef3f0 15%, #fde4df 30%, #fcd0c8 50%, #f5aba0 70%, #e8837a 90%, #d65a5a 100%)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Hero Section */}
            <div
                style={{
                    position: 'relative',
                    height: '70vh',
                    minHeight: '500px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(rgba(180, 100, 100, 0.65), rgba(200, 130, 110, 0.55)),
         url('/banners/beautytips.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                {/* Arka plana ayrı img ile de tam sığdırmak istersen:
                <img
                    src="/banners/beautytips.png"
                    alt="Beauty Tips Banner"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        zIndex: 0
                    }}
                />
                */}
                <div
                    style={{
                        textAlign: 'center',
                        color: '#fff',
                        zIndex: 2,
                        padding: '0 20px'
                    }}
                >
                    <h1
                        style={{
                            fontSize: 'clamp(48px, 8vw, 96px)',
                            fontWeight: '300',
                            letterSpacing: '0.15em',
                            margin: '0 0 16px',
                            textTransform: 'uppercase',
                            textShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}
                    >
                        Beauty Tips
                    </h1>
                    <p
                        style={{
                            fontSize: 'clamp(16px, 2.5vw, 20px)',
                            fontWeight: '300',
                            letterSpacing: '0.08em',
                            maxWidth: '700px',
                            margin: '0 auto 32px',
                            lineHeight: '1.6',
                            textShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}
                    >
                        Expert advice and techniques for your perfect beauty routine
                    </p>
                    <button
                        style={{
                            padding: '16px 48px',
                            fontSize: '14px',
                            fontWeight: '600',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            border: '2px solid rgba(255,255,255,0.9)',
                            background: 'rgba(255,255,255,0.15)',
                            backdropFilter: 'blur(10px)',
                            color: '#fff',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                        }}
                    >
                        Explore Tips
                    </button>
                </div>
            </div>

            {/* Content Section */}
            <div
                style={{
                    maxWidth: '1400px',
                    margin: '0 auto',
                    padding: '80px 24px'
                }}
            >
                {/* Main Section Title */}
                <div
                    style={{
                        textAlign: 'center',
                        marginBottom: '64px',
                        color: '#fff'
                    }}
                >
                    <h2
                        style={{
                            fontSize: 'clamp(28px, 4vw, 42px)',
                            fontWeight: '300',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            marginBottom: '12px'
                        }}
                    >
                        Essential Beauty Guides
                    </h2>
                    <div
                        style={{
                            width: '80px',
                            height: '2px',
                            background: '#fff',
                            margin: '0 auto'
                        }}
                    />
                </div>

                {/* Tips Grid */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '28px',
                        marginBottom: '80px'
                    }}
                >
                    {tipsData.map((tip) => (
                        <div
                            key={tip.id}
                            onMouseEnter={() => setHoveredCard(tip.id)}
                            onMouseLeave={() => setHoveredCard(null)}
                            style={{
                                position: 'relative',
                                height: '420px',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform:
                                    hoveredCard === tip.id
                                        ? 'translateY(-12px) scale(1.02)'
                                        : 'translateY(0) scale(1)',
                                boxShadow:
                                    hoveredCard === tip.id
                                        ? '0 24px 48px rgba(0,0,0,0.35)'
                                        : '0 12px 28px rgba(0,0,0,0.25)'
                            }}
                        >
                            {/* Background Image */}
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: `url('${tip.image}')`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    transition: 'transform 0.6s ease',
                                    transform: hoveredCard === tip.id ? 'scale(1.1)' : 'scale(1)'
                                }}
                            />

                            {/* Gradient Overlay */}
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: `linear-gradient(to bottom, 
                  rgba(0,0,0,0.2) 0%, 
                  rgba(0,0,0,0.4) 40%,
                  ${tip.color}dd 100%)`,
                                    transition: 'opacity 0.3s ease',
                                    opacity: hoveredCard === tip.id ? 0.95 : 0.85
                                }}
                            />

                            {/* Content */}
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    padding: '32px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'flex-end',
                                    color: '#fff',
                                    zIndex: 1
                                }}
                            >
                                <h3
                                    style={{
                                        fontSize: '26px',
                                        fontWeight: '600',
                                        letterSpacing: '0.05em',
                                        marginBottom: '8px',
                                        lineHeight: '1.2'
                                    }}
                                >
                                    {tip.title}
                                </h3>
                                <p
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: '300',
                                        letterSpacing: '0.03em',
                                        marginBottom: '20px',
                                        opacity: 0.9,
                                        lineHeight: '1.5'
                                    }}
                                >
                                    {tip.subtitle}
                                </p>

                                {/* Tips List */}
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        marginBottom: '20px',
                                        opacity: hoveredCard === tip.id ? 1 : 0,
                                        transform:
                                            hoveredCard === tip.id
                                                ? 'translateY(0)'
                                                : 'translateY(10px)',
                                        transition: 'all 0.3s ease 0.1s'
                                    }}
                                >
                                    {tip.tips.map((t, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                fontSize: '13px',
                                                fontWeight: '400',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: '4px',
                                                    height: '4px',
                                                    borderRadius: '50%',
                                                    background: '#fff'
                                                }}
                                            />
                                            {t}
                                        </div>
                                    ))}
                                </div>

                                {/* CTA Button */}
                                <button
                                    style={{
                                        padding: '12px 28px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        border: '1.5px solid rgba(255,255,255,0.8)',
                                        background:
                                            hoveredCard === tip.id
                                                ? 'rgba(255,255,255,0.95)'
                                                : 'rgba(255,255,255,0.2)',
                                        color: hoveredCard === tip.id ? tip.color : '#fff',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        alignSelf: 'flex-start',
                                        backdropFilter: 'blur(8px)'
                                    }}
                                >
                                    Learn More →
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Tips Section */}
                <div
                    style={{
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '20px',
                        padding: '56px 32px',
                        border: '1px solid rgba(255,255,255,0.25)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                        marginBottom: '100px'
                    }}
                >
                    <h2
                        style={{
                            fontSize: 'clamp(24px, 3.5vw, 36px)',
                            fontWeight: '300',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            textAlign: 'center',
                            color: '#fff',
                            marginBottom: '48px'
                        }}
                    >
                        Daily Beauty Essentials
                    </h2>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                            gap: '24px'
                        }}
                    >
                        {quickTips.map((qt, idx) => (
                            <div
                                key={idx}
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: '16px',
                                    padding: '28px 24px',
                                    textAlign: 'center',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer'
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '48px',
                                        marginBottom: '16px'
                                    }}
                                >
                                    {qt.icon}
                                </div>
                                <h3
                                    style={{
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        color: '#fff',
                                        marginBottom: '8px',
                                        letterSpacing: '0.05em'
                                    }}
                                >
                                    {qt.title}
                                </h3>
                                <p
                                    style={{
                                        fontSize: '14px',
                                        color: 'rgba(255,255,255,0.9)',
                                        lineHeight: '1.5',
                                        fontWeight: '300'
                                    }}
                                >
                                    {qt.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Category Tips Section */}
                <div
                    style={{
                        marginBottom: '80px'
                    }}
                >
                    <div
                        style={{
                            textAlign: 'center',
                            marginBottom: '48px'
                        }}
                    >
                        <h2
                            style={{
                                fontSize: 'clamp(28px, 4vw, 42px)',
                                fontWeight: '300',
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                marginBottom: '16px',
                                color: '#fff'
                            }}
                        >
                            Tips by Category
                        </h2>
                        <div
                            style={{
                                width: '80px',
                                height: '2px',
                                background: '#fff',
                                margin: '0 auto 32px'
                            }}
                        />

                        {/* Category Tabs */}
                        <div
                            style={{
                                display: 'flex',
                                gap: '12px',
                                flexWrap: 'wrap',
                                justifyContent: 'center'
                            }}
                        >
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    style={{
                                        padding: '14px 32px',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        border:
                                            activeCategory === cat.id
                                                ? '2px solid rgba(255,255,255,0.9)'
                                                : '2px solid rgba(255,255,255,0.4)',
                                        background:
                                            activeCategory === cat.id
                                                ? 'rgba(255,255,255,0.25)'
                                                : 'rgba(255,255,255,0.1)',
                                        backdropFilter: 'blur(10px)',
                                        color: '#fff',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <span style={{ marginRight: '8px' }}>{cat.icon}</span>
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category Content */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                            gap: '32px'
                        }}
                    >
                        {categoryTips[activeCategory].map((tip, idx) => (
                            <div
                                key={idx}
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    backdropFilter: 'blur(15px)',
                                    borderRadius: '20px',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    transition: 'all 0.4s ease',
                                    cursor: 'pointer'
                                }}
                            >
                                {/* Image */}
                                <div
                                    style={{
                                        height: '240px',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <img
                                        src={tip.image}
                                        alt={tip.title}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            transition: 'transform 0.5s ease'
                                        }}
                                    />
                                </div>

                                {/* Content */}
                                <div
                                    style={{
                                        padding: '28px'
                                    }}
                                >
                                    <h3
                                        style={{
                                            fontSize: '22px',
                                            fontWeight: '600',
                                            color: '#fff',
                                            marginBottom: '12px',
                                            letterSpacing: '0.03em'
                                        }}
                                    >
                                        {tip.title}
                                    </h3>
                                    <p
                                        style={{
                                            fontSize: '14px',
                                            color: 'rgba(255,255,255,0.9)',
                                            lineHeight: '1.6',
                                            marginBottom: '20px',
                                            fontWeight: '300'
                                        }}
                                    >
                                        {tip.description}
                                    </p>

                                    {/* Steps */}
                                    <div
                                        style={{
                                            background: 'rgba(255,255,255,0.15)',
                                            borderRadius: '12px',
                                            padding: '18px',
                                            border: '1px solid rgba(255,255,255,0.2)'
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                color: '#fff',
                                                marginBottom: '12px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.08em'
                                            }}
                                        >
                                            Key Steps:
                                        </div>
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(2, 1fr)',
                                                gap: '10px'
                                            }}
                                        >
                                            {tip.steps.map((step, stepIdx) => (
                                                <div
                                                    key={stepIdx}
                                                    style={{
                                                        fontSize: '13px',
                                                        color: 'rgba(255,255,255,0.95)',
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: '8px',
                                                        fontWeight: '400'
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            color: '#fff',
                                                            fontWeight: '700',
                                                            fontSize: '16px'
                                                        }}
                                                    >
                                                        •
                                                    </span>
                                                    {step}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Final CTA */}
                <div
                    style={{
                        marginTop: '80px',
                        textAlign: 'center',
                        padding: '64px 32px',
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(15px)',
                        borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.25)'
                    }}
                >
                    <h2
                        style={{
                            fontSize: 'clamp(26px, 4vw, 38px)',
                            fontWeight: '300',
                            color: '#fff',
                            marginBottom: '16px',
                            letterSpacing: '0.08em'
                        }}
                    >
                        Ready for Personalized Advice?
                    </h2>
                    <p
                        style={{
                            fontSize: '16px',
                            color: 'rgba(255,255,255,0.95)',
                            marginBottom: '32px',
                            maxWidth: '600px',
                            margin: '0 auto 32px',
                            fontWeight: '300',
                            lineHeight: '1.6'
                        }}
                    >
                        Take our beauty quiz and discover your perfect routine tailored to your skin type
                    </p>
                    <button
                        style={{
                            padding: '18px 56px',
                            fontSize: '15px',
                            fontWeight: '700',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            border: 'none',
                            background: 'rgba(255,255,255,0.95)',
                            color: '#b8696d',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
                        }}
                    >
                        Start Quiz ✨
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BeautyTips;
