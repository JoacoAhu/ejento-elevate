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
    const [isEjentoMode, setIsEjentoMode] = useState(false);
    const [urlParams, setUrlParams] = useState({});

    useEffect(() => {
        initializeAuth();
    }, []);

    const initializeAuth = async () => {
        try {
            setLoading(true);
            setError('');

            // Check if we're in Ejento mode by looking for URL parameters
            const params = new URLSearchParams(window.location.search);
            const location = params.get('location');
            const user = params.get('user');
            const token = params.get('token');

            const ejentoMode = !!(location && user);
            setIsEjentoMode(ejentoMode);

            if (ejentoMode) {
                await initializeEjentoAuth(location, user, token);
            } else {
                await initializeRegularAuth();
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            setError(error.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const initializeEjentoAuth = async (location, user, token) => {
        if (!location || !user) {
            throw new Error('Missing required URL parameters. This app must be accessed through Ejento.');
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
            throw new Error(result.message || 'Ejento authentication failed');
        }
    };

    const initializeRegularAuth = async () => {
        try {
            // Try to get current user (check if already logged in)
            const result = await apiRequest('/api/auth/me');

            if (result.success) {
                setTechnician(result.technician);
                setClient(result.technician.client);
                setUserRole('technician'); // Regular users are always technicians
            }
        } catch (error) {
            // Not logged in or session expired - this is fine for regular mode
            console.log('No active session found');
        }
    };

    const login = async (crmCode, password) => {
        if (isEjentoMode) {
            throw new Error('Login not available in Ejento mode');
        }

        try {
            setLoading(true);
            setError('');

            const result = await apiRequest('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ crmCode, password })
            });

            if (result.success) {
                setTechnician(result.technician);
                setClient(result.technician.client);
                setUserRole('technician');
                return result;
            } else {
                throw new Error(result.message || 'Login failed');
            }
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            if (isEjentoMode) {
                // In Ejento mode, we can't really log out - redirect to parent
                window.parent.postMessage({ action: 'logout' }, '*');
                return;
            }

            await apiRequest('/api/auth/logout', { method: 'POST' });
            setTechnician(null);
            setClient(null);
            setUserRole(null);
        } catch (error) {
            console.error('Logout error:', error);
            // Clear state even if API call fails
            setTechnician(null);
            setClient(null);
            setUserRole(null);
        }
    };

    const refreshAuth = async () => {
        await initializeAuth();
    };

    // Helper function to update technician (for password changes, etc.)
    const updateTechnician = (updates) => {
        setTechnician(prev => prev ? { ...prev, ...updates } : null);
    };

    // Role checking functions
    const isAdmin = () => userRole === 'admin';
    const isManager = () => ['admin', 'manager'].includes(userRole);
    const isTechnician = () => userRole === 'technician';
    const isAuthenticated = () => !!technician;

    // Check if user must change password (regular auth only)
    const mustChangePassword = () => {
        return !isEjentoMode && technician?.mustChangePassword;
    };

    const value = {
        // State
        technician,
        client,
        userRole,
        loading,
        error,
        isEjentoMode,
        urlParams,

        // Actions
        login,
        logout,
        refreshAuth,
        updateTechnician,

        // Computed properties
        isAdmin,
        isManager,
        isTechnician,
        isAuthenticated,
        mustChangePassword,

        // For backward compatibility
        user: technician
    };

    return (
        <UnifiedAuthContext.Provider value={value}>
            {children}
        </UnifiedAuthContext.Provider>
    );
};

export default UnifiedAuthProvider;