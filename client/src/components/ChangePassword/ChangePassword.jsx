import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lock,
    Eye,
    EyeOff,
    Save,
    ArrowLeft,
    AlertCircle,
    CheckCircle,
    Key
} from 'lucide-react';
import './ChangePassword.scss';
import {useAuth} from "../../context/AuthContext.jsx";

const ChangePassword = ({ onPasswordChanged, onCancel, isFirstTime = false }) => {
    const { technician, updateTechnician } = useAuth();
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError(''); // Clear error when user types
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const validateForm = () => {
        if (!technician.isFirstLogin && !formData.currentPassword) {
            return 'Current password is required';
        }

        if (!formData.newPassword) {
            return 'New password is required';
        }

        if (formData.newPassword.length < 6) {
            return 'New password must be at least 6 characters long';
        }

        if (formData.newPassword !== formData.confirmPassword) {
            return 'New passwords do not match';
        }

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('http://localhost:8000/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword
                })
            });

            const result = await response.json();

            if (result.success) {
                setSuccess(true);
                // Update technician state to reflect password change
                updateTechnician({ mustChangePassword: false });

                // Redirect after a short delay
                setTimeout(() => {
                    onPasswordChanged();
                }, 2000);
            } else {
                setError(result.message || 'Failed to change password');
            }
        } catch (error) {
            console.error('Change password error:', error);
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="change-password">
                <div className="change-password__container">
                    <motion.div
                        className="change-password__card change-password__card--success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="change-password__success">
                            <div className="change-password__success-icon">
                                <CheckCircle size={48} />
                            </div>
                            <h2>Password Changed Successfully!</h2>
                            <p>Your password has been updated. Redirecting to dashboard...</p>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="change-password">
            <div className="change-password__container">
                <motion.div
                    className="change-password__card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="change-password__header">
                        <div className="change-password__icon">
                            <Key size={24} />
                        </div>
                        <h1>
                            {technician?.mustChangePassword ? 'Change Required' : 'Change Password'}
                        </h1>
                        <p>
                            {technician?.mustChangePassword
                                ? 'You must change your password before continuing.'
                                : 'Update your password to keep your account secure.'
                            }
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="change-password__form">
                        {!technician?.isFirstLogin && (
                            <div className="change-password__field">
                                <label className="change-password__label">Current Password</label>
                                <div className="change-password__input-wrapper">
                                    <Lock className="change-password__input-icon" size={18} />
                                    <input
                                        type={showPasswords.current ? 'text' : 'password'}
                                        name="currentPassword"
                                        value={formData.currentPassword}
                                        onChange={handleInputChange}
                                        className="change-password__input"
                                        placeholder="Enter current password"
                                        disabled={loading}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility('current')}
                                        className="change-password__toggle-password"
                                        disabled={loading}
                                    >
                                        {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="change-password__field">
                            <label className="change-password__label">New Password</label>
                            <div className="change-password__input-wrapper">
                                <Lock className="change-password__input-icon" size={18} />
                                <input
                                    type={showPasswords.new ? 'text' : 'password'}
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleInputChange}
                                    className="change-password__input"
                                    placeholder="Enter new password"
                                    disabled={loading}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility('new')}
                                    className="change-password__toggle-password"
                                    disabled={loading}
                                >
                                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div className="change-password__hint">
                                Password must be at least 6 characters long
                            </div>
                        </div>

                        <div className="change-password__field">
                            <label className="change-password__label">Confirm New Password</label>
                            <div className="change-password__input-wrapper">
                                <Lock className="change-password__input-icon" size={18} />
                                <input
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    className="change-password__input"
                                    placeholder="Confirm new password"
                                    disabled={loading}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility('confirm')}
                                    className="change-password__toggle-password"
                                    disabled={loading}
                                >
                                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    className="change-password__error"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="change-password__actions">
                            <button
                                type="submit"
                                className="change-password__button change-password__button--primary"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <div className="change-password__spinner"></div>
                                        Changing Password...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Change Password
                                    </>
                                )}
                            </button>

                            {onCancel && !technician?.mustChangePassword && (
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="change-password__button change-password__button--secondary"
                                    disabled={loading}
                                >
                                    <ArrowLeft size={18} />
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

export default ChangePassword;