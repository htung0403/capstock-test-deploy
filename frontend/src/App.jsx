/*
  File: frontend/src/App.jsx
  Purpose: Main application component, sets up routing, context providers, and global layout.
  
  CHANGES (2025-10-20):
  - Added a new route for the `/chatbot` page, protected by `ProtectedRoute`.
*/
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider } from "./contexts/I18nContext";
import { ToastProvider } from "./components/Toast";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import StockDetail from "./pages/StockDetail";
import Payment from "./pages/Payment";
import Profile from "./pages/Profile";
import Orders from "./pages/Orders";
import AIChatPage from "./pages/AIChatPage"; 
import NewArticlePage from "./pages/NewArticlePage"; // Import new article page
import EditArticlePage from "./pages/EditArticlePage"; // Import edit article page
import WriterDashboard from "./pages/WriterDashboard"; // Import writer dashboard page
import EditorDashboard from "./pages/EditorDashboard"; // Import editor dashboard page
import ReviewArticlePage from "./pages/ReviewArticlePage"; // Import review article page
import NewsPage from "./pages/NewsPage"; // Import NewsPage
import ArticleDetailPage from "./pages/ArticleDetailPage"; // Import ArticleDetailPage
import MarketHeatmapPage from "./pages/MarketHeatmapPage"; // Import MarketHeatmapPage
import PortfolioAnalyticsPage from "./pages/PortfolioAnalyticsPage"; // Import PortfolioAnalyticsPage
import UserManagementPage from "./pages/UserManagementPage"; // Import UserManagementPage
import ForgotPasswordPage from "./pages/ForgotPasswordPage"; // Import ForgotPasswordPage
import ResetPasswordPage from "./pages/ResetPasswordPage"; // Import ResetPasswordPage

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <Router>
              <Navbar />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                {/* Protected Routes */}
                <Route  
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/stocks/:symbol"
                  element={
                    <ProtectedRoute>
                      <StockDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chatbot"
                  element={
                    <ProtectedRoute>
                      <AIChatPage />
                    </ProtectedRoute>
                  }
                />
                {/* Writer Routes */}
                <Route
                  path="/writer/new-article"
                  element={
                    <ProtectedRoute>
                      <NewArticlePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/writer/edit-article/:id"
                  element={
                    <ProtectedRoute>
                      <EditArticlePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/writer/dashboard"
                  element={
                    <ProtectedRoute>
                      <WriterDashboard />
                    </ProtectedRoute>
                  }
                />
                {/* Editor Routes */}
                <Route
                  path="/editor/dashboard"
                  element={
                    <ProtectedRoute>
                      <EditorDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/editor/review-article/:id"
                  element={
                    <ProtectedRoute>
                      <ReviewArticlePage />
                    </ProtectedRoute>
                  }
                />

                {/* News Page Route */}
                <Route
                  path="/news"
                  element={
                    <ProtectedRoute>
                      <NewsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Article Detail Page Route */}
                <Route
                  path="/news/:id"
                  element={
                    <ProtectedRoute>
                      <ArticleDetailPage />
                    </ProtectedRoute>
                  }
                />

                {/* Market Heatmap Page Route */}
                <Route
                  path="/market-heatmap"
                  element={
                    <ProtectedRoute>
                      <MarketHeatmapPage />
                    </ProtectedRoute>
                  }
                />

                {/* Portfolio Analytics Page Route */}
                <Route
                  path="/portfolio-analytics"
                  element={
                    <ProtectedRoute>
                      <PortfolioAnalyticsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute requireAdmin>
                      <UserManagementPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route
                  path="/payments"
                  element={
                    <ProtectedRoute>
                      <Payment />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      <Orders />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
