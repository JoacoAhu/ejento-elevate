import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnifiedAuthProvider, useAuth } from './context/UnifiedAuthContext.jsx';
import Dashboard from './pages/Dashboard';
import PromptPlayground from "./components/promptPlayground/PromptPlayground.jsx";
import ChangePassword from "./components/changePassword/ChangePassword.jsx";
import './App.css';
import './styles/main.scss';
import LoadingSpinner from "./components/LoadingSpinner/LoadingSpinner.jsx";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { technician, loading, error } = useAuth();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return (
            <div className="error-page">
                <div className="error-content">
                    <h2>Authentication Error</h2>
                    <p>{error}</p>
                    <p>Please make sure you're accessing this through Ejento with valid parameters.</p>
                    <div className="error-details">
                        <p><strong>Required URL format:</strong></p>
                        <code>?location=YOUR_LOCATION_ID&user=YOUR_USER_ID</code>
                    </div>
                </div>
            </div>
        );
    }

    if (!technician) {
        return (
            <div className="error-page">
                <div className="error-content">
                    <h2>Access Denied</h2>
                    <p>Unable to authenticate. Please check your access parameters.</p>
                </div>
            </div>
        );
    }

    return children;
};

// App Content with Routes
const AppContent = () => {
    return (
        <div className="app">
            <Routes>
                {/* Main Dashboard Route */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Dashboard Route */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Change Password Route */}
                <Route
                    path="/change-password"
                    element={
                        <ProtectedRoute>
                            <ChangePassword />
                        </ProtectedRoute>
                    }
                />

                {/* Admin Prompts Route */}
                <Route
                    path="/admin/prompts"
                    element={
                        <ProtectedRoute>
                            <PromptPlayground />
                        </ProtectedRoute>
                    }
                />

                {/* Catch all route - redirect to dashboard */}
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