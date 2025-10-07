import React, { useState, useMemo } from "react";
import axios from "axios";
import AuthLayout from "./AuthLayout";
import { API_ENDPOINTS } from "../config";

function RuleItem({ ok, text }) {
    return (
        <li
            className={`flex items-center gap-2 text-sm ${
                ok ? "text-green-600" : "text-red-600"
            }`}
            role="status"
            aria-live="polite"
        >
            <span aria-hidden="true">{ok ? "✓" : "✗"}</span>
            <span>{text}</span>
        </li>
    );
}

// 🔠 Ad Soyad normalize + regex
const normalizeFullName = (s) =>
    (s ?? "")
        .normalize("NFC")         // diakritikleri düzgün birleştir
        .replace(/\s+/g, " ")     // çoklu boşluk -> tek boşluk
        .trim();

const FULLNAME_REGEX = /^[A-Za-zÇĞİÖŞÜçğıöşü\s'-]{2,60}$/; // harf + boşluk + ' -

function Register() {
    const [form, setForm] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (e) =>
        setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

    // Şifre kuralları (BE ile aynı)
    const checks = useMemo(() => {
        const v = form.password || "";
        return {
            len: v.length >= 6,
            upper: /[A-Z]/.test(v),
            lower: /[a-z]/.test(v),
            digit: /\d/.test(v),
            allowed: /^[a-zA-Z\d@$!%*?&]*$/.test(v),
            match:
                form.password === form.confirmPassword && form.confirmPassword !== "",
        };
    }, [form.password, form.confirmPassword]);

    // 👤 Full name validasyon
    const cleanFullName = useMemo(
        () => normalizeFullName(form.fullName),
        [form.fullName]
    );
    const fullNameValid = FULLNAME_REGEX.test(cleanFullName);

    const allRulesOk =
        checks.len && checks.upper && checks.lower && checks.digit && checks.allowed;
    const canSubmit = allRulesOk && checks.match && fullNameValid && form.email;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        // Full name kontrol
        if (!fullNameValid) {
            setError(
                "Ad Soyad yalnızca harf, boşluk ve ( ' - ) içerebilir, 2-60 karakter olmalı."
            );
            return;
        }

        if (!allRulesOk) {
            setError("Şifre kurallarını sağlayınız.");
            return;
        }
        if (!checks.match) {
            setError("Şifreler eşleşmiyor");
            return;
        }

        try {
            const res = await axios.post(`${API_ENDPOINTS.AUTH}/register`, {
                userName: cleanFullName,          // ✅ normalize edilmiş değer
                email: form.email,
                phoneNumber: form.phone || null,
                password: form.password,
                confirmPassword: form.confirmPassword,
            });

            if (res.data?.success) {
                setSuccess("Kayıt başarılı! Giriş yapabilirsiniz.");
            } else {
                const msg =
                    res.data?.message ||
                    (Array.isArray(res.data?.errors) && res.data.errors.join(" • ")) ||
                    "Kayıt başarısız";
                setError(msg);
            }
        } catch (err) {
            const apiMsg =
                err.response?.data?.message ||
                (Array.isArray(err.response?.data?.errors) &&
                    err.response.data.errors.join(" • ")) ||
                "Bir hata oluştu";
            setError(apiMsg);
        }
    };

    // Basit güç metriği (opsiyonel)
    const strengthScore =
        (checks.len ? 1 : 0) +
        (checks.upper ? 1 : 0) +
        (checks.lower ? 1 : 0) +
        (checks.digit ? 1 : 0) +
        (checks.allowed ? 1 : 0);

    return (
        <AuthLayout>
            <div className="auth-card">
                <h2 className="auth-title">Welcome to MIZO BEAUTY</h2>
                <p className="auth-subtitle">Create your account</p>

                <form onSubmit={handleSubmit} className="auth-form" noValidate>
                    <div className="space-y-1">
                        <input
                            className={`auth-input ${
                                form.fullName && !fullNameValid ? "border-red-500" : ""
                            }`}
                            type="text"
                            name="fullName"
                            placeholder="Full name"
                            value={form.fullName}
                            onChange={handleChange}
                            onBlur={() =>
                                setForm((s) => ({ ...s, fullName: cleanFullName })) // ✅ otomatik normalize
                            }
                            required
                            aria-invalid={form.fullName && !fullNameValid}
                            aria-describedby="fullname-help"
                        />
                        {form.fullName && !fullNameValid && (
                            <div id="fullname-help" className="text-red-600 text-sm">
                                Ad Soyad yalnızca harf, boşluk ve ( ' - ) içerebilir, 2-60 karakter olmalı.
                            </div>
                        )}
                    </div>

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
                        type="text"
                        name="phone"
                        placeholder="Phone"
                        value={form.phone}
                        onChange={handleChange}
                        inputMode="tel"
                    />

                    <div className="space-y-2">
                        <input
                            className="auth-input"
                            type="password"
                            name="password"
                            placeholder="Create password"
                            value={form.password}
                            onChange={handleChange}
                            required
                            pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$"
                            aria-describedby="password-rules"
                        />

                        {/* Şifre kuralları checklist */}
                        <div id="password-rules" className="rounded-md border p-3 bg-gray-50">
                            <p className="text-xs text-gray-600 mb-2">Şifre kuralları:</p>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                <RuleItem ok={checks.len} text="En az 6 karakter" />
                                <RuleItem ok={checks.upper} text="En az 1 büyük harf (A-Z)" />
                                <RuleItem ok={checks.lower} text="En az 1 küçük harf (a-z)" />
                                <RuleItem ok={checks.digit} text="En az 1 rakam (0-9)" />
                                <RuleItem
                                    ok={checks.allowed}
                                    text="Sadece izinli karakterler: a-z, A-Z, 0-9, @$!%*?&"
                                />
                            </ul>

                            {/* Opsiyonel güç göstergesi */}
                            <div className="mt-2">
                                <div className="h-1 w-full bg-gray-200 rounded">
                                    <div
                                        className={`h-1 rounded ${
                                            strengthScore <= 2
                                                ? "bg-red-500"
                                                : strengthScore === 3
                                                    ? "bg-yellow-500"
                                                    : "bg-green-600"
                                        }`}
                                        style={{ width: `${(strengthScore / 5) * 100}%` }}
                                        aria-hidden="true"
                                    />
                                </div>
                                <span className="text-[11px] text-gray-600">
                  Güç: {strengthScore <= 2 ? "Zayıf" : strengthScore === 3 ? "Orta" : "Güçlü"}
                </span>
                            </div>
                        </div>
                    </div>

                    <input
                        className="auth-input"
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm password"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        required
                    />
                    {!checks.match && form.confirmPassword && (
                        <div className="text-red-600 text-sm mt-[-6px] mb-2">
                            Şifreler eşleşmiyor
                        </div>
                    )}

                    <button
                        className="auth-button"
                        type="submit"
                        disabled={!canSubmit}
                        aria-disabled={!canSubmit}
                    >
                        SIGN UP
                    </button>
                </form>

                {error && (
                    <div className="auth-error" role="alert">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="auth-success" role="status">
                        {success}
                    </div>
                )}

                <div className="auth-switch">
                    Already have an account? <a href="/login">Sign in Now!</a>
                </div>
            </div>
        </AuthLayout>
    );
}

export default Register;
