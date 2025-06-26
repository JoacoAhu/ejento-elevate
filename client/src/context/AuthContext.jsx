// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

            const response = await fetch('http://localhost:8000/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                setTechnician(result.technician);
            } else {
                // Token is invalid, clear it
                localStorage.removeItem('authToken');
                localStorage.removeItem('technician');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('technician');
        } finally {
            setLoading(false);
        }
    };

    const login = async (crmCode, password) => {
        try {
            const response = await fetch('http://localhost:8000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ crmCode, password })
            });

            const result = await response.json();

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
            return { success: false, message: 'Connection error. Please try again.' };
        }
    };

    const logout = async () => {
        try {
            await fetch('http://localhost:8000/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
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
            const token = localStorage.getItem('authToken');
            const response = await fetch('http://localhost:8000/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const result = await response.json();

            if (result.success) {
                // Update technician state
                updateTechnician({ mustChangePassword: false });
                return { success: true };
            } else {
                return { success: false, message: result.message };
            }
        } catch (error) {
            console.error('Change password error:', error);
            return { success: false, message: 'Connection error. Please try again.' };
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