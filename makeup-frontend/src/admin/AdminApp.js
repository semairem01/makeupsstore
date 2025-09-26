// src/admin/AdminApp.jsx
import { Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./AdminDashboard";
import OrdersAdmin from "./OrdersAdmin";
import ProductsAdmin from "./ProductsAdmin";
import CategoriesAdmin from "./CategoriesAdmin";
import ReviewsAdmin from "./ReviewsAdmin";
import "./Admin.css";

export default function AdminApp(){
    return (
        <div className="admin-wrap">
            <aside className="admin-aside">
                <h3>İşletme Paneli</h3>
                <nav>
                    <NavLink to="" end>Özet</NavLink>
                    <NavLink to="orders">Siparişler</NavLink>
                    <NavLink to="products">Ürünler</NavLink>
                    <NavLink to="categories">Kategoriler</NavLink>
                    <NavLink to="reviews">Yorumlar</NavLink>
                    <NavLink to="users">Kullanıcılar</NavLink>
                </nav>
            </aside>
            <main className="admin-main">
                <Routes>
                    <Route index element={<Dashboard />} />
                    <Route path="orders" element={<OrdersAdmin />} />
                    <Route path="products" element={<ProductsAdmin />} />
                    <Route path="categories" element={<CategoriesAdmin />} />
                    <Route path="reviews" element={<ReviewsAdmin />} />
                </Routes>
            </main>
        </div>
    );
}
