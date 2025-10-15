import React, { useState } from "react";
import "./ContactPage.css";
import { FaInstagram, FaPinterest, FaLinkedin } from "react-icons/fa";

export default function ContactPage() {
    const [form, setForm] = useState({ name: "", email: "", message: "" });
    const [status, setStatus] = useState(null);

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        setStatus("loading");
        try {
            // backend yoksa demo:
            await new Promise((r) => setTimeout(r, 600));
            setStatus("ok");
            setForm({ name: "", email: "", message: "" });
        } catch {
            setStatus("err");
        }
    };

    return (
        <div className="contact-wrap" id="top-of-contact">
            {/* SOL: sabit genişlikte renkli şerit */}
            <aside className="contact-aside">
                <h4 className="aside-title">Other ways to reach us</h4>

                <div className="aside-group">
                    <div className="aside-label">By Email</div>
                    <a href="mailto:info@lunarabeauty.com" className="email-link">
                        info@lunarabeauty.com
                    </a>
                </div>

                <div className="aside-group">
                    <div className="aside-label">On Social</div>
                    <div className="social-icons">
                        <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
                            <FaInstagram />
                        </a>
                        <a href="https://pinterest.com" target="_blank" rel="noreferrer" aria-label="Pinterest">
                            <FaPinterest />
                        </a>
                        <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                            <FaLinkedin />
                        </a>
                    </div>
                </div>
            </aside>

            {/* SAĞ: form + harita */}
            <section className="contact-form">

                <p className="kicker">Contact us</p>
                <h1 className="headline">Use the form below to reach out.</h1>

                <form onSubmit={onSubmit} className="form">
                    <input
                        name="name"
                        value={form.name}
                        onChange={onChange}
                        placeholder="Your name"
                        required
                    />
                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={onChange}
                        placeholder="Email address"
                        required
                    />
                    <textarea
                        name="message"
                        value={form.message}
                        onChange={onChange}
                        placeholder="Your message"
                        rows={6}
                        required
                    />
                    <button type="submit" disabled={status === "loading"}>
                        {status === "loading" ? "Sending…" : "Send it"}
                    </button>
                    {status === "ok" && <div className="note ok">Thanks! We’ll get back to you.</div>}
                    {status === "err" && <div className="note err">Oops, something went wrong.</div>}
                </form>

                {/* ✅ Google Maps embed: “pb” hatasız basit query formatı */}
                <div className="map-wrap">
                    <iframe
                        title="Lunara Beauty Location"
                        loading="lazy"
                        // İstanbul – Sultanahmet civarı; kendi koordinatını yazabilirsin
                        src="https://maps.google.com/maps?q=41.0082,28.9784&z=13&output=embed"
                    />
                </div>
            </section>
        </div>
    );
}
