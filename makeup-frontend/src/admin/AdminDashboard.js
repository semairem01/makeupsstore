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
        <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 text-sm font-semibold ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div className="text-gray-500 text-sm font-medium mb-1">{title}</div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
                    <p className="text-gray-600">Welcome back! Here's what's happening with your store today.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total Revenue"
                        value={fmtTL(summary.sales)}
                        icon={DollarSign}
                        color="from-emerald-500 to-emerald-600"
                    />
                    <StatCard
                        title="Total Orders"
                        value={summary.orders}
                        icon={ShoppingCart}
                        color="from-blue-500 to-blue-600"
                    />
                    <StatCard
                        title="Today's Sales"
                        value={fmtTL(summary.today)}
                        icon={Calendar}
                        color="from-purple-500 to-purple-600"
                    />
                    <StatCard
                        title="Growth Rate"
                        value={`${summary.delta > 0 ? '+' : ''}${summary.delta}%`}
                        icon={TrendingUp}
                        trend={summary.delta}
                        color="from-pink-500 to-pink-600"
                    />
                </div>

                {dailyOrders.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 shadow-lg mb-8 border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600">
                                <BarChart className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Daily Orders</h2>
                                <p className="text-sm text-gray-500">Order volume over time</p>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={dailyOrders} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ec4899" stopOpacity={0.9}/>
                                        <stop offset="100%" stopColor="#db2777" stopOpacity={0.7}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                                <YAxis allowDecimals={false} stroke="#9ca3af" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    }}
                                    cursor={{ fill: 'rgba(236, 72, 153, 0.1)' }}
                                />
                                <Bar dataKey="count" fill="url(#colorBar)" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                            <Package className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Top Selling Products</h2>
                            <p className="text-sm text-gray-500">Best performers this period</p>
                        </div>
                    </div>
                    {popular.length > 0 ? (
                        <div className="space-y-3">
                            {popular.map((p, idx) => (
                                <div
                                    key={p.id}
                                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-transparent hover:from-pink-50 transition-all duration-300 group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                                            #{idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900 group-hover:text-pink-600 transition-colors">
                                                {p.name}
                                            </div>
                                            <div className="text-sm text-gray-500">{p.totalSold} units sold</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Sales</div>
                                        <div className="text-lg font-bold text-pink-600">{p.totalSold}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No product data available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}