import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Star,
    TrendingUp,
    Users,
    DollarSign,
    MessageSquare,
    Filter,
    Search,
    MoreVertical
} from 'lucide-react';
import './Dashboard.scss';

const Dashboard = () => {
    const [reviews, setReviews] = useState([]);
    const [filterBy, setFilterBy] = useState('recent');
    const [searchTerm, setSearchTerm] = useState('');
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
            // API calls would go here
            // Mock data for now
            setStats({
                totalReviews: 1247,
                averageRating: 4.7,
                activeTechnicians: 28,
                totalRewards: 12450
            });

            setReviews([
                {
                    id: 1,
                    customerName: 'Jamal Jefferson',
                    technicianName: 'Antoine Clipper',
                    rating: 5,
                    text: 'Hivemind was the place you can count on when you need to get rid of pesky, unwelcome guests...',
                    date: '2022-09-29',
                    sentiment: 'positive',
                    responded: true,
                    source: 'google'
                },
                {
                    id: 2,
                    customerName: 'Saurabh Neis',
                    technicianName: 'Marcus Wilson',
                    rating: 5,
                    text: 'Professional, but not professional. Did a great job on the services, but the technician was 3 hour...',
                    date: '2022-09-24',
                    sentiment: 'positive',
                    responded: false,
                    source: 'google'
                },
                {
                    id: 3,
                    customerName: 'Christina Keller',
                    technicianName: 'Unknown',
                    rating: 1,
                    text: 'Terrible customer service, wouldn\'t recommend to my worst enemies.',
                    date: '2022-09-21',
                    sentiment: 'negative',
                    responded: false,
                    source: 'google'
                }
            ]);
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
            const response = await fetch(`http://localhost:8000/api/reviews/${reviewId}/generate-response`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();

            if (result.success) {
                alert(`AI Response Generated: ${result.data.response}`);
                fetchDashboardData();
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
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
                                            {review.responded ? (
                                                <span className="review-card__status review-card__status--responded">
                          Responded
                        </span>
                                            ) : (
                                                <button className="review-card__respond-btn">
                                                    Generate Response
                                                </button>
                                            )}

                                            <button className="review-card__menu-btn">
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>
                                    </div>
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