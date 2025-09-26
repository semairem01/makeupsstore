import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminDashboard() {
    const [summary, setSummary] = useState({ sales: 0, orders: 0, today: 0, delta: 0 });
    const [popular, setPopular] = useState([]);   // [{id,name,totalSold}]
    const [dailyOrders, setDailyOrders] = useState([]); // [{date,count}]
    const token = localStorage.getItem("token");

    useEffect(() => {
        const headers = { Authorization: `Bearer ${token}` };

        // KPI özet
        axios
            .get(API_ENDPOINTS.ADMIN_METRICS, { headers })
            .then(r => setSummary(r.data))
            .catch(() => {});

        // En çok satan ürünler
        axios
            .get(`${API_ENDPOINTS.ADMIN_TOP_PRODUCTS}?limit=5`, { headers })
            .then(r => setPopular(r.data || []))
            .catch(() => {});

        // Günlük siparişler (endpoint’i eklediysen)
        if (API_ENDPOINTS.ADMIN_DAILY_ORDERS) {
            axios
                .get(API_ENDPOINTS.ADMIN_DAILY_ORDERS, { headers })
                .then(r => {
                    const data = (r.data || []).map(x => ({
                        date: new Date(x.date).toLocaleDateString("tr-TR"),
                        count: x.count,
                    }));
                    setDailyOrders(data);
                })
                .catch(() => {});
        }
    }, [token]);

    const fmtTL = (n) =>
        (Number(n) || 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

    return (
        <div style={{ padding: "2rem" }}>
            <h1>Admin Dashboard</h1>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
                <div className="card"><div>Toplam Satış</div><strong>{fmtTL(summary.sales)}</strong></div>
                <div className="card"><div>Toplam Sipariş</div><strong>{summary.orders}</strong></div>
                <div className="card"><div>Bugün</div><strong>{fmtTL(summary.today)}</strong></div>
                <div className="card"><div>Değişim</div><strong>{summary.delta > 0 ? `+${summary.delta}%` : `${summary.delta}%`}</strong></div>
            </div>

            {dailyOrders.length > 0 && (
                <>
                    <h2>📊 Günlük Siparişler</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dailyOrders}>
                            <XAxis dataKey="date" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#ff69b4" />
                        </BarChart>
                    </ResponsiveContainer>
                </>
            )}

            <h2 style={{ marginTop: "2rem" }}>🔥 En Çok Satan Ürünler</h2>
            <ul>
                {popular.map((p) => (
                    <li key={p.id}>{p.name} — {p.totalSold} adet</li>
                ))}
            </ul>
        </div>
    );
}
