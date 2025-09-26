import React, { useState } from "react";
import axios from "axios";
import AuthLayout from "./AuthLayout";
import { API_ENDPOINTS } from "../config";

function Login() {
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");

    const handleChange = (e) =>
        setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        try {
            const res = await axios.post(`${API_ENDPOINTS.AUTH}/login`, {
                email: form.email,
                password: form.password,
            });

            if (res.data?.success) {
                // Token'ı kaydet
                localStorage.setItem("token", res.data.token);
                localStorage.setItem("isAdmin", res.data.user.isAdmin);
                // Yönlendirme
                if (res.data.user.isAdmin) {
                    window.location.href = "/admin";
                } else {
                    window.location.href = "/";
                }
            } else {
                setError(res.data?.message || "Giriş başarısız");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Giriş başarısız");
        }
    };

    return (
        <AuthLayout>
            <div className="auth-card">
                <h2 className="auth-title">Welcome Back</h2>
                <p className="auth-subtitle">Sign in to your account</p>

                <form onSubmit={handleSubmit} className="auth-form">
                    <input
                        className="auth-input"
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={handleChange}
                        required
                    />
                    <input
                        className="auth-input"
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={handleChange}
                        required
                    />
                    <button className="auth-button" type="submit">SIGN IN</button>
                </form>

                {error && <div className="auth-error">{error}</div>}

                <div className="auth-switch">
                    Don’t have an account? <a href="/register">Sign up Now!</a>
                </div>
            </div>
        </AuthLayout>
    );
}

export default Login;