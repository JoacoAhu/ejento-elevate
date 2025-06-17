import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Star,
    Users,
    DollarSign,
    MessageSquare,
    Filter,
    Search,
    MoreVertical,
    Bot,
    Send
} from 'lucide-react';
import './Dashboard.scss';

const Dashboard = () => {
    const [reviews, setReviews] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingResponses, setLoadingResponses] = useState({}); // Track loading state per review
    const [stats, setStats] = useState({
        totalReviews: 0,
        averageRating: 0,
        activeTechnicians: 0,
        totalRewards: 0
    });

    useEffect(() => {
        // Fetch dashboard data
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch stats from real API
            const statsResponse = await fetch('http://localhost:8000/api/dashboard/stats');
            const statsResult = await statsResponse.json();

            if (statsResult.success) {
                setStats(statsResult.data);
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
                    rating: review.rating,
                    text: review.text,
                    date: review.date,
                    sentiment: review.sentiment,
                    responded: review.responded,
                    source: review.source,
                    status: review.status,
                    published: review.published,
                    publishedAt: review.publishedAt,
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
                // Refetch data to get the latest from database
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
                // Refetch data to get the latest state from database
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
                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="stat-card__icon stat-card__icon--reviews">
                        <MessageSquare size={24} />
                    </div>
                    <div className="stat-card__content">
                        <div className="stat-card__value">{stats.totalReviews.toLocaleString()}</div>
                        <div className="stat-card__label">Total Reviews</div>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="stat-card__icon stat-card__icon--rating">
                        <Star size={24} />
                    </div>
                    <div className="stat-card__content">
                        <div className="stat-card__value">{stats.averageRating}</div>
                        <div className="stat-card__label">Average Rating</div>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="stat-card__icon stat-card__icon--technicians">
                        <Users size={24} />
                    </div>
                    <div className="stat-card__content">
                        <div className="stat-card__value">{stats.activeTechnicians}</div>
                        <div className="stat-card__label">Active Technicians</div>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="stat-card__icon stat-card__icon--rewards">
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-card__content">
                        <div className="stat-card__value">${stats.totalRewards.toLocaleString()}</div>
                        <div className="stat-card__label">Total Rewards</div>
                    </div>
                </motion.div>
            </div>

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
                                    className={`review-card review-card--${review.sentiment}`}
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
                                            {!review.aiResponse ? (
                                                <button
                                                    className="review-card__respond-btn"
                                                    onClick={() => generateAIResponse(review.id)}
                                                    disabled={loadingResponses[review.id]}
                                                >
                                                    {loadingResponses[review.id] ? 'Generating...' : 'Generate Response'}
                                                </button>
                                            ) : (
                                                <span className="review-card__status review-card__status--responded">
                                                    Response Generated
                                                </span>
                                            )}

                                            <button className="review-card__menu-btn">
                                                <MoreVertical size={16} />
                                            </button>
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
                                                    onChange={(e) => editResponse(review.id, e.target.value)}
                                                    rows={3}
                                                />
                                            </div>

                                            <div className="ai-response__actions">
                                                <button
                                                    className="ai-response__regenerate-btn"
                                                    onClick={() => generateAIResponse(review.id)}
                                                    disabled={loadingResponses[review.id]}
                                                >
                                                    Regenerate
                                                </button>
                                                <button
                                                    className="ai-response__publish-btn"
                                                    onClick={() => publishResponse(review.id)}
                                                >
                                                    <Send size={14} />
                                                    Publish Response
                                                </button>
                                            </div>
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