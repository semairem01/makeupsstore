// src/admin/AdminApp.jsx
import { Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./AdminDashboard";
import OrdersAdmin from "./OrdersAdmin";
import ProductsAdmin from "./ProductsAdmin";
import CategoriesAdmin from "./CategoriesAdmin";
import ReviewsAdmin from "./ReviewsAdmin";
import "./Admin.css";
import ReturnsAdmin from "./ReturnsAdmin";
import AdminQuestionsManager from "./AdminQuestionsManager";
export default function AdminApp(){
    return (
        <div className="admin-wrap">
            <aside className="admin-aside">
                <h3></h3>
                <nav>
                    <NavLink to="" end>Summary</NavLink>
                    <NavLink to="orders">Orders</NavLink>
                    <NavLink to="/admin/returns">Returns</NavLink>
                    <NavLink to="products">Products</NavLink>
                    <NavLink to="categories">Categories</NavLink>
                    <NavLink to="reviews">Reviews</NavLink>
                    <NavLink to="users">Users</NavLink>
                    <NavLink to="questions">Questions</NavLink>
                </nav>
            </aside>
            <main className="admin-main">
                <Routes>
                    <Route index element={<Dashboard />} />
                    <Route path="orders" element={<OrdersAdmin />} />
                    <Route path="products" element={<ProductsAdmin />} />
                    <Route path="categories" element={<CategoriesAdmin />} />
                    <Route path="reviews" element={<ReviewsAdmin />} />
                    <Route path="returns" element={<ReturnsAdmin />} />
                    <Route path="questions" element={<AdminQuestionsManager />} />
                </Routes>
            </main>
        </div>
    );
}
