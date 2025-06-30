import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    User,
    Lock,
    Eye,
    EyeOff,
    LogIn,
    AlertCircle,
    CheckCircle,
    Key
} from 'lucide-react';
import { useAuth } from '../../context/UnifiedAuthContext.jsx';
import './Login.scss';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        crmCode: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [firstLogin, setFirstLogin] = useState(false);
    const [temporaryPassword, setTemporaryPassword] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'crmCode' ? value.toUpperCase() : value // Auto-uppercase CRM code
        }));
        setError(''); // Clear error when user types
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.crmCode || !formData.password) {
            setError('Please enter both CRM code and password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await login(formData.crmCode, formData.password);

            if (result.success) {
                if (result.firstLogin) {
                    setFirstLogin(true);
                    setTemporaryPassword(result.temporaryPassword);
                } else {
                    // Successful login - navigate to dashboard
                    navigate('/dashboard');
                }
            } else {
                setError(result.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleFirstLoginContinue = async () => {
        setFormData(prev => ({
            ...prev,
            password: temporaryPassword
        }));
        setFirstLogin(false);
        setTemporaryPassword('');

        // Auto-submit with temporary password
        setLoading(true);
        try {
            const result = await login(formData.crmCode, temporaryPassword);
            if (result.success) {
                navigate('/change-password');
            } else {
                setError(result.message || 'Login failed');
            }
        } catch (error) {
            console.error('Auto-login error:', error);
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (firstLogin) {
        return (
            <div className="login">
                <div className="login__container">
                    <motion.div
                        className="login__card login__card--first-login"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="login__header">
                            <div className="login__icon login__icon--success">
                                <Key size={24} />
                            </div>
                            <h1>First Login Detected</h1>
                            <p>A temporary password has been generated for your account.</p>
                        </div>

                        <div className="login__temp-password">
                            <div className="login__temp-password-label">Your temporary password:</div>
                            <div className="login__temp-password-value">{temporaryPassword}</div>
                            <div className="login__temp-password-note">
                                Please save this password. You'll be asked to change it after logging in.
                            </div>
                        </div>

                        <button
                            onClick={handleFirstLoginContinue}
                            className="login__button login__button--continue"
                            disabled={loading}
                        >
                            {loading ? 'Logging in...' : 'Continue to Login'}
                        </button>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="login">
            <div className="login__container">
                <motion.div
                    className="login__card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="login__header">
                        <div className="login__icon">
                            <User size={24} />
                        </div>
                        <h1>Technician Login</h1>
                        <p>Enter your CRM code and password to access your dashboard</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login__form">
                        <div className="login__field">
                            <label className="login__label">CRM Code</label>
                            <div className="login__input-wrapper">
                                <User className="login__input-icon" size={18} />
                                <input
                                    type="text"
                                    name="crmCode"
                                    value={formData.crmCode}
                                    onChange={handleInputChange}
                                    className="login__input"
                                    placeholder="Enter your CRM code"
                                    disabled={loading}
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="login__field">
                            <label className="login__label">Password</label>
                            <div className="login__input-wrapper">
                                <Lock className="login__input-icon" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="login__input"
                                    placeholder="Enter your password"
                                    disabled={loading}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="login__toggle-password"
                                    disabled={loading}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    className="login__error"
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

                        <button
                            type="submit"
                            className="login__button"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="login__spinner"></div>
                                    Signing In...
                                </>
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login__footer">
                        <p>Don't have a password? Contact your administrator.</p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;