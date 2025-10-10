// src/components/orders/OrderTimeline.jsx
import React from "react";
import "./OrderTimeline.css";

export const STATUS_STEPS = [
    { key: "SiparisAlindi", label: "Order Received" },
    { key: "Hazirlaniyor",  label: "Preparing" },
    { key: "Kargoda",       label: "Shipped" },
    { key: "TeslimEdildi",  label: "Delivered" },
];

export default function OrderTimeline({ status }) {
    const stepIndex = STATUS_STEPS.findIndex(s => s.key === status);
    return (
        <div className="progress">
            {STATUS_STEPS.map((s, i) => (
                <div key={s.key} className={`step ${i <= stepIndex ? "done" : ""}`}>
                    <div className="dot">{i < stepIndex ? "✓" : i + 1}</div>
                    <div className="label">{s.label}</div>
                    {i < STATUS_STEPS.length - 1 && (
                        <div className={`bar ${i < stepIndex ? "active" : ""}`} />
                    )}
                </div>
            ))}
        </div>
    );
}
