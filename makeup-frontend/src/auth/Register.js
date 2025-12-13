import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import "./Auth.css";

function RuleItem({ ok, text }) {
    return (
        <li className={`rule-item ${ok ? "rule-ok" : "rule-error"}`}>
            <svg className="rule-icon" viewBox="0 0 20 20" fill="currentColor">
                {ok ? (
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                ) : (
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                )}
            </svg>
            <span>{text}</span>
        </li>
    );
}

const normalizeFullName = (s) =>
    (s ?? "")
        .normalize("NFC")
        .replace(/\s+/g, " ")
        .trim();

// Türkçe dahil tüm dillerin harflerini destekler
const FULLNAME_REGEX = /^[\p{L}\p{M}\s'-]{2,60}$/u;

// Basit username kuralı: 3–30, harf/rakam/._-
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,30}$/;

function Register() {
    const [form, setForm] = useState({
        fullName: "",
        userName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showRules, setShowRules] = useState(false);

    // 🚫 Yenile/geri-ileri sonrası otomatik dolmayı engelle: reset + bfcache kontrolü
    useEffect(() => {
        const reset = () => {
            setForm({
                fullName: "",
                userName: "",
                email: "",
                phone: "",
                password: "",
                confirmPassword: "",
            });
            setShowRules(false);
            setError("");
            setSuccess("");
        };

        // İlk mount'ta da sıfırla
        reset();

        const onPageShow = (e) => {
            if (e.persisted) reset(); // bfcache'ten döndüyse
        };
        window.addEventListener("pageshow", onPageShow);
        return () => window.removeEventListener("pageshow", onPageShow);
    }, []);

    const handleChange = (e) =>
        setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

    // Şifre kurallarını Unicode'a taşıdık (Türkçe büyük/küçük doğru çalışır)
    const checks = useMemo(() => {
        const v = form.password || "";
        return {
            len: v.length >= 6,
            upper: /\p{Lu}/u.test(v),          // Unicode Uppercase
            lower: /\p{Ll}/u.test(v),          // Unicode Lowercase
            digit: /\d/.test(v),
            allowed: /^[\p{L}\d@$!%*?&]*$/u.test(v), // Harf+rakam+semboller
            match: form.password === form.confirmPassword && form.confirmPassword !== "",
        };
    }, [form.password, form.confirmPassword]);

    const cleanFullName = useMemo(
        () => normalizeFullName(form.fullName),
        [form.fullName]
    );
    const fullNameValid = FULLNAME_REGEX.test(cleanFullName);
    const userNameValid = USERNAME_REGEX.test(form.userName);

    const allRulesOk =
        checks.len && checks.upper && checks.lower && checks.digit && checks.allowed;

    // Username ve email zorunlu
    const canSubmit =
        allRulesOk && checks.match && fullNameValid && userNameValid && !!form.email;

    const strengthScore =
        (checks.len ? 1 : 0) +
        (checks.upper ? 1 : 0) +
        (checks.lower ? 1 : 0) +
        (checks.digit ? 1 : 0) +
        (checks.allowed ? 1 : 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setIsLoading(true);

        if (!fullNameValid) {
            setError("Ad Soyad yalnızca harf, boşluk ve ( ' - ) içerebilir, 2-60 karakter olmalı.");
            setIsLoading(false);
            return;
        }

        if (!userNameValid) {
            setError("Geçerli bir kullanıcı adı giriniz (3–30; harf, rakam, ., _, -).");
            setIsLoading(false);
            return;
        }

        if (!allRulesOk) {
            setError("Şifre kurallarını sağlayınız.");
            setIsLoading(false);
            return;
        }

        if (!checks.match) {
            setError("Şifreler eşleşmiyor");
            setIsLoading(false);
            return;
        }

        try {
            const res = await axios.post(`${API_ENDPOINTS.AUTH}/register`, {
                userName: form.userName,
                email: form.email,
                phoneNumber: form.phone || null,
                password: form.password,
                confirmPassword: form.confirmPassword,
                fullName: cleanFullName
            });

            if (res.data?.success) {
                setSuccess("Kayıt başarılı! Yönlendiriliyorsunuz...");
                setTimeout(() => {
                    window.location.href = "/login";
                }, 2000);
            } else {
                const msg =
                    res.data?.message ||
                    (Array.isArray(res.data?.errors) && res.data.errors.join(" • ")) ||
                    "Kayıt başarısız";
                setError(msg);
                setIsLoading(false);
            }
        } catch (err) {
            const apiMsg =
                err.response?.data?.message ||
                (Array.isArray(err.response?.data?.errors) &&
                    err.response.data.errors.join(" • ")) ||
                "Bir hata oluştu";
            setError(apiMsg);
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            {/* Sol Panel - Form */}
            <div className="auth-left">
                <div className="auth-content">
                    {/* Title */}
                    <div className="auth-header">
                        <h2 className="auth-title">Create Account</h2>
                        <p className="auth-subtitle">Join the beauty revolution today</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="auth-form" noValidate autoComplete="off">
                        {/* Full Name */}
                        <div className="input-group">
                            <label htmlFor="fullName" className="input-label">
                                Full Name
                            </label>
                            <div className="input-wrapper">
                                <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                                <input
                                    id="fullName"
                                    className={`auth-input ${form.fullName && !fullNameValid ? "input-error" : ""}`}
                                    type="text"
                                    name="fullName"
                                    placeholder="Jane Doe"
                                    value={form.fullName}
                                    onChange={handleChange}
                                    onBlur={() => setForm((s) => ({ ...s, fullName: cleanFullName }))}
                                    required
                                    autoComplete="name"
                                />
                            </div>
                            {form.fullName && !fullNameValid && (
                                <p className="input-hint error">
                                    Only letters, spaces, apostrophes and hyphens (2-60 chars)
                                </p>
                            )}
                        </div>

                        {/* Username */}
                        <div className="input-group">
                            <label htmlFor="userName" className="input-label">
                                Username
                            </label>
                            <div className="input-wrapper">
                                <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM3 17a7 7 0 1114 0H3z" />
                                </svg>
                                <input
                                    id="userName"
                                    className={`auth-input ${form.userName && !userNameValid ? "input-error" : ""}`}
                                    type="text"
                                    name="userName"
                                    placeholder="janedoe"
                                    value={form.userName}
                                    onChange={handleChange}
                                    required
                                    autoComplete="username"
                                />
                            </div>
                            {form.userName && !userNameValid && (
                                <p className="input-hint error">
                                    3–30 karakter; harf, rakam, nokta (.), alt çizgi (_), tire (-)
                                </p>
                            )}
                        </div>

                        {/* Email */}
                        <div className="input-group">
                            <label htmlFor="email" className="input-label">
                                Email Address
                            </label>
                            <div className="input-wrapper">
                                <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                                <input
                                    id="email"
                                    className="auth-input"
                                    type="email"
                                    name="email"
                                    placeholder="you@example.com"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="input-group">
                            <label htmlFor="phone" className="input-label">
                                Phone Number <span className="optional">(Optional)</span>
                            </label>
                            <div className="input-wrapper">
                                <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                </svg>
                                <input
                                    id="phone"
                                    className="auth-input"
                                    type="tel"
                                    name="phone"
                                    placeholder="+90 5xx xxx xx xx"
                                    value={form.phone}
                                    onChange={handleChange}
                                    inputMode="tel"
                                    autoComplete="tel"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="input-group">
                            <label htmlFor="password" className="input-label">
                                Password
                            </label>
                            <div className="input-wrapper">
                                <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <input
                                    id="password"
                                    className="auth-input"
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    onFocus={() => setShowRules(true)}
                                    required
                                    autoComplete="new-password"
                                />
                            </div>

                            {/* Password Rules */}
                            {showRules && form.password && (
                                <div className="password-rules">
                                    <div className="rules-header">
                                        <span className="rules-title">Password Requirements</span>
                                        <div className="strength-bar">
                                            <div
                                                className={`strength-fill strength-${strengthScore <= 2 ? 'weak' : strengthScore === 3 ? 'medium' : 'strong'}`}
                                                style={{ width: `${(strengthScore / 5) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <ul className="rules-list">
                                        <RuleItem ok={checks.len} text="At least 6 characters" />
                                        <RuleItem ok={checks.upper} text="One uppercase letter (includes ÄÖŞĞİ…)" />
                                        <RuleItem ok={checks.lower} text="One lowercase letter (includes äöşğı…)" />
                                        <RuleItem ok={checks.digit} text="One number (0-9)" />
                                        <RuleItem ok={checks.allowed} text="Allowed: letters, digits, @$!%*?&" />
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="input-group">
                            <label htmlFor="confirmPassword" className="input-label">
                                Confirm Password
                            </label>
                            <div className="input-wrapper">
                                <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <input
                                    id="confirmPassword"
                                    className={`auth-input ${!checks.match && form.confirmPassword ? "input-error" : ""}`}
                                    type="password"
                                    name="confirmPassword"
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    autoComplete="new-password"
                                />
                            </div>
                            {!checks.match && form.confirmPassword && (
                                <p className="input-hint error">Passwords do not match</p>
                            )}
                        </div>

                        {/* Error/Success Messages */}
                        {error && (
                            <div className="auth-error" role="alert">
                                <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="auth-success" role="status">
                                <svg className="success-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {success}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            className="auth-button"
                            type="submit"
                            disabled={!canSubmit || isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="spinner" viewBox="0 0 24 24">
                                        <circle className="spinner-circle" cx="12" cy="12" r="10" />
                                    </svg>
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    Create Account
                                    <svg className="button-arrow" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="auth-divider">
                        <span className="divider-line"></span>
                        <span className="divider-text">or sign up with</span>
                        <span className="divider-line"></span>
                    </div>

                    {/* Social Login */}
                    <div className="social-buttons">
                        <button className="social-button">
                            <svg viewBox="0 0 24 24" className="social-icon">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 2.09 12 2.09 7.7 2.09 3.99 4.56 2.18 8.16l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Google
                        </button>
                        <button className="social-button">
                            <svg viewBox="0 0 24 24" className="social-icon">
                                <path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                            Facebook
                        </button>
                    </div>

                    {/* Sign In Link */}
                    <div className="auth-switch">
                        Already have an account?{" "}
                        <a href="/login" className="switch-link">
                            Sign in now
                        </a>
                    </div>
                </div>
            </div>

            {/* Sağ Panel - Hero Image */}
            <div className="auth-right">
                <div className="auth-hero">
                    <div className="hero-overlay"></div>
                    <div className="hero-content">
                        <div className="hero-badge">New Member Benefits</div>
                        <h2 className="hero-title">Start Your Beauty Journey</h2>
                        <p className="hero-text">
                            Create an account and unlock exclusive perks, personalized recommendations,
                            and early access to new collections.
                        </p>
                        <div className="hero-features">
                            <div className="feature-item">
                                <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                                    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                                </svg>
                                <span>10% Off First Order</span>
                            </div>
                            <div className="feature-item">
                                <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                                <span>Birthday Rewards</span>
                            </div>
                            <div className="feature-item">
                                <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784 .57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span>Loyalty Points</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;
