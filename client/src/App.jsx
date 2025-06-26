import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
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
    const { technician, loading } = useAuth();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!technician) {
        return <Navigate to="/login" replace />;
    }

    // If user must change password, redirect to change password page
    if (technician.mustChangePassword) {
        return <Navigate to="/change-password" replace />;
    }

    return children;
};

// Public Route Component (redirects to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
    const { technician, loading } = useAuth();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (technician && !technician.mustChangePassword) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

// Change Password Route (only accessible if user must change password)
const ChangePasswordRoute = () => {
    const { technician, loading, updateTechnician } = useAuth();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!technician) {
        return <Navigate to="/login" replace />;
    }

    if (!technician.mustChangePassword) {
        return <Navigate to="/dashboard" replace />;
    }

    const handlePasswordChanged = () => {
        // Update the technician state to reflect password change
        updateTechnician({ mustChangePassword: false });
        // The ProtectedRoute will automatically redirect to dashboard
    };

    return (
        <ChangePassword
            onPasswordChanged={handlePasswordChanged}
            isFirstTime={technician.isFirstLogin}
        />
    );
};

// App Content with Routes
const AppContent = () => {
    return (
        <div className="app">
            <Routes>
                {/* Public Routes */}
                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    }
                />

                {/* Change Password Route */}
                <Route
                    path="/change-password"
                    element={<ChangePasswordRoute />}
                />

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

                {/* Catch all route - redirect to dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </div>
    );
};

// Main App Component
function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <Router>
                    <AppContent />
                </Router>
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App;