// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [technician, setTechnician] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check if user is authenticated on app load
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                setLoading(false);
                return;
            }

            // Use the API utility instead of raw fetch
            const result = await authAPI.getMe();
            setTechnician(result.technician);
        } catch (error) {
            console.error('Auth check failed:', error);
            // Clear invalid auth data
            localStorage.removeItem('authToken');
            localStorage.removeItem('technician');
            setTechnician(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (crmCode, password) => {
        try {
            const result = await authAPI.login(crmCode, password);

            if (result.success) {
                if (result.firstLogin) {
                    // Return the temporary password for display
                    return {
                        success: true,
                        firstLogin: true,
                        temporaryPassword: result.temporaryPassword
                    };
                } else {
                    // Normal login success
                    setTechnician(result.technician);
                    localStorage.setItem('authToken', result.token);
                    localStorage.setItem('technician', JSON.stringify(result.technician));
                    return { success: true };
                }
            } else {
                return { success: false, message: result.message };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: error.message || 'Connection error. Please try again.' };
        }
    };

    const logout = async () => {
        try {
            await authAPI.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setTechnician(null);
            localStorage.removeItem('authToken');
            localStorage.removeItem('technician');
        }
    };

    const updateTechnician = (updatedData) => {
        const updated = { ...technician, ...updatedData };
        setTechnician(updated);
        localStorage.setItem('technician', JSON.stringify(updated));
    };

    const changePassword = async (currentPassword, newPassword) => {
        try {
            const result = await authAPI.changePassword(currentPassword, newPassword);

            if (result.success) {
                // Update technician state
                updateTechnician({ mustChangePassword: false });
                return { success: true };
            } else {
                return { success: false, message: result.message };
            }
        } catch (error) {
            console.error('Change password error:', error);
            return { success: false, message: error.message || 'Connection error. Please try again.' };
        }
    };

    const value = {
        technician,
        loading,
        login,
        logout,
        updateTechnician,
        changePassword,
        checkAuth
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};