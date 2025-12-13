import React from "react";
import "./Auth.css";

function AuthLayout({ children }) {
    return (
        <div className="auth-container">
            {/* Sol panel */}
            <div className="auth-left">
                <h1>MIZO BEAUTY</h1>
                <h2>SUPER NATURAL</h2>
                <p>All our products are 100% natural and not tested on animals.</p>

                {/* Görsel (opsiyonel) */}
                <img
                    src="/images/layout.jpg"
                    alt="Beauty"
                    className="auth-image"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                />
            </div>

            {/* Sağ panel (form) */}
            <div className="auth-right">
                {children}
            </div>
        </div>
    );
}

export default AuthLayout;