// src/components/OrderTimeline.jsx
import React from "react";

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
            <div className="timeline-special" style={{
                background: "#ffe8ed",
                padding: "16px",
                borderRadius: "12px",
                marginBottom: "16px",
                textAlign: "center",
                color: "#c5224b",
                fontWeight: 600
            }}>
                Order Cancelled
            </div>
        );
    }

    if (status === "IadeTalepEdildi") {
        return (
            <div className="timeline-special" style={{
                background: "#fff4e6",
                padding: "16px",
                borderRadius: "12px",
                marginBottom: "16px",
                textAlign: "center",
                color: "#d97706",
                fontWeight: 600
            }}>
                Return Requested - Awaiting Review
            </div>
        );
    }

    if (status === "IadeOnaylandi") {
        return (
            <div className="timeline-special" style={{
                background: "#dcfce7",
                padding: "16px",
                borderRadius: "12px",
                marginBottom: "16px",
                textAlign: "center",
                color: "#16a34a",
                fontWeight: 600
            }}>
                Return Approved - Refund Process Started
            </div>
        );
    }

    if (status === "IadeReddedildi") {
        return (
            <div className="timeline-special" style={{
                background: "#ffe8ed",
                padding: "16px",
                borderRadius: "12px",
                marginBottom: "16px",
                textAlign: "center",
                color: "#c5224b",
                fontWeight: 600
            }}>
                Return Request Rejected
            </div>
        );
    }

    if (status === "IadeTamamlandi") {
        return (
            <div className="timeline-special" style={{
                background: "#dcfce7",
                padding: "16px",
                borderRadius: "12px",
                marginBottom: "16px",
                textAlign: "center",
                color: "#16a34a",
                fontWeight: 600
            }}>
                Return Completed - Refund Processed
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