import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star,
    Users,
    DollarSign,
    MessageSquare,
    Filter,
    Search,
    MoreVertical,
    Bot,
    Send,
    CheckCircle,
    ThumbsUp,
    Edit3,
    Save,
    X,
    Trophy,
    Award,
    TrendingUp
} from 'lucide-react';
import './Dashboard.scss';

const Dashboard = () => {
    const [reviews, setReviews] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingResponses, setLoadingResponses] = useState({});
    const [loadingResponseApprovals, setLoadingResponseApprovals] = useState({});
    const [openMenuId, setOpenMenuId] = useState(null);
    const [editingPersona, setEditingPersona] = useState(null);
    const [personaForm, setPersonaForm] = useState({
        traits: ['', '', ''],
        personality: ['', ''],
        communicationStyle: ['', '']
    });
    const [savingPersona, setSavingPersona] = useState(false);
    const [stats, setStats] = useState({
        totalReviews: 0,
        averageRating: 0,
        activeTechnicians: 0,
        totalRewards: 0
    });
    const [topTechnicians, setTopTechnicians] = useState([]); // Add this new state

    const menuRef = useRef(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpenMenuId(null);
                setEditingPersona(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch stats from real API
            const statsResponse = await fetch('http://localhost:8000/api/dashboard/stats');
            const statsResult = await statsResponse.json();

            if (statsResult.success) {
                setStats(statsResult.data);
            }

            // Fetch top technicians
            const topTechResponse = await fetch('http://localhost:8000/api/dashboard/top-technicians');
            const topTechResult = await topTechResponse.json();

            if (topTechResult.success) {
                setTopTechnicians(topTechResult.data);
            }

            // Fetch reviews from real API
            const reviewsResponse = await fetch('http://localhost:8000/api/reviews');
            const reviewsResult = await reviewsResponse.json();

            if (reviewsResult.success) {
                // Transform the data to match your frontend format
                const transformedReviews = reviewsResult.data.map(review => ({
                    id: review.id,
                    customerName: review.customerName,
                    technicianName: review.technicianName,
                    technicianCrmCode: review.technicianCrmCode,
                    rating: review.rating,
                    text: review.text,
                    date: review.date,
                    sentiment: review.sentiment,
                    responded: review.responded,
                    source: review.source,
                    status: review.status,
                    published: review.published,
                    publishedAt: review.publishedAt,
                    // Add response approval fields
                    responseApprovalStatus: review.responseApprovalStatus || 'pending',
                    responseApprovedBy: review.responseApprovedBy || null,
                    responseApprovedAt: review.responseApprovedAt || null,
                    // Add AI response if it exists
                    aiResponse: review.responseText ? {
                        text: review.responseText,
                        generatedAt: review.responseDate
                    } : null
                }));

                setReviews(transformedReviews);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    const fetchTechnicianPersona = async (crmCode) => {
        try {
            const response = await fetch(`http://localhost:8000/api/technicians/crm/${crmCode}`);
            const result = await response.json();

            if (result.success && result.data.persona) {
                const persona = result.data.persona;
                return {
                    traits: Array.isArray(persona.traits) ? persona.traits : [persona.traits || '', '', ''],
                    personality: typeof persona.personality === 'string'
                        ? persona.personality.split(' and ')
                        : [persona.personality || '', ''],
                    communicationStyle: typeof persona.communicationStyle === 'string'
                        ? persona.communicationStyle.split(' and ')
                        : [persona.communicationStyle || '', '']
                };
            }
            return {
                traits: ['', '', ''],
                personality: ['', ''],
                communicationStyle: ['', '']
            };
        } catch (error) {
            console.error('Error fetching technician persona:', error);
            return {
                traits: ['', '', ''],
                personality: ['', ''],
                communicationStyle: ['', '']
            };
        }
    };

    const handleMenuClick = async (reviewId, crmCode) => {
        if (openMenuId === reviewId) {
            setOpenMenuId(null);
            setEditingPersona(null);
        } else {
            setOpenMenuId(reviewId);
            if (crmCode) {
                const persona = await fetchTechnicianPersona(crmCode);
                setPersonaForm(persona);
            }
        }
    };

    const handleEditPersona = (reviewId) => {
        setEditingPersona(reviewId);
    };

    const handlePersonaInputChange = (field, index, value) => {
        setPersonaForm(prev => ({
            ...prev,
            [field]: prev[field].map((item, i) => i === index ? value : item)
        }));
    };

    const handleSavePersona = async (crmCode) => {
        if (!crmCode) {
            alert('Cannot update persona: Technician CRM code not found');
            return;
        }

        try {
            setSavingPersona(true);

            const response = await fetch(`http://localhost:8000/api/technicians/crm/${crmCode}/persona`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    persona: {
                        traits: personaForm.traits.filter(trait => trait.trim() !== ''),
                        personality: personaForm.personality.filter(p => p.trim() !== '').join(' and '),
                        communicationStyle: personaForm.communicationStyle.filter(cs => cs.trim() !== '').join(' and ')
                    }
                })
            });

            const result = await response.json();

            if (result.success) {
                alert(`Persona updated successfully for ${result.data.name} (${crmCode})!`);
                setEditingPersona(null);
                setOpenMenuId(null);
                await fetchDashboardData();
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setSavingPersona(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, index) => (
            <Star
                key={index}
                className={`review-card__star ${
                    index < rating ? 'review-card__star--filled' : 'review-card__star--empty'
                }`}
                size={16}
            />
        ));
    };

    const getInitials = (name) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase();
    };

    const isNegativeReview = (review) => {
        return review.rating <= 2 || review.sentiment === 'negative';
    };

    const canPublishResponse = (review) => {
        if (!review.aiResponse) return false;
        if (isNegativeReview(review)) {
            return review.responseApprovalStatus === 'approved';
        }
        return true;
    };

    const filteredReviews = reviews.filter(review => {
        const matchesSearch = review.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            review.technicianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            review.text.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const generateAIResponse = async (reviewId) => {
        try {
            setLoadingResponses(prev => ({ ...prev, [reviewId]: true }));

            const response = await fetch(`http://localhost:8000/api/reviews/${reviewId}/generate-response`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();

            if (result.success) {
                await fetchDashboardData();
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setLoadingResponses(prev => ({ ...prev, [reviewId]: false }));
        }
    };

    const approveResponse = async (reviewId) => {
        try {
            setLoadingResponseApprovals(prev => ({ ...prev, [reviewId]: true }));

            const response = await fetch(`http://localhost:8000/api/reviews/${reviewId}/approve-response`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'approve',
                    approvedBy: 'current_user'
                })
            });

            const result = await response.json();

            if (result.success) {
                await fetchDashboardData();
                alert('Response approved successfully!');
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setLoadingResponseApprovals(prev => ({ ...prev, [reviewId]: false }));
        }
    };

    const publishResponse = async (reviewId) => {
        try {
            const response = await fetch(`http://localhost:8000/api/reviews/${reviewId}/publish-response`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();

            if (result.success) {
                alert('Response published successfully!');
                await fetchDashboardData();
            } else {
                alert(`Error publishing response: ${result.message}`);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const editResponse = (reviewId, newText) => {
        setReviews(prevReviews =>
            prevReviews.map(review =>
                review.id === reviewId
                    ? {
                        ...review,
                        aiResponse: {
                            ...review.aiResponse,
                            text: newText
                        }
                    }
                    : review
            )
        );
    };

    const renderReviewActions = (review) => {
        if (review.aiResponse) {
            return (
                <span className="review-card__status review-card__status--responded">
                    Response Generated
                </span>
            );
        }

        return (
            <button
                className="review-card__respond-btn"
                onClick={() => generateAIResponse(review.id)}
                disabled={loadingResponses[review.id]}
            >
                {loadingResponses[review.id] ? 'Generating...' : 'Generate Response'}
            </button>
        );
    };

    const renderAIResponseActions = (review) => {
        const isNegative = isNegativeReview(review);
        const needsApproval = isNegative && review.responseApprovalStatus === 'pending';
        const isApproved = review.responseApprovalStatus === 'approved';

        return (
            <div className="ai-response__actions">
                <button
                    className="ai-response__regenerate-btn"
                    onClick={() => generateAIResponse(review.id)}
                    disabled={loadingResponses[review.id]}
                >
                    Regenerate
                </button>

                {needsApproval && (
                    <button
                        className="ai-response__approve-btn"
                        onClick={() => approveResponse(review.id)}
                        disabled={loadingResponseApprovals[review.id]}
                    >
                        <ThumbsUp size={14} />
                        {loadingResponseApprovals[review.id] ? 'Approving...' : 'Approve Response'}
                    </button>
                )}

                {isNegative && isApproved && (
                    <span className="ai-response__approval-status ai-response__approval-status--approved">
                        <CheckCircle size={14} />
                        Response Approved
                    </span>
                )}

                {canPublishResponse(review) && (
                    <button
                        className="ai-response__publish-btn"
                        onClick={() => publishResponse(review.id)}
                    >
                        <Send size={14} />
                        Publish Response
                    </button>
                )}
            </div>
        );
    };

    const renderPersonaMenu = (review) => {

        if (editingPersona === review.id) {
            return (
                <div className="persona-edit-form">
                    <div className="persona-edit-form__header">
                        <h4>Edit {review.technicianName}'s Persona</h4>
                        <button
                            className="persona-edit-form__close"
                            onClick={() => setEditingPersona(null)}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="persona-edit-form__section">
                        <label className="persona-edit-form__label">Traits</label>
                        {personaForm.traits.map((trait, index) => (
                            <input
                                key={index}
                                type="text"
                                className="persona-edit-form__input"
                                placeholder={`Trait ${index + 1}`}
                                value={trait}
                                onChange={(e) => handlePersonaInputChange('traits', index, e.target.value)}
                            />
                        ))}
                    </div>

                    <div className="persona-edit-form__section">
                        <label className="persona-edit-form__label">Personality</label>
                        {personaForm.personality.map((personality, index) => (
                            <input
                                key={index}
                                type="text"
                                className="persona-edit-form__input"
                                placeholder={`Personality ${index + 1}`}
                                value={personality}
                                onChange={(e) => handlePersonaInputChange('personality', index, e.target.value)}
                            />
                        ))}
                    </div>

                    <div className="persona-edit-form__section">
                        <label className="persona-edit-form__label">Communication Style</label>
                        {personaForm.communicationStyle.map((style, index) => (
                            <input
                                key={index}
                                type="text"
                                className="persona-edit-form__input"
                                placeholder={`Communication Style ${index + 1}`}
                                value={style}
                                onChange={(e) => handlePersonaInputChange('communicationStyle', index, e.target.value)}
                            />
                        ))}
                    </div>

                    <div className="persona-edit-form__actions">
                        <button
                            className="persona-edit-form__save-btn"
                            onClick={() => handleSavePersona(review.technicianCrmCode)}
                            disabled={savingPersona}
                        >
                            <Save size={14} />
                            {savingPersona ? 'Saving...' : 'Save Persona'}
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="dropdown-menu">
                <button
                    className="dropdown-menu__item"
                    onClick={() => handleEditPersona(review.id)}
                    disabled={!review.technicianCrmCode || review.technicianName === 'Unknown'}
                >
                    <Edit3 size={14} />
                    Edit Persona {review.technicianCrmCode && `(${review.technicianCrmCode})`}
                </button>
            </div>
        );
    };

    // Render top technicians section
    const renderTopTechnicians = () => {
        if (topTechnicians.length === 0) {
            return (
                <div className="top-technicians__empty">
                    <Trophy size={48} className="top-technicians__empty-icon" />
                    <p>No technician performance data available yet.</p>
                </div>
            );
        }

        return (
            <div className="top-technicians__list">
                {topTechnicians.map((tech, index) => (
                    <motion.div
                        key={tech.id}
                        className={`top-tech-card ${index === 0 ? 'top-tech-card--first' : ''}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <div className="top-tech-card__rank">
                            {index === 0 && <Trophy size={20} className="top-tech-card__trophy" />}
                            <span className="top-tech-card__rank-number">#{index + 1}</span>
                        </div>

                        <div className="top-tech-card__avatar">
                            {getInitials(tech.name)}
                        </div>

                        <div className="top-tech-card__info">
                            <div className="top-tech-card__name">{tech.name}</div>
                            <div className="top-tech-card__code">{tech.crmCode}</div>
                        </div>

                        <div className="top-tech-card__stats">
                            <div className="top-tech-card__stat">
                                <Star size={16} className="top-tech-card__stat-icon" />
                                <span className="top-tech-card__stat-value">{tech.averageRating}</span>
                                <span className="top-tech-card__stat-label">Avg Rating</span>
                            </div>

                            <div className="top-tech-card__stat">
                                <ThumbsUp size={16} className="top-tech-card__stat-icon" />
                                <span className="top-tech-card__stat-value">{tech.positiveReviews}</span>
                                <span className="top-tech-card__stat-label">Positive Reviews</span>
                            </div>

                            <div className="top-tech-card__stat">
                                <DollarSign size={16} className="top-tech-card__stat-icon" />
                                <span className="top-tech-card__stat-value">${tech.totalRewards}</span>
                                <span className="top-tech-card__stat-label">Rewards</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        );
    };

    return (
        <div className="dashboard">
            {/* Header Section */}
            <div className="dashboard__header">
                <div className="dashboard__title-section">
                    <h1 className="dashboard__title">Reviews Dashboard</h1>
                    <p className="dashboard__subtitle">Monitor and manage technician reviews</p>
                </div>

                <div className="dashboard__actions">
                    <button className="dashboard__refresh-btn">
                        Last refreshed at Nov 11 • 11:10am
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="dashboard__stats">
                <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <div className="stat-card__icon stat-card__icon--reviews">
                        <MessageSquare size={24} />
                    </div>
                    <div className="stat-card__content">
                        <div className="stat-card__value">{stats.totalReviews.toLocaleString()}</div>
                        <div className="stat-card__label">Total Reviews</div>
                    </div>
                </motion.div>

                <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div className="stat-card__icon stat-card__icon--rating">
                        <Star size={24} />
                    </div>
                    <div className="stat-card__content">
                        <div className="stat-card__value">{stats.averageRating}</div>
                        <div className="stat-card__label">Average Rating</div>
                    </div>
                </motion.div>

                <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <div className="stat-card__icon stat-card__icon--technicians">
                        <Users size={24} />
                    </div>
                    <div className="stat-card__content">
                        <div className="stat-card__value">{stats.activeTechnicians}</div>
                        <div className="stat-card__label">Active Technicians</div>
                    </div>
                </motion.div>

                <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <div className="stat-card__icon stat-card__icon--rewards">
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-card__content">
                        <div className="stat-card__value">${stats.totalRewards.toLocaleString()}</div>
                        <div className="stat-card__label">Total Rewards</div>
                    </div>
                </motion.div>
            </div>

            {/* Top Technicians Section */}
            <motion.div
                className="top-technicians"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <div className="top-technicians__header">
                    <div className="top-technicians__title-section">
                        <div className="top-technicians__icon">
                            <Award size={24} />
                        </div>
                        <div>
                            <h2 className="top-technicians__title">Top Performers</h2>
                            <p className="top-technicians__subtitle">Ranked by positive reviews and customer satisfaction</p>
                        </div>
                    </div>
                    <div className="top-technicians__badge">
                        <TrendingUp size={16} />
                        <span>This Month</span>
                    </div>
                </div>

                <div className="top-technicians__content">
                    {renderTopTechnicians()}
                </div>
            </motion.div>

            {/* Reviews Section */}
            <div className="dashboard__reviews">
                <div className="reviews-section">
                    <div className="reviews-section__header">
                        <div className="reviews-section__title-area">
                            <h2 className="reviews-section__title">Reviews ({filteredReviews.length})</h2>
                        </div>

                        <div className="reviews-section__controls">
                            <div className="search-input">
                                <Search className="search-input__icon" size={20} />
                                <input
                                    type="text"
                                    className="search-input__field"
                                    placeholder="Search reviews..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="filter-dropdown">
                                <button className="filter-dropdown__trigger">
                                    <Filter size={16} />
                                    Filter
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="reviews-section__content">
                        <div className="reviews-list">
                            {filteredReviews.map((review, index) => (
                                <motion.div
                                    key={review.id}
                                    className={`review-card review-card--${review.sentiment} ${
                                        isNegativeReview(review) ? 'review-card--flagged' : ''
                                    }`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <div className="review-card__header">
                                        <div className="review-card__customer">
                                            <div className="review-card__avatar">
                                                {getInitials(review.customerName)}
                                            </div>
                                            <div className="review-card__customer-info">
                                                <div className="review-card__customer-name">{review.customerName}</div>
                                                <div className="review-card__date">{formatDate(review.date)}</div>
                                            </div>
                                        </div>

                                        <div className="review-card__rating">
                                            {renderStars(review.rating)}
                                        </div>

                                        <div className="review-card__source">
                                            <span className="review-card__source-text">Google</span>
                                        </div>
                                    </div>

                                    <div className="review-card__content">
                                        <p className="review-card__text">{review.text}</p>
                                    </div>

                                    <div className="review-card__footer">
                                        <div className="review-card__technician">
                                            {review.technicianName !== 'Unknown' ? (
                                                <>
                                                    <div className="review-card__tech-avatar">
                                                        {getInitials(review.technicianName)}
                                                    </div>
                                                    <span className="review-card__tech-name">{review.technicianName}</span>
                                                    <span className="review-card__tech-badge">Confirmed</span>
                                                </>
                                            ) : (
                                                <span className="review-card__tech-unknown">Technician not identified</span>
                                            )}
                                        </div>

                                        <div className="review-card__actions">
                                            {renderReviewActions(review)}

                                            <div className="menu-container" ref={openMenuId === review.id ? menuRef : null}>
                                                <button
                                                    className="review-card__menu-btn"
                                                    onClick={() => handleMenuClick(review.id, review.technicianCrmCode)}
                                                >
                                                    <MoreVertical size={16} />
                                                </button>

                                                <AnimatePresence>
                                                    {openMenuId === review.id && (
                                                        <motion.div
                                                            className="menu-dropdown"
                                                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                            transition={{ duration: 0.15 }}
                                                        >
                                                            {renderPersonaMenu(review)}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Response Section */}
                                    {review.aiResponse && (
                                        <motion.div
                                            className="ai-response"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <div className="ai-response__header">
                                                <div className="ai-response__icon">
                                                    <Bot size={16} />
                                                </div>
                                                <span className="ai-response__label">AI Generated Response</span>
                                                <span className="ai-response__timestamp">
                                                    {formatDate(review.aiResponse.generatedAt)}
                                                </span>
                                            </div>

                                            <div className="ai-response__content">
                                                <textarea
                                                    className="ai-response__text"
                                                    value={review.aiResponse.text}
                                                    onChange={(e) => {
                                                        // Auto-resize logic
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = `${e.target.scrollHeight}px`;

                                                        // Update the state
                                                        editResponse(review.id, e.target.value);
                                                    }}
                                                    onLoad={(e) => {
                                                        // Auto-resize on load
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                                    }}
                                                    style={{
                                                        minHeight: '60px',
                                                        resize: 'none',
                                                        overflow: 'hidden',
                                                        width: '100%',
                                                        padding: '12px',
                                                        border: '1px solid #e1e5e9',
                                                        borderRadius: '8px',
                                                        fontFamily: 'inherit',
                                                        fontSize: '14px',
                                                        lineHeight: '1.5'
                                                    }}
                                                />
                                            </div>

                                            {renderAIResponseActions(review)}
                                        </motion.div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;