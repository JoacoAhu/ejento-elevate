// Replace the entire PromptPlayground component with this working version:

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Edit3, Save, TestTube, FileText, Zap, Eye, EyeOff, Clock, User, Star,
    MessageSquare, Sparkles, CheckCircle, Plus, ArrowLeft, Home, AlertCircle, Copy, Check
} from 'lucide-react';
import { useAuth } from '../../context/UnifiedAuthContext.jsx';
import './PromptPlayground.scss';

const PromptPlayground = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { urlParams, technician, userRole } = useAuth();

    // Debug authentication
    useEffect(() => {
        console.log('🔍 DEBUG Auth:', { urlParams, technician, userRole });
    }, [urlParams, technician, userRole]);

    // State management
    const [activeTab, setActiveTab] = useState('prompts');
    const [prompts, setPrompts] = useState([]);
    const [selectedPrompt, setSelectedPrompt] = useState(null);
    const [editingPrompt, setEditingPrompt] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [testResults, setTestResults] = useState(null);
    const [selectedReview, setSelectedReview] = useState(null);
    const [selectedTechnician, setSelectedTechnician] = useState({
        name: 'Mike Johnson',
        persona: {
            communicationStyle: 'friendly and professional',
            personality: 'detail-oriented and helpful',
            traits: ['reliable', 'thorough', 'communicative']
        }
    });
    const [sampleReviews, setSampleReviews] = useState([]);
    const [responsePrompt, setResponsePrompt] = useState('');
    const [showVariables, setShowVariables] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newPrompt, setNewPrompt] = useState({
        name: '', type: 'response_generation', content: '', description: ''
    });

    // Helper functions
    const canEditPrompt = (prompt) => {
        if (userRole === 'admin' || userRole === 'manager') return true;
        if (userRole === 'technician') return prompt.createdBy === technician?.name;
        return false;
    };

    const isSystemPrompt = (prompt) => ['system', 'admin', 'System Administrator'].includes(prompt.createdBy);
    const getTechnicianDisplayName = (tech) => tech?.name || tech?.firstName || 'Unknown Technician';

    const buildUrlWithParams = (path) => {
        const searchParams = new URLSearchParams();
        if (urlParams.location) searchParams.set('location', urlParams.location);
        if (urlParams.user) searchParams.set('user', urlParams.user);
        if (urlParams.token) searchParams.set('token', urlParams.token);
        const queryString = searchParams.toString();
        return queryString ? `${path}?${queryString}` : path;
    };

    const handleReturnToMain = () => {
        const dashboardUrl = buildUrlWithParams('/dashboard');
        navigate(dashboardUrl);
    };

    // API Functions - Using original endpoints with role-based frontend logic
    const fetchPrompts = async () => {
        try {
            console.log('📝 Fetching prompts...');
            const response = await fetch('http://localhost:8000/api/prompts?type=response_generation');
            const result = await response.json();
            console.log('📝 Prompts result:', result);

            if (result.success) {
                // Apply client-side filtering based on role
                let filteredPrompts = result.data;

                if (userRole === 'technician' && technician?.name) {
                    // Filter to show only user's prompts and system prompts
                    filteredPrompts = result.data.filter(prompt =>
                        prompt.createdBy === technician.name ||
                        ['system', 'admin', 'System Administrator'].includes(prompt.createdBy)
                    );
                }

                setPrompts(filteredPrompts);
                if (filteredPrompts.length > 0 && !selectedPrompt) {
                    setSelectedPrompt(filteredPrompts[0]);
                    setEditingPrompt(filteredPrompts[0].content);
                }
            }
        } catch (error) {
            console.error('❌ Error fetching prompts:', error);
        }
    };

    const fetchSampleReviews = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/testing/sample-reviews');
            const result = await response.json();
            if (result.success) {
                setSampleReviews(result.data);
                if (result.data.length > 0) {
                    setSelectedReview(result.data[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching sample reviews:', error);
        }
    };

    const loadActivePrompts = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/prompts/active/response_generation');
            const result = await response.json();
            if (result.success) {
                setResponsePrompt(result.data.content);
            }
        } catch (error) {
            console.error('Error loading active prompts:', error);
        }
    };

    const handleCreatePrompt = async () => {
        if (!newPrompt.name || !newPrompt.content) {
            alert('Name and content are required');
            return;
        }

        const technicianName = getTechnicianDisplayName(technician);
        setLoading(true);

        try {
            const response = await fetch('http://localhost:8000/api/prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newPrompt,
                    createdBy: technicianName
                })
            });

            const result = await response.json();
            if (result.success) {
                await fetchPrompts();
                setShowCreateForm(false);
                setNewPrompt({ name: '', type: 'response_generation', content: '', description: '' });
                alert(`Prompt created successfully by ${technicianName}!`);
            } else {
                alert(result.message || 'Error creating prompt');
            }
        } catch (error) {
            console.error('Error creating prompt:', error);
            alert(`Error creating prompt: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePrompt = async () => {
        if (!selectedPrompt) return;

        if (!canEditPrompt(selectedPrompt)) {
            alert('You can only edit prompts that you created');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`http://localhost:8000/api/prompts/${selectedPrompt.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editingPrompt })
            });

            const result = await response.json();
            if (result.success) {
                await fetchPrompts();
                setIsEditing(false);
                alert('Prompt saved successfully!');
            } else {
                alert(result.message || 'Error saving prompt');
            }
        } catch (error) {
            console.error('Error saving prompt:', error);
            alert('Error saving prompt');
        } finally {
            setLoading(false);
        }
    };

    const handleActivatePrompt = async (promptId) => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:8000/api/prompts/${promptId}/activate`, {
                method: 'POST'
            });

            const result = await response.json();
            if (result.success) {
                await fetchPrompts();
                alert('Prompt activated successfully!');
            } else {
                alert(result.message || 'Error activating prompt');
            }
        } catch (error) {
            console.error('Error activating prompt:', error);
            alert('Error activating prompt');
        } finally {
            setLoading(false);
        }
    };

    const handleTestPrompt = async () => {
        if (!selectedReview) return;

        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/api/testing/generate-response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reviewData: selectedReview,
                    technicianData: selectedTechnician,
                    responsePrompt: responsePrompt,
                    useCustomPrompts: true
                })
            });

            const result = await response.json();
            if (result.success) {
                setTestResults(result.data);
            }
        } catch (error) {
            console.error('Error testing prompt:', error);
            alert('Error testing prompt');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Effects
    useEffect(() => {
        fetchPrompts();
        fetchSampleReviews();
    }, []);

    useEffect(() => {
        if (activeTab === 'testing') {
            loadActivePrompts();
        }
    }, [activeTab]);

    const promptVariables = [
        { name: '{{customerName}}', description: 'Customer name from review' },
        { name: '{{rating}}', description: 'Review rating (1-5)' },
        { name: '{{reviewText}}', description: 'Review content text' },
        { name: '{{reviewDate}}', description: 'Date of review' },
        { name: '{{sentiment}}', description: 'Review sentiment (positive/neutral/negative)' },
        { name: '{{technicianName}}', description: 'Technician name' },
        { name: '{{communicationStyle}}', description: 'Technician communication style' },
        { name: '{{personality}}', description: 'Technician personality traits' },
        { name: '{{traits}}', description: 'Comma-separated technician traits' },
        { name: '{{ratingGuidance}}', description: 'Guidance based on rating (auto-generated)' }
    ];

    // Show loading if no auth data yet
    if (!technician && urlParams.user) {
        return (
            <div className="prompt-playground">
                <div className="prompt-playground__loading">
                    <div className="prompt-playground__loading-spinner"></div>
                    <p>Loading technician information...</p>
                </div>
            </div>
        );
    }

    // Show error if no technician data
    if (!technician) {
        return (
            <div className="prompt-playground">
                <div className="prompt-playground__error">
                    <AlertCircle size={48} />
                    <h2>Authentication Required</h2>
                    <p>Unable to load technician information. Please access this page through Ejento.</p>
                    <button onClick={handleReturnToMain} className="prompt-playground__return-btn">
                        <Home size={16} />
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const renderPromptManagement = () => (
        <div className="prompt-management">
            {/* Header */}
            <div className="prompt-management__header">
                <div className="prompt-management__header-content">
                    <h2>Prompt Management</h2>
                    <p>Manage and edit AI prompts for response generation</p>
                    {userRole === 'technician' && (
                        <div className="prompt-management__role-notice">
                            <span>You can see system prompts and your own prompts. Only admins can activate prompts.</span>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="prompt-management__create-btn"
                >
                    <Plus size={16} />
                    Create Prompt
                </button>
            </div>

            {/* Create Form */}
            <AnimatePresence>
                {showCreateForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="create-form"
                    >
                        <div className="create-form__header">
                            <h3>Create New Prompt</h3>
                        </div>
                        <div className="create-form__grid">
                            <div className="create-form__field">
                                <label className="create-form__field-label">Name</label>
                                <input
                                    type="text"
                                    value={newPrompt.name}
                                    onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                                    className="create-form__field-input"
                                    placeholder="Enter prompt name"
                                />
                            </div>
                            <div className="create-form__field">
                                <label className="create-form__field-label">Description</label>
                                <input
                                    type="text"
                                    value={newPrompt.description}
                                    onChange={(e) => setNewPrompt({ ...newPrompt, description: e.target.value })}
                                    className="create-form__field-input"
                                    placeholder="Brief description of this prompt"
                                />
                            </div>
                            <div className="create-form__field">
                                <label className="create-form__field-label">Content</label>
                                <textarea
                                    value={newPrompt.content}
                                    onChange={(e) => setNewPrompt({ ...newPrompt, content: e.target.value })}
                                    rows={8}
                                    className="create-form__field-textarea"
                                    placeholder="Enter prompt content..."
                                />
                            </div>
                        </div>
                        <div className="create-form__actions">
                            <button
                                onClick={handleCreatePrompt}
                                disabled={loading}
                                className="create-form__submit-btn"
                            >
                                <Save size={16} />
                                Create Prompt
                            </button>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="create-form__cancel-btn"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="prompt-management__grid">
                {/* Prompt List */}
                <div className="prompt-list">
                    <div className="prompt-list__header">
                        <h3>Available Prompts</h3>
                        {/* Show current user info */}
                        {technician && (
                            <div className="prompt-list__current-user">
                                <User size={14} />
                                <span>{getTechnicianDisplayName(technician)} ({userRole})</span>
                            </div>
                        )}
                    </div>
                    <div className="prompt-list__items">
                        {prompts.map((prompt) => (
                            <div
                                key={prompt.id}
                                className={`prompt-item ${
                                    selectedPrompt?.id === prompt.id ? 'prompt-item--selected' : ''
                                } ${isSystemPrompt(prompt) ? 'prompt-item--system' : ''}`}
                                onClick={() => {
                                    setSelectedPrompt(prompt);
                                    setEditingPrompt(prompt.content);
                                    setIsEditing(false);
                                }}
                            >
                                <div className="prompt-item__header">
                                    <h4>
                                        {prompt.name}
                                        {isSystemPrompt(prompt) && (
                                            <span className="prompt-item__system-badge">System</span>
                                        )}
                                    </h4>
                                    {prompt.isActive && (
                                        <span className="prompt-item__active-badge">
                                            Active
                                        </span>
                                    )}
                                </div>
                                <p className="prompt-item__description">{prompt.description}</p>
                                <div className="prompt-item__meta">
                                    <span className="prompt-item__meta-type">{prompt.type}</span>
                                    <span className="prompt-item__meta-creator">
                                        <User size={12} />
                                        {prompt.createdBy}
                                    </span>
                                    {/* Show if user can edit this prompt */}
                                    {!canEditPrompt(prompt) && (
                                        <span className="prompt-item__meta-readonly">
                                            View Only
                                        </span>
                                    )}
                                    {/* Add creation date if available */}
                                    {prompt.createdAt && (
                                        <span className="prompt-item__meta-date">
                                            <Clock size={12} />
                                            {new Date(prompt.createdAt).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Prompt Editor */}
                <div className="prompt-editor">
                    {selectedPrompt && (
                        <>
                            <div className="prompt-editor__header">
                                <h3>
                                    {canEditPrompt(selectedPrompt) ? 'Edit Prompt' : 'View Prompt'}
                                </h3>
                                <div className="prompt-editor__actions">
                                    {!selectedPrompt.isActive && (
                                        <button
                                            onClick={() => handleActivatePrompt(selectedPrompt.id)}
                                            disabled={loading}
                                            className="prompt-editor__activate-btn"
                                        >
                                            <Zap size={16} />
                                            Activate
                                        </button>
                                    )}
                                    {canEditPrompt(selectedPrompt) && (
                                        <>
                                            {isEditing ? (
                                                <>
                                                    <button
                                                        onClick={handleSavePrompt}
                                                        disabled={loading}
                                                        className="prompt-editor__save-btn"
                                                    >
                                                        <Save size={16} />
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setIsEditing(false);
                                                            setEditingPrompt(selectedPrompt.content);
                                                        }}
                                                        className="prompt-editor__cancel-btn"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setIsEditing(true)}
                                                    className="prompt-editor__edit-btn"
                                                >
                                                    <Edit3 size={16} />
                                                    Edit
                                                </button>
                                            )}
                                        </>
                                    )}
                                    {!canEditPrompt(selectedPrompt) && (
                                        <span className="prompt-editor__readonly-notice">
                                            {isSystemPrompt(selectedPrompt) ? 'System prompt' : 'Created by another user'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="editor-container">
                                <div className="editor-container__header">
                                    <h4>{selectedPrompt.name}</h4>
                                    <button
                                        onClick={() => setShowVariables(!showVariables)}
                                        className="editor-container__variables-btn"
                                    >
                                        {showVariables ? <EyeOff size={14} /> : <Eye size={14} />}
                                        Variables
                                    </button>
                                </div>

                                {showVariables && (
                                    <div className="editor-container__variables">
                                        <h5>Available Variables:</h5>
                                        <div className="editor-container__variables-grid">
                                            {promptVariables.map((variable, index) => (
                                                <div key={index} className="editor-container__variables-grid-item">
                                                    <code>{variable.name}</code>
                                                    <span>{variable.description}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="editor-container__content">
                                    <textarea
                                        value={editingPrompt}
                                        onChange={(e) => setEditingPrompt(e.target.value)}
                                        disabled={!isEditing || !canEditPrompt(selectedPrompt)}
                                        rows={20}
                                        className={`editor-container__textarea ${
                                            !isEditing || !canEditPrompt(selectedPrompt) ? 'editor-container__textarea--disabled' : ''
                                        }`}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    const renderTesting = () => (
        <div className="testing-section">
            {/* Header */}
            <div className="testing-section__header">
                <h2>Prompt Testing</h2>
                <p>Test your prompts with sample or custom reviews</p>
            </div>

            <div className="testing-section__grid">
                {/* Left Side - Configuration */}
                <div className="testing-section__left">
                    {/* Review Selection */}
                    <div className="config-card">
                        <div className="config-card__header">
                            <MessageSquare size={18} />
                            Review Data
                        </div>

                        <div className="config-card__content">
                            <div className="config-card__field">
                                <label className="config-card__field-label">Select Sample Review</label>
                                <select
                                    value={selectedReview?.id || ''}
                                    onChange={(e) => {
                                        const review = sampleReviews.find(r => r.id === e.target.value);
                                        setSelectedReview(review);
                                    }}
                                    className="config-card__field-select"
                                >
                                    {sampleReviews.map((review) => (
                                        <option key={review.id} value={review.id}>
                                            {review.customerName} - {review.rating} stars
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedReview && (
                                <div className="review-preview">
                                    <div className="review-preview__header">
                                        <User size={16} />
                                        <span className="review-preview__header-name">{selectedReview.customerName}</span>
                                        <div className="review-preview__header-stars">
                                            {Array.from({ length: 5 }, (_, i) => (
                                                <Star
                                                    key={i}
                                                    size={14}
                                                    className={`star-rating__star ${
                                                        i < selectedReview.rating ? 'star-rating__star--filled' : 'star-rating__star--empty'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="review-preview__text">{selectedReview.text}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Technician Configuration */}
                    <div className="config-card">
                        <div className="config-card__header">
                            <User size={18} />
                            Technician Persona
                        </div>

                        <div className="config-card__content">
                            <div className="config-card__field">
                                <label className="config-card__field-label">Name</label>
                                <input
                                    type="text"
                                    value={selectedTechnician.name}
                                    onChange={(e) => setSelectedTechnician({
                                        ...selectedTechnician,
                                        name: e.target.value
                                    })}
                                    className="config-card__field-input"
                                />
                            </div>
                            <div className="config-card__field">
                                <label className="config-card__field-label">Communication Style</label>
                                <input
                                    type="text"
                                    value={selectedTechnician.persona.communicationStyle}
                                    onChange={(e) => setSelectedTechnician({
                                        ...selectedTechnician,
                                        persona: {
                                            ...selectedTechnician.persona,
                                            communicationStyle: e.target.value
                                        }
                                    })}
                                    className="config-card__field-input"
                                />
                            </div>
                            <div className="config-card__field">
                                <label className="config-card__field-label">Personality</label>
                                <input
                                    type="text"
                                    value={selectedTechnician.persona.personality}
                                    onChange={(e) => setSelectedTechnician({
                                        ...selectedTechnician,
                                        persona: {
                                            ...selectedTechnician.persona,
                                            personality: e.target.value
                                        }
                                    })}
                                    className="config-card__field-input"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Test Button */}
                    <button
                        onClick={handleTestPrompt}
                        disabled={loading || !selectedReview}
                        className="test-button"
                    >
                        {loading ? (
                            <>
                                <div className="test-button__loading"></div>
                                Generating...
                            </>
                        ) : (
                            <>
                                <TestTube size={18} />
                                Test Prompts
                            </>
                        )}
                    </button>
                </div>

                {/* Right Side - Prompts & Results */}
                <div className="testing-section__right">
                    {/* Response Prompt */}
                    <div className="prompt-container">
                        <div className="prompt-container__header">
                            <Sparkles size={18} />
                            <h3>Response Generation Prompt</h3>
                        </div>
                        <div className="prompt-container__content">
                            <textarea
                                value={responsePrompt}
                                onChange={(e) => setResponsePrompt(e.target.value)}
                                rows={15}
                                className="prompt-container__textarea"
                            />
                        </div>
                    </div>

                    {/* Test Results */}
                    {testResults && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="test-results"
                        >
                            <div className="test-results__header">
                                <div className="test-results__header-title">
                                    <CheckCircle size={18} />
                                    Generated Response
                                </div>
                                <button
                                    onClick={() => copyToClipboard(testResults.response)}
                                    className="test-results__copy-btn"
                                >
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <div className="test-results__content">
                                <p className="test-results__text">{testResults.response}</p>
                                {testResults.usage && (
                                    <p className="test-results__usage">
                                        Tokens used: {testResults.usage.total_tokens}
                                        (Prompt: {testResults.usage.prompt_tokens}, Completion: {testResults.usage.completion_tokens})
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );

    // Add loading state check at the beginning of your component render
    if (!technician) {
        return (
            <div className="prompt-playground">
                <div className="prompt-playground__error">
                    <AlertCircle size={48} />
                    <h2>Authentication Required</h2>
                    <p>Unable to load technician information. Please access this page through Ejento.</p>
                    <button onClick={handleReturnToMain} className="prompt-playground__return-btn">
                        <Home size={16} />
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="prompt-playground">
            <div className="prompt-playground__container">
                {/* Header */}
                <div className="prompt-playground__header">
                    <div className="prompt-playground__header-content">
                        <h1>Prompt Playground</h1>
                        <p>Create, edit, and test AI prompts for review responses</p>
                    </div>
                    <button
                        onClick={handleReturnToMain}
                        className="prompt-playground__return-btn"
                        title="Return to Dashboard"
                    >
                        <ArrowLeft size={18} />
                        <span>Back to Dashboard</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="prompt-playground__tabs">
                    <nav className="prompt-playground__tabs-nav">
                        <button
                            onClick={() => setActiveTab('prompts')}
                            className={`prompt-playground__tabs-button ${
                                activeTab === 'prompts' ? 'prompt-playground__tabs-button--active' : ''
                            }`}
                        >
                            <FileText size={16} />
                            Prompt Management
                        </button>
                        <button
                            onClick={() => setActiveTab('testing')}
                            className={`prompt-playground__tabs-button ${
                                activeTab === 'testing' ? 'prompt-playground__tabs-button--active' : ''
                            }`}
                        >
                            <TestTube size={16} />
                            Testing
                        </button>
                    </nav>
                </div>

                {/* Content */}
                <div className="prompt-playground__content">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'prompts' ? renderPromptManagement() : renderTesting()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default PromptPlayground;