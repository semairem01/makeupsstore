import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config";
import { Link } from "react-router-dom";
import "./CategoryMenu.css";

function CategoryMenu() {
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        axios.get(API_ENDPOINTS.CATEGORIES)
            .then(res => setCategories(res.data))
            .catch(err => console.error("Kategori hatası:", err));
    }, []);

    return (
        <nav className="category-navbar">
            <ul className="category-menu">
                {categories.map(cat => (
                    <li key={cat.id} className="category-item">
                        <span>{cat.name}</span>
                        {cat.subCategories?.length > 0 && (
                            <ul
                                className="subcategory-menu"
                                style={{
                                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1), rgba(255,255,255,0.1)), url(${process.env.PUBLIC_URL}/images/menu.jpg)`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "fixed",
                                    backgroundRepeat: "no-repeat",
                                    backgroundColor: "rgba(255, 182, 185, 0.7)"
                                }}
                            >
                                {cat.subCategories.map(sub => (
                                    <li key={sub.id}>
                                        <Link to={`/category/${sub.id}`}>{sub.name}</Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>
        </nav>
    );
}

export default CategoryMenu;