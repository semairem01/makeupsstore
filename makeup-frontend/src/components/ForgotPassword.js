import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./ResetPassword.css";
import { API_BASE_URL } from "../config";
export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [submittedEmail, setSubmittedEmail] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await axios.post(
                `${API_BASE_URL}/api/passwordreset/forgot-password`,
                { email: email.trim() }
            );
            setSubmittedEmail(email.trim());
            setSuccess(true);
            setEmail(""); // Formu temizle
        } catch (err) {
            setError(err.response?.data || "An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="reset-container">
                <div className="reset-card success-card">
                    
                    <h2>Email Sent!</h2>
                    <p>
                        A password reset link has been sent to <strong>{submittedEmail}</strong>
                    </p>
                    <p className="redirect-text">
                        Didn't receive the email? Check your spam folder or wait a few minutes.
                    </p>
                    <Link to="/login" className="submit-btn" style={{ marginTop: '24px', textDecoration: 'none' }}>
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="reset-container">
            <div className="reset-card">
                <div className="reset-header">
                    
                    <h2>Forgot Password?</h2>
                    <p>No worries! Enter your email and we'll send you a reset link.</p>
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
                            disabled={loading}
                            autoComplete="off"
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
                        disabled={loading || !email.trim()}
                    >
                        {loading ? (
                            <>
                                <div className="spinner"></div>
                                Sending...
                            </>
                        ) : (
                            <>
                                Send Reset Link
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
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