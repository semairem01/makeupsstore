import React from "react";
import "./Footer.css";
import { Link } from "react-router-dom";
export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="ft">
            <div className="ft-overlay">
                <div className="ft-container">
                    {/* Logo - Ortada */}
                    <div className="ft-logo-section">
                        <a className="ft-brand" href="/">
                            <img src="/images/logo1.png" alt="Lunara Beauty" />
                        </a>
                    </div>

                    {/* İçerik Alanları */}
                    <div className="ft-content">
                        {/* Sol Kolon */}
                        <div className="ft-column">
                            <h3 className="ft-title">CONTACT</h3>
                            <div className="ft-info">
                                <p>+444 555 6666</p>
                                <p>info@lunarabeauty.com</p>
                            </div>
                        </div>

                        {/* Orta Kolon */}
                        <div className="ft-column">
                            <h3 className="ft-title">INFORMATION</h3>
                            <nav className="ft-links">
                                <Link to="/contact#top-of-contact">Contact Us</Link>
                                <Link to="/about">About Us</Link>
                                <Link to="/terms">Terms & Conditions</Link>
                                <Link to="/privacy">Privacy Policy</Link>
                            </nav>
                        </div>

                        {/* Sağ Kolon - Newsletter */}
                        <div className="ft-column">
                            <h3 className="ft-title">STAY IN THE KNOW</h3>
                            <div className="ft-newsletter">
                                <input
                                    type="email"
                                    placeholder="Email address"
                                    aria-label="Email for newsletter"
                                />
                                <button type="submit" aria-label="Subscribe">→</button>
                            </div>
                        </div>
                    </div>

                    {/* Social Media */}
                    <div className="ft-social-section">
                        <div className="ft-social">
                            <a
                                href="https://facebook.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Facebook"
                            >
                                f
                            </a>
                            <a
                                href="https://instagram.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Instagram"
                            >
                                📷
                            </a>
                            <a
                                href="https://pinterest.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Pinterest"
                            >
                                P
                            </a>
                        </div>
                    </div>

                    {/* Copyright */}
                    <div className="ft-bottom">
                        <small>© {year} LUNARA BEAUTY</small>
                        <button
                            className="ft-top"
                            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                            aria-label="Back to top"
                        >
                            ↑
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    );
}