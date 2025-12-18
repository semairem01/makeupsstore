import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, ShoppingCart, DollarSign, Package, Calendar } from "lucide-react";

export default function AdminDashboard() {
    const [summary, setSummary] = useState({ sales: 0, orders: 0, today: 0, delta: 0 });
    const [popular, setPopular] = useState([]);
    const [dailyOrders, setDailyOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("token");

    useEffect(() => {
        const headers = { Authorization: `Bearer ${token}` };

        Promise.all([
            axios.get(API_ENDPOINTS.ADMIN_METRICS, { headers }).then(r => setSummary(r.data)).catch(() => {}),
            axios.get(`${API_ENDPOINTS.ADMIN_TOP_PRODUCTS}?limit=5`, { headers }).then(r => setPopular(r.data || [])).catch(() => {}),
            API_ENDPOINTS.ADMIN_DAILY_ORDERS && axios.get(API_ENDPOINTS.ADMIN_DAILY_ORDERS, { headers }).then(r => {
                const data = (r.data || []).map(x => ({
                    date: new Date(x.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    count: x.count,
                }));
                setDailyOrders(data);
            }).catch(() => {})
        ]).finally(() => setLoading(false));
    }, [token]);

    const fmtTL = (n) => (Number(n) || 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

    const StatCard = ({ title, value, icon: Icon, trend, color }) => (
        <div className="admin-stat-card">
            <div className="admin-stat-header">
                <div className={`admin-stat-icon ${color}`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                {trend !== undefined && (
                    <div className={`admin-stat-trend ${trend >= 0 ? 'positive' : 'negative'}`}>
                        {trend >= 0 ? <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />}
                        <span className="hidden sm:inline">{Math.abs(trend)}%</span>
                    </div>
                )}
            </div>
            <div className="admin-stat-title">{title}</div>
            <div className="admin-stat-value">{value}</div>
        </div>
    );

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="admin-spinner"></div>
                <p className="admin-loading-text">Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="admin-container">
                <div className="admin-header">
                    <h1 className="admin-title">Dashboard</h1>
                    <p className="admin-subtitle">Welcome back! Here's what's happening with your store today.</p>
                </div>

                <div className="admin-stats-grid">
                    <StatCard
                        title="Total Revenue"
                        value={fmtTL(summary.sales)}
                        icon={DollarSign}
                        color="emerald"
                    />
                    <StatCard
                        title="Total Orders"
                        value={summary.orders}
                        icon={ShoppingCart}
                        color="blue"
                    />
                    <StatCard
                        title="Today's Sales"
                        value={fmtTL(summary.today)}
                        icon={Calendar}
                        color="purple"
                    />
                    <StatCard
                        title="Growth Rate"
                        value={`${summary.delta > 0 ? '+' : ''}${summary.delta}%`}
                        icon={TrendingUp}
                        trend={summary.delta}
                        color="pink"
                    />
                </div>

                {dailyOrders.length > 0 && (
                    <div className="admin-card">
                        <div className="admin-card-header">
                            <div className="admin-card-icon-wrapper pink">
                                <BarChart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="admin-card-title">Daily Orders</h2>
                                <p className="admin-card-desc">Order volume over time</p>
                            </div>
                        </div>
                        <div className="admin-chart-wrapper">
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={dailyOrders} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#ec4899" stopOpacity={0.9}/>
                                            <stop offset="100%" stopColor="#db2777" stopOpacity={0.7}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
                                    <YAxis allowDecimals={false} stroke="#9ca3af" fontSize={11} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                            fontSize: '13px'
                                        }}
                                        cursor={{ fill: 'rgba(236, 72, 153, 0.1)' }}
                                    />
                                    <Bar dataKey="count" fill="url(#colorBar)" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                <div className="admin-card">
                    <div className="admin-card-header">
                        <div className="admin-card-icon-wrapper orange">
                            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="admin-card-title">Top Selling Products</h2>
                            <p className="admin-card-desc">Best performers this period</p>
                        </div>
                    </div>
                    {popular.length > 0 ? (
                        <div className="admin-products-list">
                            {popular.map((p, idx) => (
                                <div key={p.id} className="admin-product-item">
                                    <div className="admin-product-left">
                                        <div className="admin-product-rank">
                                            #{idx + 1}
                                        </div>
                                        <div className="admin-product-info">
                                            <div className="admin-product-name">{p.name}</div>
                                            <div className="admin-product-units">{p.totalSold} units sold</div>
                                        </div>
                                    </div>
                                    <div className="admin-product-right">
                                        <div className="admin-product-label">Sales</div>
                                        <div className="admin-product-sales">{p.totalSold}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="admin-empty">
                            <Package className="admin-empty-icon" />
                            <p className="admin-empty-text">No product data available</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .admin-dashboard {
                    min-height: 100vh;
                    background: linear-gradient(to bottom right, #f9fafb, #f3f4f6);
                }

                .admin-container {
                    max-width: 1280px;
                    margin: 0 auto;
                    padding: 1.5rem 1rem;
                }

                @media (min-width: 640px) {
                    .admin-container {
                        padding: 2rem 1.5rem;
                    }
                }

                .admin-header {
                    margin-bottom: 1.5rem;
                }

                @media (min-width: 640px) {
                    .admin-header {
                        margin-bottom: 2rem;
                    }
                }

                .admin-title {
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: #111827;
                    margin-bottom: 0.25rem;
                }

                @media (min-width: 640px) {
                    .admin-title {
                        font-size: 2.25rem;
                    }
                }

                .admin-subtitle {
                    color: #6b7280;
                    font-size: 0.875rem;
                }

                @media (min-width: 640px) {
                    .admin-subtitle {
                        font-size: 1rem;
                    }
                }

                .admin-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                }

                @media (min-width: 768px) {
                    .admin-stats-grid {
                        gap: 1rem;
                    }
                }

                @media (min-width: 1024px) {
                    .admin-stats-grid {
                        grid-template-columns: repeat(4, 1fr);
                        gap: 1.5rem;
                        margin-bottom: 2rem;
                    }
                }

                .admin-stat-card {
                    background: white;
                    border-radius: 1rem;
                    padding: 0.875rem;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    border: 1px solid #f3f4f6;
                    transition: all 0.3s ease;
                }

                @media (min-width: 640px) {
                    .admin-stat-card {
                        padding: 1rem;
                    }
                }

                @media (min-width: 1024px) {
                    .admin-stat-card {
                        padding: 1.25rem;
                        border-radius: 1.25rem;
                    }
                }

                .admin-stat-card:hover {
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
                    transform: translateY(-2px);
                }

                .admin-stat-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    margin-bottom: 0.5rem;
                }

                @media (min-width: 1024px) {
                    .admin-stat-header {
                        margin-bottom: 1rem;
                    }
                }

                .admin-stat-icon {
                    padding: 0.5rem;
                    border-radius: 0.625rem;
                }

                @media (min-width: 1024px) {
                    .admin-stat-icon {
                        padding: 0.75rem;
                        border-radius: 0.75rem;
                    }
                }

                .admin-stat-icon.emerald {
                    background: linear-gradient(to bottom right, #10b981, #059669);
                }

                .admin-stat-icon.blue {
                    background: linear-gradient(to bottom right, #3b82f6, #2563eb);
                }

                .admin-stat-icon.purple {
                    background: linear-gradient(to bottom right, #a855f7, #9333ea);
                }

                .admin-stat-icon.pink {
                    background: linear-gradient(to bottom right, #ec4899, #db2777);
                }

                .admin-stat-trend {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                @media (min-width: 640px) {
                    .admin-stat-trend {
                        font-size: 0.875rem;
                    }
                }

                .admin-stat-trend.positive {
                    color: #059669;
                }

                .admin-stat-trend.negative {
                    color: #dc2626;
                }

                .admin-stat-title {
                    color: #6b7280;
                    font-size: 0.7rem;
                    font-weight: 500;
                    margin-bottom: 0.25rem;
                }

                @media (min-width: 640px) {
                    .admin-stat-title {
                        font-size: 0.8rem;
                    }
                }

                @media (min-width: 1024px) {
                    .admin-stat-title {
                        font-size: 0.875rem;
                    }
                }

                .admin-stat-value {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #111827;
                    line-height: 1.2;
                }

                @media (min-width: 640px) {
                    .admin-stat-value {
                        font-size: 1.25rem;
                    }
                }

                @media (min-width: 1024px) {
                    .admin-stat-value {
                        font-size: 1.5rem;
                    }
                }

                .admin-card {
                    background: white;
                    border-radius: 1rem;
                    padding: 1rem;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    border: 1px solid #f3f4f6;
                    margin-bottom: 1.5rem;
                }

                @media (min-width: 640px) {
                    .admin-card {
                        padding: 1.5rem;
                        border-radius: 1.25rem;
                        margin-bottom: 2rem;
                    }
                }

                .admin-card-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }

                @media (min-width: 640px) {
                    .admin-card-header {
                        gap: 1rem;
                        margin-bottom: 1.5rem;
                    }
                }

                .admin-card-icon-wrapper {
                    padding: 0.5rem;
                    border-radius: 0.75rem;
                    flex-shrink: 0;
                }

                .admin-card-icon-wrapper.pink {
                    background: linear-gradient(to bottom right, #ec4899, #db2777);
                }

                .admin-card-icon-wrapper.orange {
                    background: linear-gradient(to bottom right, #f97316, #ea580c);
                }

                .admin-card-title {
                    font-size: 1rem;
                    font-weight: 700;
                    color: #111827;
                    margin-bottom: 0.125rem;
                }

                @media (min-width: 640px) {
                    .admin-card-title {
                        font-size: 1.25rem;
                    }
                }

                .admin-card-desc {
                    font-size: 0.75rem;
                    color: #6b7280;
                }

                @media (min-width: 640px) {
                    .admin-card-desc {
                        font-size: 0.875rem;
                    }
                }

                .admin-chart-wrapper {
                    margin: 0 -0.5rem;
                }

                @media (min-width: 640px) {
                    .admin-chart-wrapper {
                        margin: 0;
                    }
                }

                .admin-products-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.625rem;
                }

                @media (min-width: 640px) {
                    .admin-products-list {
                        gap: 0.75rem;
                    }
                }

                .admin-product-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.875rem;
                    border-radius: 0.875rem;
                    background: linear-gradient(to right, #f9fafb, transparent);
                    transition: all 0.3s ease;
                }

                @media (min-width: 640px) {
                    .admin-product-item {
                        padding: 1rem;
                        border-radius: 1rem;
                    }
                }

                .admin-product-item:hover {
                    background: linear-gradient(to right, #fce7f3, transparent);
                }

                .admin-product-left {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    flex: 1;
                    min-width: 0;
                }

                @media (min-width: 640px) {
                    .admin-product-left {
                        gap: 1rem;
                    }
                }

                .admin-product-rank {
                    width: 2rem;
                    height: 2rem;
                    border-radius: 50%;
                    background: linear-gradient(to bottom right, #ec4899, #db2777);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 700;
                    font-size: 0.75rem;
                    flex-shrink: 0;
                }

                @media (min-width: 640px) {
                    .admin-product-rank {
                        width: 2.5rem;
                        height: 2.5rem;
                        font-size: 0.875rem;
                    }
                }

                .admin-product-info {
                    min-width: 0;
                    flex: 1;
                }

                .admin-product-name {
                    font-weight: 600;
                    color: #111827;
                    font-size: 0.875rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    transition: color 0.3s ease;
                }

                @media (min-width: 640px) {
                    .admin-product-name {
                        font-size: 1rem;
                    }
                }

                .admin-product-item:hover .admin-product-name {
                    color: #ec4899;
                }

                .admin-product-units {
                    font-size: 0.75rem;
                    color: #6b7280;
                    margin-top: 0.125rem;
                }

                @media (min-width: 640px) {
                    .admin-product-units {
                        font-size: 0.875rem;
                    }
                }

                .admin-product-right {
                    text-align: right;
                    flex-shrink: 0;
                }

                .admin-product-label {
                    font-size: 0.625rem;
                    color: #9ca3af;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 0.125rem;
                }

                @media (min-width: 640px) {
                    .admin-product-label {
                        font-size: 0.75rem;
                    }
                }

                .admin-product-sales {
                    font-size: 1rem;
                    font-weight: 700;
                    color: #ec4899;
                }

                @media (min-width: 640px) {
                    .admin-product-sales {
                        font-size: 1.125rem;
                    }
                }

                .admin-empty {
                    text-align: center;
                    padding: 2rem 1rem;
                    color: #9ca3af;
                }

                @media (min-width: 640px) {
                    .admin-empty {
                        padding: 3rem 1rem;
                    }
                }

                .admin-empty-icon {
                    width: 2.5rem;
                    height: 2.5rem;
                    margin: 0 auto 0.75rem;
                    opacity: 0.5;
                }

                @media (min-width: 640px) {
                    .admin-empty-icon {
                        width: 3rem;
                        height: 3rem;
                    }
                }

                .admin-empty-text {
                    font-size: 0.875rem;
                }

                @media (min-width: 640px) {
                    .admin-empty-text {
                        font-size: 1rem;
                    }
                }

                .admin-loading {
                    min-height: 100vh;
                    background: linear-gradient(to bottom right, #f9fafb, #f3f4f6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                }

                .admin-spinner {
                    width: 3rem;
                    height: 3rem;
                    border: 4px solid #fce7f3;
                    border-top-color: #ec4899;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }

                @media (min-width: 640px) {
                    .admin-spinner {
                        width: 4rem;
                        height: 4rem;
                    }
                }

                .admin-loading-text {
                    color: #6b7280;
                    font-weight: 500;
                    font-size: 0.875rem;
                }

                @media (min-width: 640px) {
                    .admin-loading-text {
                        font-size: 1rem;
                    }
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}