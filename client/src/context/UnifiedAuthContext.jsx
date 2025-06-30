// src/context/UnifiedAuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const UnifiedAuthContext = createContext();

export const useAuth = () => {
    const context = useContext(UnifiedAuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an UnifiedAuthProvider');
    }
    return context;
};

// API helper
const apiRequest = async (url, options = {}) => {
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };

    const response = await fetch(url, {
        ...defaultOptions,
        ...options
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
};

export const UnifiedAuthProvider = ({ children }) => {
    const [technician, setTechnician] = useState(null);
    const [client, setClient] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [urlParams, setUrlParams] = useState({});

    useEffect(() => {
        initializeAuth();
    }, []);

    const initializeAuth = async () => {
        try {
            setLoading(true);
            setError('');

            // Check for required URL parameters
            const params = new URLSearchParams(window.location.search);
            const location = params.get('location');
            const user = params.get('user');
            const token = params.get('token');

            if (!location || !user) {
                throw new Error('This application requires location and user parameters. Please access through Ejento.');
            }

            setUrlParams({ location, user, token });

            // Verify authentication with backend
            const queryString = `location=${location}&user=${user}${token ? `&token=${token}` : ''}`;
            const result = await apiRequest(`/api/auth/verify-ejento?${queryString}`);

            if (result.success) {
                setTechnician(result.data.technician);
                setClient(result.data.client);
                setUserRole(result.data.userRole);
            } else {
                throw new Error(result.message || 'Authentication failed');
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            setError(error.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        // In Ejento mode, communicate with parent window
        window.parent.postMessage({ action: 'logout' }, '*');
    };

    const refreshAuth = async () => {
        await initializeAuth();
    };

    // Role checking functions
    const isAdmin = () => userRole === 'admin';
    const isManager = () => ['admin', 'manager'].includes(userRole);
    const isTechnician = () => userRole === 'technician';
    const isAuthenticated = () => !!technician;

    const value = {
        // State
        technician,
        client,
        userRole,
        loading,
        error,
        urlParams,

        // Actions
        logout,
        refreshAuth,

        // Computed properties
        isAdmin,
        isManager,
        isTechnician,
        isAuthenticated,

        // For backward compatibility
        user: technician,
        isEjentoMode: true // Always true now
    };

    return (
        <UnifiedAuthContext.Provider value={value}>
            {children}
        </UnifiedAuthContext.Provider>
    );
};

export default UnifiedAuthProvider;