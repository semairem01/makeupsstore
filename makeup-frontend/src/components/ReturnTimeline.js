// src/components/ReturnTimeline.jsx
import React from "react";
import "./ReturnTimeline.css";

const RETURN_STEPS = [
    { key: "Requested", label: "Requested", icon: "📋" },
    { key: "Approved", label: "Approved", icon: "✅" },
    { key: "InTransit", label: "In Transit", icon: "📦" },
    { key: "Received", label: "Received", icon: "🏢" },
    { key: "RefundCompleted", label: "Refunded", icon: "💰" }
];

export default function ReturnTimeline({ returnStatus, returnCode }) {
    const getStepIndex = (status) => {
        const map = {
            "None": -1,
            "Requested": 0,
            "Approved": 1,
            "Rejected": -1,
            "InTransit": 2,
            "Received": 3,
            "Inspecting": 3,
            "RefundProcessing": 4,
            "RefundCompleted": 4,
            "Cancelled": -1
        };
        return map[status] ?? -1;
    };

    const currentStep = getStepIndex(returnStatus);

    if (returnStatus === "Rejected") {
        return (
            <div className="return-timeline-alert rejected">
                <span className="icon">❌</span>
                <div>
                    <strong>Return Request Rejected</strong>
                    <p>Your return request has been reviewed and rejected. Please check admin notes for details.</p>
                </div>
            </div>
        );
    }

    if (returnStatus === "Cancelled") {
        return (
            <div className="return-timeline-alert cancelled">
                <span className="icon">🚫</span>
                <div>
                    <strong>Return Cancelled</strong>
                    <p>This return request has been cancelled.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="return-timeline-wrap">
            {returnCode && (
                <div className="return-code-badge">
                    <span className="label">Return Code:</span>
                    <span className="code">{returnCode}</span>
                </div>
            )}

            <div className="return-timeline">
                {RETURN_STEPS.map((step, idx) => {
                    const isCompleted = idx <= currentStep;
                    const isActive = idx === currentStep;

                    return (
                        <div key={step.key} className={`return-step ${isCompleted ? "completed" : ""} ${isActive ? "active" : ""}`}>
                            <div className="step-icon">
                                {isCompleted ? "✓" : step.icon}
                            </div>
                            <div className="step-label">{step.label}</div>
                            {idx < RETURN_STEPS.length - 1 && (
                                <div className={`step-line ${isCompleted ? "completed" : ""}`} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}