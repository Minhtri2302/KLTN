import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/header';
import Footer from './components/footer';

import Home from './page/User/home';
import CartPage from './page/User/cart';
import ProductDetail from './components/productdetail';
import Chat from './components/UserChat';
import NewsList from './page/User/newsList';
import NewsDetail from './page/User/newsDetail';
import SearchResults from './page/User/search';
import CheckoutPage from './page/User/checkout';
import ContactPage from './page/User/contact';
import Login from './page/User/login';
import Register from './page/User/singup';

import ProfileInfo from './page/User/ProfileInfo';
import ChangePassword from './page/User/ChangePassword';
import AddressManagement from './page/User/AddressManagement';
import OrderHistory from './page/User/OrderHistory';
import Admin from './page/Admin/Admin';
import ProductManagement from './page/Admin/ProductManagement';
import CategoryManagement from './page/Admin/CategoryManagement';
import BannerManagement from './page/Admin/BannerManagement';
import OrderManagement from './page/Admin/OrderManagement';
import AccountManagement from './page/Admin/AccountManagement';
import ContactManagement from './page/Admin/ContactManagement';
import ProfileManagement from './page/Admin/ProfileManagement';
import ReviewManagement from './page/Admin/ReviewManagement';
import NewsManagement from './page/Admin/NewsManagement';
import Statistics from './page/Admin/Statistics';
import './App.css';
// import './CSS/product.css';
// import './CSS/admin.css'
import CategoryPage from './page/User/product';
import ReturnPolicy from './page/User/returnPolicy';
import AdminChat from './components/AdminChat';

function App() {
  const [authUser, setAuthUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem('user');
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.role === 'admin') return null;
      return parsed;
    } catch (err) { return null; }
  });

  const handleAuth = (user) => {
    if (user && user.role === 'admin') {
      setAuthUser(null);
    } else {
      setAuthUser(user);
    }
  };
  const handleLogout = () => setAuthUser(null);
  const token = sessionStorage.getItem('token');

  const Inner = () => {
    const location = useLocation();
    const isAdminPath = location.pathname && location.pathname.startsWith('/admin');
    const isChatPath = location.pathname && location.pathname.startsWith('/chat');
    const isAuthPath = location.pathname === '/login' || location.pathname === '/register';
    return (
      <>
        {!isAdminPath && !isAuthPath && <Header authUserProp={authUser} onLogout={handleLogout} />}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/category/:categoryId" element={<CategoryPage />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/news" element={<NewsList />} />
          <Route path="/news/:id" element={<NewsDetail />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/login" element={<Login onAuth={handleAuth} />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profileinfo" element={<ProfileInfo />} />
          <Route path="/profile-info" element={<ProfileInfo />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/addresses" element={<AddressManagement />} />
          <Route path="/orders" element={<OrderHistory />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          
          <Route path="/cart" element={<CartPage />} />
          <Route path="/admin/chat" element={<AdminChat fullScreen token={token} />} />
          <Route path="/policy" element={<ReturnPolicy />} />
          <Route path="/admin/*" element={<Admin onLogout={handleLogout} />}>
            <Route index element={<CategoryManagement token={token} />} />
            <Route path="products" element={<ProductManagement token={token} />} />
            <Route path="categories" element={<CategoryManagement token={token} />} />
            <Route path="banners" element={<BannerManagement token={token} />} />
            <Route path="news" element={<NewsManagement token={token} />} />
            <Route path="orders" element={<OrderManagement token={token} />} />
            <Route path="users" element={<AccountManagement token={token} />} />
            <Route path="profiles" element={<ProfileManagement token={token} />} />
            <Route path="contacts" element={<ContactManagement token={token} />} />
            <Route path="reviews" element={<ReviewManagement token={token} />} />
            <Route path="statistics" element={<Statistics />} />
           
          </Route>
        </Routes>
        {/* Show floating chat box on all non-admin pages except the dedicated /chat page and auth pages */}
        {!isAdminPath && !isChatPath && !isAuthPath && <Chat />}
        {!isAdminPath && !isAuthPath && <Footer />}
      </>
    );
  };

  return (
    <Router>
      <Inner />
    </Router>
  );
}

export default App;
