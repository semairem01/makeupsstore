// src/components/OrderTimeline.jsx - Premium Design
import React from "react";
import "./OrderTimeline.css";

export const STATUS_STEPS = [
    { key: "SiparisAlindi", label: "Order Received" },
    { key: "Hazirlaniyor", label: "Preparing" },
    { key: "Kargoda", label: "Shipped" },
    { key: "TeslimEdildi", label: "Delivered" }
];

export default function OrderTimeline({ status }) {
    // Special handling for return/cancel statuses
    if (status === "IptalEdildi") {
        return (
            <div style={{
                background: "linear-gradient(135deg, #FCA5A5 0%, #F87171 100%)",
                padding: "24px",
                borderRadius: "20px",
                marginBottom: "20px",
                textAlign: "center",
                color: "white",
                fontWeight: 800,
                fontSize: "1.1rem",
                boxShadow: "0 8px 24px rgba(248, 113, 113, 0.4)",
                textTransform: "uppercase",
                letterSpacing: "1px"
            }}>
                ❌ Order Cancelled
            </div>
        );
    }

    if (status === "IadeTalepEdildi") {
        return (
            <div style={{
                background: "linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%)",
                padding: "24px",
                borderRadius: "20px",
                marginBottom: "20px",
                textAlign: "center",
                color: "#78350F",
                fontWeight: 800,
                fontSize: "1.1rem",
                boxShadow: "0 8px 24px rgba(252, 211, 77, 0.4)",
                textTransform: "uppercase",
                letterSpacing: "1px"
            }}>
                ⏳ Return Requested - Awaiting Review
            </div>
        );
    }

    if (status === "IadeOnaylandi") {
        return (
            <div style={{
                background: "linear-gradient(135deg, #86EFAC 0%, #4ADE80 100%)",
                padding: "24px",
                borderRadius: "20px",
                marginBottom: "20px",
                textAlign: "center",
                color: "white",
                fontWeight: 800,
                fontSize: "1.1rem",
                boxShadow: "0 8px 24px rgba(74, 222, 128, 0.4)",
                textTransform: "uppercase",
                letterSpacing: "1px"
            }}>
                ✅ Return Approved - Refund Process Started
            </div>
        );
    }

    if (status === "IadeReddedildi") {
        return (
            <div style={{
                background: "linear-gradient(135deg, #FCA5A5 0%, #F87171 100%)",
                padding: "24px",
                borderRadius: "20px",
                marginBottom: "20px",
                textAlign: "center",
                color: "white",
                fontWeight: 800,
                fontSize: "1.1rem",
                boxShadow: "0 8px 24px rgba(248, 113, 113, 0.4)",
                textTransform: "uppercase",
                letterSpacing: "1px"
            }}>
                ❌ Return Request Rejected
            </div>
        );
    }

    if (status === "IadeTamamlandi") {
        return (
            <div style={{
                background: "linear-gradient(135deg, #86EFAC 0%, #4ADE80 100%)",
                padding: "24px",
                borderRadius: "20px",
                marginBottom: "20px",
                textAlign: "center",
                color: "white",
                fontWeight: 800,
                fontSize: "1.1rem",
                boxShadow: "0 8px 24px rgba(74, 222, 128, 0.4)",
                textTransform: "uppercase",
                letterSpacing: "1px"
            }}>
                💰 Return Completed - Refund Processed
            </div>
        );
    }

    // Normal order flow
    const currentIdx = STATUS_STEPS.findIndex(s => s.key === status);
    const activeIdx = currentIdx >= 0 ? currentIdx : 0;

    return (
        <div className="progress">
            {STATUS_STEPS.map((step, idx) => {
                const isDone = idx <= activeIdx;
                return (
                    <div key={step.key} className={`step ${isDone ? "done" : ""}`}>
                        <div className="dot">{idx + 1}</div>
                        <div className="label">{step.label}</div>
                        {idx < STATUS_STEPS.length - 1 && (
                            <div className={`bar ${idx < activeIdx ? "active" : ""}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}