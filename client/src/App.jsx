import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnifiedAuthProvider, useAuth } from './context/UnifiedAuthContext.jsx';
import Dashboard from './pages/Dashboard';
import PromptPlayground from "./components/promptPlayground/PromptPlayground.jsx";
import './App.css';
import './styles/main.scss';
import LoadingSpinner from "./components/LoadingSpinner/LoadingSpinner.jsx";
import ChangePassword from "./components/ChangePassword/ChangePassword.jsx";
import Login from "./components/Login/Login.jsx";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { technician, loading, isEjentoMode, error } = useAuth();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error && isEjentoMode) {
        return (
            <div className="error-page">
                <div className="error-content">
                    <h2>Authentication Error</h2>
                    <p>{error}</p>
                    <p>Please make sure you're accessing this through Ejento with valid parameters.</p>
                </div>
            </div>
        );
    }

    if (!technician) {
        if (isEjentoMode) {
            return (
                <div className="error-page">
                    <div className="error-content">
                        <h2>Access Denied</h2>
                        <p>Unable to authenticate through Ejento.</p>
                    </div>
                </div>
            );
        }
        return <Navigate to="/login" replace />;
    }

    if (technician.mustChangePassword && !isEjentoMode) {
        return <Navigate to="/change-password" replace />;
    }

    return children;
};

// Public Route Component (redirects to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
    const { technician, loading, isEjentoMode, mustChangePassword } = useAuth();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (isEjentoMode) {
        return <Navigate to="/" replace />;
    }

    if (technician && !mustChangePassword()) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

// Change Password Route
const ChangePasswordRoute = () => {
    const { technician, loading, isEjentoMode, updateTechnician } = useAuth();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (isEjentoMode) {
        return <Navigate to="/" replace />;
    }

    if (!technician) {
        return <Navigate to="/login" replace />;
    }

    const handlePasswordChanged = () => {
        if (technician.mustChangePassword) {
            updateTechnician({ mustChangePassword: false });
        }

        window.location.href = '/dashboard';
    };

    const handleCancel = () => {
        if (!technician.mustChangePassword) {
            window.location.href = '/dashboard';
        }
    };

    return (
        <ChangePassword
            onPasswordChanged={handlePasswordChanged}
            onCancel={!technician.mustChangePassword ? handleCancel : null}
            isFirstTime={technician.isFirstLogin}
        />
    );
};

// App Content with Routes
const AppContent = () => {
    const { isEjentoMode } = useAuth();
    return (
        <div className="app">
            <Routes>
                {/* Public Routes - Only in regular mode */}
                {!isEjentoMode && (
                    <Route
                        path="/login"
                        element={
                            <PublicRoute>
                                <Login />
                            </PublicRoute>
                        }
                    />
                )}

                {/* Change Password Route - Only in regular mode */}
                {!isEjentoMode && (
                    <Route
                        path="/change-password"
                        element={<ChangePasswordRoute />}
                    />
                )}

                {/* Protected Routes */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/prompts"
                    element={
                        <ProtectedRoute>
                            <PromptPlayground />
                        </ProtectedRoute>
                    }
                />

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
};

// Main App Component
function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <UnifiedAuthProvider>
                <Router>
                    <AppContent />
                </Router>
            </UnifiedAuthProvider>
        </QueryClientProvider>
    );
}

export default App;