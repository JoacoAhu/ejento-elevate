const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Sequelize, DataTypes, Op } = require('sequelize');
require('dotenv').config();
const { authenticateEjentoUser, generateEjentoToken, requireAdminRole, requireManagerRole } = require('./middleware/ejentoAuth');

// Import models from the models directory
const db = require('./models');
const { Client, Technician, Review, Prompt, EjentoLocationMapping, EjentoUserMapping, EjentoIntegration } = db;

// Import OpenAI service
const openaiService = require('./services/openaiService');

const app = express();
const PORT = process.env.PORT || 8000;

// Database connection
const sequelize = db.sequelize;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            message: 'Ejento Elevate Server is running!',
            database: 'Connected',
            ai: process.env.OPENAI_API_KEY ? 'OpenAI configured' : 'OpenAI not configured'
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            message: 'Database connection failed',
            database: 'Disconnected',
            error: error.message
        });
    }
});

// Test OpenAI connection
app.get('/api/ai/test', async (req, res) => {
    try {
        const result = await openaiService.testConnection();
        res.json({
            success: result.success,
            message: result.success ? 'OpenAI connection successful' : 'OpenAI connection failed',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'OpenAI test failed',
            error: error.message
        });
    }
});

// =============================================================================
// EJENTO AUTHENTICATION ENDPOINTS
// =============================================================================

// Ejento Authentication Verification Endpoint
app.get('/api/auth/verify-ejento', authenticateEjentoUser, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Ejento authentication successful',
            data: {
                locationId: req.ejento.locationId,
                userId: req.ejento.userId,
                client: req.ejento.client,
                technician: req.ejento.technician,
                userRole: req.ejento.userRole,
                locationMapping: {
                    id: req.ejento.locationMapping.id,
                    locationName: req.ejento.locationMapping.locationName
                }
            }
        });
    } catch (error) {
        console.error('Ejento verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed',
            error: error.message
        });
    }
});

// =============================================================================
// EJENTO DASHBOARD ENDPOINTS
// =============================================================================

// Get dashboard stats for Ejento authenticated user
app.get('/api/ejento/dashboard/stats', authenticateEjentoUser, async (req, res) => {
    try {
        const technicianId = req.ejento.technician.id;
        const clientId = req.ejento.client.id;

        let whereClause = {};
        if (req.ejento.userRole === 'technician') {
            whereClause.technicianId = technicianId;
        } else if (['admin', 'manager'].includes(req.ejento.userRole)) {
            whereClause.clientId = clientId;
        }

        const totalReviews = await Review.count({ where: whereClause });

        const averageRating = await Review.findAll({
            where: whereClause,
            attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']]
        });

        const positiveReviews = await Review.count({
            where: {
                ...whereClause,
                rating: { [Op.gte]: 4 }
            }
        });

        const activeTechnicians = req.ejento.userRole === 'technician' ? 1 :
            await Technician.count({ where: { clientId: clientId, isActive: true } });

        const totalRewards = positiveReviews * 5;

        res.json({
            success: true,
            data: {
                totalReviews: totalReviews,
                averageRating: parseFloat(averageRating[0].dataValues.avgRating || 0).toFixed(1),
                activeTechnicians: activeTechnicians,
                totalRewards: totalRewards
            }
        });
    } catch (error) {
        console.error('Error fetching Ejento dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard stats',
            error: error.message
        });
    }
});

// Get top technicians for Ejento authenticated user
app.get('/api/ejento/dashboard/top-technicians', authenticateEjentoUser, async (req, res) => {
    try {
        const clientId = req.ejento.client.id;

        const technicians = await Technician.findAll({
            where: { clientId: clientId, isActive: true },
            include: [
                {
                    model: Review,
                    as: 'reviews',
                    required: false,
                    attributes: ['id', 'rating', 'sentiment']
                },
                {
                    model: Client,
                    as: 'client',
                    attributes: ['id', 'name']
                }
            ]
        });

        const technicianStats = technicians.map(technician => {
            const reviews = technician.reviews || [];
            const positiveReviews = reviews.filter(review => review.rating >= 4).length;
            const totalReviews = reviews.length;
            const avgRating = totalReviews > 0
                ? (reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)
                : 0;
            const totalRewards = positiveReviews * 5;

            return {
                id: technician.id,
                name: technician.name,
                crmCode: technician.crmCode,
                email: technician.email,
                positiveReviews: positiveReviews,
                totalReviews: totalReviews,
                averageRating: parseFloat(avgRating),
                totalRewards: totalRewards,
                performanceScore: (positiveReviews * 0.7) + (parseFloat(avgRating) * 0.3)
            };
        });

        const topTechnicians = technicianStats
            .filter(tech => tech.totalReviews > 0)
            .sort((a, b) => {
                if (b.positiveReviews !== a.positiveReviews) {
                    return b.positiveReviews - a.positiveReviews;
                }
                return b.averageRating - a.averageRating;
            })
            .slice(0, 5);

        res.json({
            success: true,
            data: topTechnicians,
            total: topTechnicians.length
        });
    } catch (error) {
        console.error('Error fetching Ejento top technicians:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch top technicians',
            error: error.message
        });
    }
});

// =============================================================================
// EJENTO REVIEWS ENDPOINTS
// =============================================================================

// Get reviews for Ejento authenticated user
app.get('/api/ejento/reviews', authenticateEjentoUser, async (req, res) => {
    try {
        const technicianId = req.ejento.technician.id;
        const clientId = req.ejento.client.id;

        let whereClause = {};
        if (req.ejento.userRole === 'technician') {
            whereClause.technicianId = technicianId;
        } else if (['admin', 'manager'].includes(req.ejento.userRole)) {
            whereClause.clientId = clientId;
        }

        const reviews = await Review.findAll({
            where: whereClause,
            include: [
                {
                    model: Technician,
                    as: 'technician',
                    attributes: ['id', 'name', 'email', 'persona', 'crmCode']
                },
                {
                    model: Client,
                    as: 'client',
                    attributes: ['id', 'name']
                }
            ],
            order: [['reviewDate', 'DESC']]
        });

        const formattedReviews = reviews.map(review => ({
            id: review.id,
            customerName: review.customerName,
            technicianName: review.technician ? review.technician.name : 'Unknown',
            technicianCrmCode: review.technician ? review.technician.crmCode : null,
            rating: review.rating,
            text: review.text,
            date: review.reviewDate,
            sentiment: review.sentiment,
            responded: review.status === 'responded' || review.status === 'published',
            source: review.source,
            responseText: review.responseText,
            responseDate: review.responseDate,
            status: review.status,
            published: review.status === 'published',
            publishedAt: review.publishedAt,
            publishedBy: review.publishedBy,
            publishedPlatform: review.publishedPlatform,
            responseApprovalStatus: review.responseApprovalStatus || 'pending',
            responseApprovedBy: review.responseApprovedBy,
            responseApprovedAt: review.responseApprovedAt
        }));

        res.json({
            success: true,
            data: formattedReviews,
            total: formattedReviews.length,
            userRole: req.ejento.userRole,
            technician: req.ejento.technician,
            client: req.ejento.client
        });
    } catch (error) {
        console.error('Error fetching Ejento reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews',
            error: error.message
        });
    }
});

// Generate AI response for review (Ejento version)
app.post('/api/ejento/reviews/:id/generate-response', authenticateEjentoUser, async (req, res) => {
    try {
        const reviewId = parseInt(req.params.id);

        const review = await Review.findByPk(reviewId, {
            include: [
                {
                    model: Technician,
                    as: 'technician',
                    attributes: ['id', 'name', 'email', 'persona']
                }
            ]
        });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Check permissions
        const hasPermission = req.ejento.userRole === 'admin' ||
            req.ejento.userRole === 'manager' ||
            (req.ejento.userRole === 'technician' && review.technicianId === req.ejento.technician.id);

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to generate responses for this review'
            });
        }

        // Generate AI response
        const aiResult = await openaiService.generateReviewResponse(
            {
                customerName: review.customerName,
                rating: review.rating,
                text: review.text,
                date: review.reviewDate,
                sentiment: review.sentiment
            },
            review.technician
        );

        if (!aiResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate AI response',
                error: aiResult.error,
                fallbackResponse: aiResult.fallbackResponse
            });
        }

        const isNegative = review.rating <= 2 || review.sentiment === 'negative';
        const responseApprovalStatus = isNegative ? 'pending' : 'approved';

        await review.update({
            responseText: aiResult.response,
            responseDate: new Date(),
            status: 'responded',
            responseApprovalStatus: responseApprovalStatus,
            responseApprovedBy: isNegative ? null : 'system',
            responseApprovedAt: isNegative ? null : new Date()
        });

        res.json({
            success: true,
            message: 'AI response generated successfully',
            data: {
                reviewId: reviewId,
                response: aiResult.response,
                usage: aiResult.usage,
                responseApprovalStatus: responseApprovalStatus,
                review: {
                    id: review.id,
                    responseText: aiResult.response,
                    responseDate: new Date(),
                    status: 'responded',
                    responseApprovalStatus: responseApprovalStatus
                }
            }
        });
    } catch (error) {
        console.error('Ejento generate response error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Approve review response
app.post('/api/reviews/:id/approve-response', async (req, res) => {
    try {
        const reviewId = parseInt(req.params.id);
        const { approvedBy } = req.body;

        const review = await Review.findByPk(reviewId);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        if (!review.responseText) {
            return res.status(400).json({
                success: false,
                message: 'No response to approve. Generate a response first.'
            });
        }

        if (req.ejento.userRole === 'technician') {
            return res.status(200).json({
                success: false,
                message: 'Must be approved by Administrator or Manager.',
            })
        }

        const isNegative = review.rating <= 2 || review.sentiment === 'negative';

        if (!isNegative) {
            return res.status(400).json({
                success: false,
                message: 'Only negative reviews require response approval'
            });
        }

        await review.update({
            responseApprovalStatus: 'approved',
            responseApprovedBy: approvedBy,
            responseApprovedAt: new Date()
        });

        res.json({
            success: true,
            message: 'Response approved successfully',
            data: {
                reviewId: reviewId,
                responseApprovalStatus: 'approved',
                responseApprovedBy: approvedBy,
                responseApprovedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error approving response:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve response',
            error: error.message
        });
    }
});

// Publish response to review platform
app.post('/api/reviews/:id/publish-response', async (req, res) => {
    try {
        const reviewId = parseInt(req.params.id);

        const review = await Review.findByPk(reviewId, {
            include: [
                {
                    model: Technician,
                    as: 'technician',
                    attributes: ['id', 'name', 'email', 'persona']
                }
            ]
        });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        if (!review.responseText) {
            return res.status(400).json({
                success: false,
                message: 'No response to publish. Generate a response first.'
            });
        }

        const isNegative = review.rating <= 2 || review.sentiment === 'negative';

        if (isNegative && review.responseApprovalStatus !== 'approved') {
            return res.status(403).json({
                success: false,
                message: 'Negative review responses must be approved before publishing',
                requiresResponseApproval: true,
                responseApprovalStatus: review.responseApprovalStatus
            });
        }

        const publishedAt = new Date();

        await review.update({
            status: 'published',
            publishedAt: publishedAt,
            publishedBy: 'system',
            publishedPlatform: review.source
        });

        res.json({
            success: true,
            message: 'Response published successfully',
            data: {
                reviewId: reviewId,
                platform: review.source,
                responseText: review.responseText,
                publishedAt: publishedAt.toISOString(),
                customerName: review.customerName,
                technician: review.technician ? review.technician.name : 'Unknown',
                status: 'published'
            }
        });
    } catch (error) {
        console.error('Error publishing response:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to publish response',
            error: error.message
        });
    }
});

// =============================================================================
// ADMIN EJENTO MANAGEMENT ENDPOINTS
// =============================================================================

// Get all location mappings (admin only)
app.get('/api/admin/ejento/locations', requireAdminRole, async (req, res) => {
    try {
        const locations = await EjentoLocationMapping.findAll({
            include: [
                {
                    model: Client,
                    as: 'client',
                    attributes: ['id', 'name', 'email']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: locations,
            total: locations.length
        });
    } catch (error) {
        console.error('Error fetching location mappings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch location mappings',
            error: error.message
        });
    }
});

// Create new location mapping (admin only)
app.post('/api/admin/ejento/locations', requireAdminRole, async (req, res) => {
    try {
        const { ejentoLocationId, clientId, locationName } = req.body;

        if (!ejentoLocationId || !clientId) {
            return res.status(400).json({
                success: false,
                message: 'ejentoLocationId and clientId are required'
            });
        }

        const locationMapping = await EjentoLocationMapping.create({
            ejentoLocationId,
            clientId,
            locationName,
            isActive: true
        });

        res.json({
            success: true,
            message: 'Location mapping created successfully',
            data: locationMapping
        });
    } catch (error) {
        console.error('Error creating location mapping:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create location mapping',
            error: error.message
        });
    }
});

// Get all user mappings for a location (admin/manager only)
app.get('/api/admin/ejento/users', requireManagerRole, async (req, res) => {
    try {
        const { locationId } = req.query;

        let whereClause = {};
        if (locationId) {
            const locationMapping = await EjentoLocationMapping.findOne({
                where: { ejentoLocationId: locationId }
            });
            if (locationMapping) {
                whereClause.ejentoLocationMappingId = locationMapping.id;
            }
        }

        const users = await EjentoUserMapping.findAll({
            where: whereClause,
            include: [
                {
                    model: Technician,
                    as: 'technician',
                    attributes: ['id', 'name', 'email', 'crmCode']
                },
                {
                    model: EjentoLocationMapping,
                    as: 'locationMapping',
                    attributes: ['ejentoLocationId', 'locationName']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: users,
            total: users.length
        });
    } catch (error) {
        console.error('Error fetching user mappings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user mappings',
            error: error.message
        });
    }
});

// Create new user mapping (admin only)
app.post('/api/admin/ejento/users', requireAdminRole, async (req, res) => {
    try {
        const { ejentoUserId, technicianId, ejentoLocationId, userRole = 'technician' } = req.body;

        if (!ejentoUserId || !technicianId || !ejentoLocationId) {
            return res.status(400).json({
                success: false,
                message: 'ejentoUserId, technicianId, and ejentoLocationId are required'
            });
        }

        const locationMapping = await EjentoLocationMapping.findOne({
            where: { ejentoLocationId }
        });

        if (!locationMapping) {
            return res.status(404).json({
                success: false,
                message: 'Location mapping not found'
            });
        }

        const userMapping = await EjentoUserMapping.create({
            ejentoUserId,
            technicianId,
            ejentoLocationMappingId: locationMapping.id,
            userRole,
            isActive: true
        });

        res.json({
            success: true,
            message: 'User mapping created successfully',
            data: userMapping
        });
    } catch (error) {
        console.error('Error creating user mapping:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user mapping',
            error: error.message
        });
    }
});

// Generate test URL with token
app.post('/api/admin/ejento/generate-url', requireAdminRole, async (req, res) => {
    try {
        const { locationId, userId } = req.body;

        if (!locationId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'locationId and userId are required'
            });
        }

        const token = generateEjentoToken(locationId, userId);
        const url = `${req.protocol}://${req.get('host')}/dashboard?location=${locationId}&user=${userId}&token=${token}`;

        res.json({
            success: true,
            data: {
                url,
                token,
                expiresIn: '1 hour'
            }
        });
    } catch (error) {
        console.error('Error generating URL:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate URL',
            error: error.message
        });
    }
});

// =============================================================================
// PROMPT MANAGEMENT ENDPOINTS
// =============================================================================

// Get all prompts
app.get('/api/prompts', async (req, res) => {
    try {
        const { type } = req.query;
        const whereClause = type ? { type } : {};

        const prompts = await Prompt.findAll({
            where: whereClause,
            order: [['type', 'ASC'], ['version', 'DESC'], ['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: prompts,
            total: prompts.length
        });
    } catch (error) {
        console.error('Error fetching prompts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch prompts',
            error: error.message
        });
    }
});

// Get active prompt by type
app.get('/api/prompts/active/:type', async (req, res) => {
    try {
        const { type } = req.params;

        const prompt = await Prompt.findOne({
            where: {
                type: type,
                isActive: true
            }
        });

        if (!prompt) {
            return res.status(404).json({
                success: false,
                message: `No active prompt found for type: ${type}`
            });
        }

        res.json({
            success: true,
            data: prompt
        });
    } catch (error) {
        console.error('Error fetching active prompt:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch active prompt',
            error: error.message
        });
    }
});

// Create new prompt
app.post('/api/prompts', async (req, res) => {
    try {
        const { name, type, content, description, createdBy = 'admin' } = req.body;

        if (!name || !type || !content) {
            return res.status(400).json({
                success: false,
                message: 'Name, type, and content are required'
            });
        }

        const lastPrompt = await Prompt.findOne({
            where: { type },
            order: [['version', 'DESC']]
        });

        const nextVersion = lastPrompt ? lastPrompt.version + 1 : 1;

        const prompt = await Prompt.create({
            name,
            type,
            content,
            description,
            version: nextVersion,
            createdBy,
            isActive: false
        });

        res.json({
            success: true,
            message: 'Prompt created successfully',
            data: prompt
        });
    } catch (error) {
        console.error('Error creating prompt:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create prompt',
            error: error.message
        });
    }
});

// Update prompt
app.put('/api/prompts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, content, description } = req.body;

        const prompt = await Prompt.findByPk(id);

        if (!prompt) {
            return res.status(404).json({
                success: false,
                message: 'Prompt not found'
            });
        }

        await prompt.update({
            name: name || prompt.name,
            content: content || prompt.content,
            description: description || prompt.description
        });

        openaiService.clearPromptCache();

        res.json({
            success: true,
            message: 'Prompt updated successfully',
            data: prompt
        });
    } catch (error) {
        console.error('Error updating prompt:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update prompt',
            error: error.message
        });
    }
});

// Activate prompt
app.post('/api/prompts/:id/activate', async (req, res) => {
    try {
        const { id } = req.params;

        const prompt = await Prompt.activatePrompt(id);
        openaiService.clearPromptCache();

        res.json({
            success: true,
            message: `Prompt activated successfully for type: ${prompt.type}`,
            data: prompt
        });
    } catch (error) {
        console.error('Error activating prompt:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to activate prompt',
            error: error.message
        });
    }
});

// =============================================================================
// TESTING ENDPOINTS
// =============================================================================

// Testing API endpoints
app.post('/api/testing/generate-response', async (req, res) => {
    try {
        const {
            reviewData,
            technicianData,
            responsePrompt,
            useCustomPrompts = false
        } = req.body;

        if (!reviewData || !technicianData) {
            return res.status(400).json({
                success: false,
                message: 'Review data and technician data are required'
            });
        }

        let result;

        if (useCustomPrompts && responsePrompt) {
            result = await openaiService.generateResponseWithCustomPrompts(
                reviewData,
                technicianData,
                responsePrompt
            );
        } else {
            result = await openaiService.generateReviewResponse(reviewData, technicianData);
        }

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate response',
                error: result.error,
                fallbackResponse: result.fallbackResponse
            });
        }

        res.json({
            success: true,
            data: {
                response: result.response,
                usage: result.usage,
                prompt: result.prompt
            }
        });
    } catch (error) {
        console.error('Error in testing endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate test response',
            error: error.message
        });
    }
});

// Get sample reviews for testing
app.get('/api/testing/sample-reviews', async (req, res) => {
    try {
        const sampleReviews = [
            {
                id: 'sample_1',
                customerName: 'John Smith',
                rating: 5,
                text: 'Excellent service! The technician was professional and thorough.',
                date: new Date().toISOString(),
                sentiment: 'positive'
            },
            {
                id: 'sample_2',
                customerName: 'Sarah Johnson',
                rating: 2,
                text: 'The technician was 2 hours late and didn\'t explain what he was doing.',
                date: new Date().toISOString(),
                sentiment: 'negative'
            },
            {
                id: 'sample_3',
                customerName: 'Mike Wilson',
                rating: 4,
                text: 'Good service overall, but could have been more communicative about the process.',
                date: new Date().toISOString(),
                sentiment: 'positive'
            }
        ];

        res.json({
            success: true,
            data: sampleReviews
        });
    } catch (error) {
        console.error('Error fetching sample reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sample reviews',
            error: error.message
        });
    }
});

// =============================================================================
// DATABASE INITIALIZATION
// =============================================================================

// Database initialization
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');

        await sequelize.sync({ alter: true });
        console.log('✅ Database models synchronized.');

        const clientCount = await Client.count();
        if (clientCount === 0) {
            await createSampleData();
        }

        await createEjentoSampleData();
        await createDefaultPrompts();

    } catch (error) {
        console.error('❌ Unable to connect to database:', error);
    }
}

// Create sample data function
async function createSampleData() {
    try {
        console.log('🌱 Creating sample data...');

        const client = await Client.create({
            name: 'Hivemind Pest Control',
            email: 'admin@hivemind.com',
            googleAccountId: 'sample_account_id',
            googleBusinessProfileId: 'sample_profile_id',
            isActive: true
        });

        const antoine = await Technician.create({
            clientId: client.id,
            name: 'Antoine Clipper',
            email: 'antoine@hivemind.com',
            crmCode: 'TECH001',
            persona: {
                communicationStyle: 'friendly and professional',
                personality: 'detail-oriented and customer-focused',
                traits: ['thorough', 'punctual', 'communicative']
            },
            isActive: true
        });

        const marcus = await Technician.create({
            clientId: client.id,
            name: 'Marcus Wilson',
            email: 'marcus@hivemind.com',
            crmCode: 'TECH002',
            persona: {
                communicationStyle: 'professional and concise',
                personality: 'solution-focused and efficient',
                traits: ['experienced', 'reliable', 'technical']
            },
            isActive: true
        });

        const aaron = await Technician.create({
            clientId: client.id,
            name: 'Aaron Rodriguez',
            email: 'aaron@hivemind.com',
            crmCode: 'TECH003',
            persona: {
                communicationStyle: 'professional and concise',
                personality: 'solution-focused and efficient',
                traits: ['experienced', 'reliable', 'technical']
            },
            isActive: true
        });

        await Review.create({
            clientId: client.id,
            technicianId: antoine.id,
            customerName: 'Jamal Jefferson',
            rating: 5,
            text: 'Hivemind was the place you can count on when you need to get rid of pesky, unwelcome guests. Antoine was professional and thorough.',
            reviewDate: new Date('2022-09-29'),
            sentiment: 'positive',
            sentimentScore: 0.95,
            status: 'responded',
            responseText: 'Thank you so much for the kind words, Jamal! I really appreciate you taking the time to share your experience.',
            responseDate: new Date('2022-09-30'),
            source: 'google',
            responseApprovalStatus: 'pending'
        });

        await Review.create({
            clientId: client.id,
            technicianId: marcus.id,
            customerName: 'Saurabh Neis',
            rating: 5,
            text: 'Professional service, but the technician was 3 hours late to the appointment.',
            reviewDate: new Date('2022-09-24'),
            sentiment: 'positive',
            sentimentScore: 0.7,
            status: 'pending',
            source: 'google',
            responseApprovalStatus: 'pending'
        });

        await Review.create({
            clientId: client.id,
            technicianId: aaron.id,
            customerName: 'Christina Keller',
            rating: 1,
            text: 'Terrible customer service, wouldn\'t recommend to my worst enemies.',
            reviewDate: new Date('2022-09-21'),
            sentiment: 'negative',
            sentimentScore: 0.1,
            status: 'pending',
            source: 'google',
            responseApprovalStatus: 'pending'
        });

        console.log('✅ Sample data created successfully.');
    } catch (error) {
        console.error('❌ Error creating sample data:', error);
    }
}

async function createEjentoSampleData() {
    try {
        console.log('🔗 Creating Ejento integration sample data...');

        const existingMapping = await EjentoLocationMapping.count();
        if (existingMapping > 0) {
            console.log('✅ Ejento sample data already exists.');
            return;
        }

        const client = await Client.findOne({
            where: { name: 'Hivemind Pest Control' }
        });

        if (!client) {
            throw new Error('No client found. Please run createSampleData first.');
        }

        const locationMapping = await EjentoLocationMapping.create({
            ejentoLocationId: 'BFSHDH1284FHT',
            clientId: client.id,
            locationName: 'Hivemind Pest Control - Main Location',
            isActive: true
        });

        const antoine = await Technician.findOne({
            where: { crmCode: 'TECH001' }
        });

        const marcus = await Technician.findOne({
            where: { crmCode: 'TECH002' }
        });

        const aaron = await Technician.findOne({
            where: { crmCode: 'TECH003' }
        });

        if (!antoine || !marcus || !aaron) {
            throw new Error('Technicians not found. Please run createSampleData first.');
        }

        await EjentoUserMapping.create({
            ejentoUserId: 'FHUDHWUE4884',
            technicianId: antoine.id,
            ejentoLocationMappingId: locationMapping.id,
            userRole: 'technician',
            isActive: true
        });

        await EjentoUserMapping.create({
            ejentoUserId: 'GHKJL9876543',
            technicianId: marcus.id,
            ejentoLocationMappingId: locationMapping.id,
            userRole: 'admin',
            isActive: true
        });

        await EjentoUserMapping.create({
            ejentoUserId: 'ALKJL9878888',
            technicianId: aaron.id,
            ejentoLocationMappingId: locationMapping.id,
            userRole: 'manager',
            isActive: true
        });

        await EjentoIntegration.create({
            clientId: client.id,
            googleAccountId: 'google_business_account_123',
            googleBusinessProfileId: 'google_business_profile_456',
            integrationStatus: 'active',
            syncSettings: {
                autoSync: true,
                syncFrequency: 'hourly',
                autoRespond: false
            },
            isActive: true
        });

        console.log('✅ Ejento integration sample data created successfully.');
        console.log('🔗 Test URLs:');
        console.log('   Antoine (Technician): /dashboard?location=BFSHDH1284FHT&user=FHUDHWUE4884');
        console.log('   Marcus (Admin): /dashboard?location=BFSHDH1284FHT&user=GHKJL9876543');
        console.log('   Aaron (Manager): /dashboard?location=BFSHDH1284FHT&user=ALKJL9878888');

    } catch (error) {
        console.error('❌ Error creating Ejento sample data:', error);
    }
}

async function createDefaultPrompts() {
    try {
        const promptCount = await Prompt.count();
        if (promptCount === 0) {
            console.log('🌱 Creating default prompt...');

            await Prompt.create({
                name: 'Default System Prompt',
                type: 'response_generation',
                content: `You are an AI assistant helping home service technicians respond to customer reviews. You excel at creating personalized, authentic responses that match each technician's unique communication style.

CORE PRINCIPLES:
- Write as the actual technician, not a company representative
- Match the specified communication style and personality exactly
- Address specific details mentioned in the review
- Show genuine appreciation for positive feedback
- Handle criticism with professionalism and solution-focused approach
- Keep responses conversational and authentic (avoid corporate speak)
- Maintain appropriate length (100-200 words)

RESPONSE STRUCTURE:
1. Personal greeting/acknowledgment
2. Address specific points from the review
3. Reflect the technician's personality naturally
4. Express gratitude or address concerns
5. Professional closing with future service invitation

Remember: Each technician has a unique voice - capture that authenticity while maintaining professionalism.

Generate a professional response to this customer review:

REVIEW DETAILS:
- Customer: {{customerName}}
- Rating: {{rating}}/5 stars
- Review: "{{reviewText}}"
- Date: {{reviewDate}}
- Sentiment: {{sentiment}}

TECHNICIAN PERSONA:
- Name: {{technicianName}}
- Communication Style: {{communicationStyle}}
- Personality: {{personality}}
- Traits: {{traits}}

RESPONSE REQUIREMENTS:
1. Write as if you are {{technicianName}} responding personally
2. Match the communication style: {{communicationStyle}}
3. Address the specific points mentioned in the review
4. Keep response under 150 words
5. Be authentic and {{personality}}
6. Include gratitude for the feedback
7. {{ratingGuidance}}
8. Invite future business if appropriate

Generate only the response text, no additional formatting or explanations.`,
                isActive: true,
                createdBy: 'system',
                description: 'Combined system and response generation prompt for creating review responses using technician personas'
            });

            console.log('✅ Default prompt created successfully.');
        }
    } catch (error) {
        console.error('❌ Error creating default prompt:', error);
    }
}

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Something went wrong!',
        message: err.message
    });
});

// Initialize database and start server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Ejento Elevate Server running on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        console.log(`🤖 AI test: http://localhost:${PORT}/api/ai/test`);
        console.log(`🗄️ Connected to Database`);
        console.log(`🔑 OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
        console.log('');
        console.log('🔗 Test URLs:');
        console.log(`   Antoine (Technician): http://localhost:3001/dashboard?location=BFSHDH1284FHT&user=FHUDHWUE4884`);
        console.log(`   Marcus (Admin): http://localhost:3001/dashboard?location=BFSHDH1284FHT&user=GHKJL9876543`);
        console.log(`   Aaron (Manager): http://localhost:3001/dashboard?location=BFSHDH1284FHT&user=ALKJL9878888`);
    });
});