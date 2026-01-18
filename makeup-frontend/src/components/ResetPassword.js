import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import "./ResetPassword.css";
import { API_BASE_URL } from "../config";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const token = searchParams.get("token");
    const emailFromUrl = searchParams.get("email");

    useEffect(() => {
        if (!token) {
            setError("Invalid or missing reset link.");
        }
        // URL'den email varsa otomatik doldur
        if (emailFromUrl) {
            setEmail(emailFromUrl);
        }
    }, [token, emailFromUrl]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        // Frontend validasyon
        if (!/[A-Z]/.test(newPassword)) {
            setError("Password must contain at least one uppercase letter (A-Z).");
            return;
        }

        if (!/[a-z]/.test(newPassword)) {
            setError("Password must contain at least one lowercase letter (a-z).");
            return;
        }

        setLoading(true);

        try {
            await axios.post(`${API_BASE_URL}/api/passwordreset/reset-password`, {
                email: email.trim(),
                token: token,
                newPassword: newPassword
            });

            setSuccess(true);
            setTimeout(() => {
                navigate("/login");
            }, 3000);
        } catch (err) {
            setError(err.response?.data || "Password reset failed. The link may be invalid or expired.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="reset-container">
                <div className="reset-card success-card">
                    <div className="success-icon">✓</div>
                    <h2>Password Changed!</h2>
                    <p>Your password has been successfully reset.</p>
                    <p className="redirect-text">Redirecting to login page...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="reset-container">
            <div className="reset-card">
                <div className="reset-header">
                    <div className="reset-icon">🔐</div>
                    <h2>Set New Password</h2>
                    <p>Create a strong and secure password for your account.</p>
                </div>

                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            disabled={loading || !!emailFromUrl}
                            autoComplete="off"
                        />
                    </div>

                    <div className="form-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            required
                            disabled={loading}
                            minLength={6}
                            autoComplete="new-password"
                        />
                        <div style={{
                            fontSize: '12px',
                            color: '#718096',
                            marginTop: '6px',
                            lineHeight: '1.5'
                        }}>
                            Password must contain:
                            <br />• At least 6 characters
                            <br />• At least one uppercase letter (A-Z)
                            <br />• At least one lowercase letter (a-z)
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter your password"
                            required
                            disabled={loading}
                            minLength={6}
                            autoComplete="new-password"
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            <svg viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading || !token}
                    >
                        {loading ? (
                            <>
                                <div className="spinner"></div>
                                Resetting...
                            </>
                        ) : (
                            <>
                                Reset Password
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>

                <div className="back-link">
                    <Link to="/login">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}