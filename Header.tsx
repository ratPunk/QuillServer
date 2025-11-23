import { Link, NavLink, useLocation } from "react-router-dom";
import "@styles/css/modulesCss/header.css";
import { getUserFromCookies } from "../utils/cookies";
import { useEffect, useState } from "react";
import { FaUser } from "react-icons/fa";
import type { User } from "../typescript/user";
import { RiQuillPenAiLine } from "react-icons/ri";
import { HiMenu, HiX } from "react-icons/hi";

function Header() {
    const [userCookies, setUserCookies] = useState<User | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const user = getUserFromCookies();
        if (user != null) {
            setUserCookies(user);
        }
    }, []);

    // Закрываем мобильное меню при смене роута
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    // Функция для проверки активного пути
    const isActive = (path: string) => {
        return location.pathname === path;
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    return (
        <div id={"Header"}>
            <div className={"header-container"}>
                <div className="header-main">
                    <div className={"logo"}>
                        <RiQuillPenAiLine className="logo-icon"/>
                        <span>Quill Writer</span>
                    </div>

                    {/* Десктопная навигация */}
                    <nav className={"header-nav desktop-nav"}>
                        <div className={"nav-list"}>
                            <NavLink 
                                to="/" 
                                className={({ isActive }) => 
                                    `link ${isActive ? 'active' : ''}`
                                }
                            >
                                Главная
                            </NavLink> |
                            
                            <Link 
                                to="/library" 
                                className={`link ${isActive('/library') ? 'active' : ''}`}
                            >
                                Библиотека
                            </Link> |
                            
                            <Link 
                                to="#" 
                                className={`link ${isActive('/my-books') ? 'active' : ''}`}
                            >
                                Мои книги
                            </Link> |
                        </div>
                        {userCookies != null ? (
                            <div className={"authorization-nav"}>
                                <Link 
                                    to="/profile" 
                                    className={`link ${isActive('/profile') ? 'active' : ''}`}
                                >
                                    <FaUser/> {userCookies?.username}
                                </Link>
                            </div>
                        ) : (
                            <div className={"authorization-nav"}>
                                <Link 
                                    to="/authorization" 
                                    className={`link ${isActive('/authorization') ? 'active' : ''}`}
                                >
                                    Вход/Регистрация
                                </Link>
                            </div>
                        )}
                    </nav>

                    {/* Кнопка бургер-меню для мобильных */}
                    <button 
                        className="mobile-menu-toggle"
                        onClick={toggleMobileMenu}
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? <HiX /> : <HiMenu />}
                    </button>
                </div>

                {/* Мобильная навигация */}
                <div className={`mobile-nav ${isMobileMenuOpen ? 'mobile-nav--open' : ''}`}>
                    <nav className="mobile-nav-content">
                        <div className="mobile-nav-list">
                            <NavLink 
                                to="/" 
                                className={({ isActive }) => 
                                    `mobile-link ${isActive ? 'mobile-link--active' : ''}`
                                }
                            >
                                Главная
                            </NavLink>
                            
                            <Link 
                                to="/library" 
                                className={`mobile-link ${isActive('/library') ? 'mobile-link--active' : ''}`}
                            >
                                Библиотека
                            </Link>
                            
                            <Link 
                                to="#" 
                                className={`mobile-link ${isActive('/my-books') ? 'mobile-link--active' : ''}`}
                            >
                                Мои книги
                            </Link>

                            {userCookies != null ? (
                                <Link 
                                    to="/profile" 
                                    className={`mobile-link ${isActive('/profile') ? 'mobile-link--active' : ''}`}
                                >
                                    <FaUser/> {userCookies?.username}
                                </Link>
                            ) : (
                                <Link 
                                    to="/authorization" 
                                    className={`mobile-link ${isActive('/authorization') ? 'mobile-link--active' : ''}`}
                                >
                                    Вход/Регистрация
                                </Link>
                            )}
                        </div>
                    </nav>
                </div>
            </div>
        </div>
    );
}

export default Header;