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

    // Backend ile aynı kurallar:
    // ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$
    const checks = useMemo(() => {
        const v = form.password || "";
        return {
            len: v.length >= 6,
            upper: /[A-Z]/.test(v),
            lower: /[a-z]/.test(v),
            digit: /\d/.test(v),
            allowed: /^[a-zA-Z\d@$!%*?&]*$/.test(v), // opsiyonel olarak izinli karakter seti
            match: form.password === form.confirmPassword && form.confirmPassword !== "",
        };
    }, [form.password, form.confirmPassword]);

    const allRulesOk = checks.len && checks.upper && checks.lower && checks.digit && checks.allowed;
    const canSubmit = allRulesOk && checks.match && form.fullName && form.email;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

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
                userName: form.fullName,           // DTO: UserName
                email: form.email,
                phoneNumber: form.phone || null,   // DTO: PhoneNumber
                password: form.password,           // DTO: Password
                confirmPassword: form.confirmPassword, // DTO: ConfirmPassword
            });

            if (res.data?.success) {
                setSuccess("Kayıt başarılı! Giriş yapabilirsiniz.");
            } else {
                // ModelState/Validation hataları backend'den bir liste olarak gelebilir
                const msg =
                    res.data?.message ||
                    (Array.isArray(res.data?.errors) && res.data.errors.join(" • ")) ||
                    "Kayıt başarısız";
                setError(msg);
            }
        } catch (err) {
            const apiMsg =
                err.response?.data?.message ||
                (Array.isArray(err.response?.data?.errors) && err.response.data.errors.join(" • ")) ||
                "Bir hata oluştu";
            setError(apiMsg);
        }
    };

    // Basit bir “güç” metriği (opsiyonel)
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
                    <input
                        className="auth-input"
                        type="text"
                        name="fullName"
                        placeholder="Full name"
                        value={form.fullName}
                        onChange={handleChange}
                        required
                    />
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
                            // HTML5 pattern (backend ile eşleşsin)
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
                                <RuleItem ok={checks.allowed} text="Sadece izinli karakterler: a-z, A-Z, 0-9, @$!%*?&" />
                            </ul>

                            {/* Opsiyonel: basit güç göstergesi */}
                            <div className="mt-2">
                                <div className="h-1 w-full bg-gray-200 rounded">
                                    <div
                                        className={`h-1 rounded ${strengthScore <= 2 ? "bg-red-500" : strengthScore === 3 ? "bg-yellow-500" : "bg-green-600"}`}
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
                        <div className="text-red-600 text-sm mt-[-6px] mb-2">Şifreler eşleşmiyor</div>
                    )}

                    <button className="auth-button" type="submit" disabled={!canSubmit} aria-disabled={!canSubmit}>
                        SIGN UP
                    </button>
                </form>

                {error && <div className="auth-error" role="alert">{error}</div>}
                {success && <div className="auth-success" role="status">{success}</div>}

                <div className="auth-switch">
                    Already have an account? <a href="/login">Sign in Now!</a>
                </div>
            </div>
        </AuthLayout>
    );
}

export default Register;
