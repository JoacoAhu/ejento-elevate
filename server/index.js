const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Sequelize, DataTypes, Op } = require('sequelize');
require('dotenv').config();

// Import models from the models directory
const db = require('./models');
const { Client, Technician, Review, Prompt } = db;

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

// Database initialization
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');

        // Sync models (create tables if they don't exist)
        await sequelize.sync({ alter: true });
        console.log('✅ Database models synchronized.');

        // Check if we have sample data, if not create some
        const clientCount = await Client.count();
        if (clientCount === 0) {
            await createSampleData();
        }

        await createDefaultPrompts();

    } catch (error) {
        console.error('❌ Unable to connect to database:', error);
    }
}

// Create sample data function
async function createSampleData() {
    try {
        console.log('🌱 Creating sample data...');

        // Create sample client
        const client = await Client.create({
            name: 'Hivemind Pest Control',
            email: 'admin@hivemind.com',
            googleAccountId: 'sample_account_id',
            googleBusinessProfileId: 'sample_profile_id',
            isActive: true
        });

        // Create sample technicians
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

        // Create sample reviews
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
            technicianId: null,
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

// Health check
app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            message: 'Ejento Elevate Server is running!',
            database: 'AWS Aurora - Connected',
            ai: process.env.OPENAI_API_KEY ? 'OpenAI configured' : 'OpenAI not configured'
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            message: 'Database connection failed',
            database: 'AWS Aurora - Disconnected',
            error: error.message
        });
    }
});

app.post('/api/reviews/:id/approve', async (req, res) => {
    try {
        const reviewId = parseInt(req.params.id);
        const { action, approvedBy } = req.body;

        const review = await Review.findByPk(reviewId);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        const isNegative = review.rating <= 2 || review.sentiment === 'negative';

        if (!isNegative) {
            return res.status(400).json({
                success: false,
                message: 'Only negative reviews require approval'
            });
        }

        const approvalStatus = action === 'approve' ? 'approved' : 'rejected';

        await review.update({
            responseApprovalStatus: approvalStatus,
            responseApprovedBy: approvedBy,
            responseApprovedAt: new Date()
        });

        res.json({
            success: true,
            message: `Review ${approvalStatus} successfully`,
            data: {
                reviewId: reviewId,
                responseApprovalStatus: approvalStatus,
                responseApprovedBy: approvedBy,
                responseApprovedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error updating approval status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update approval status',
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

// UPDATED Get all reviews endpoint with publishing fields
app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.findAll({
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

        // Format the data for frontend compatibility
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
            total: formattedReviews.length
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews',
            error: error.message
        });
    }
});

async function findTechnicianByCrmCode(crmCode) {
    return await Technician.findOne({
        where: { crmCode: crmCode, isActive: true },
        include: [
            {
                model: Client,
                as: 'client',
                attributes: ['id', 'name']
            }
        ]
    });
}

// Get single technician with persona
app.get('/api/technicians/crm/:crmCode', async (req, res) => {
    try {
        const crmCode = req.params.crmCode;

        const technician = await findTechnicianByCrmCode(crmCode);

        if (!technician) {
            return res.status(404).json({
                success: false,
                message: `Technician with CRM code ${crmCode} not found`
            });
        }

        res.json({
            success: true,
            data: {
                id: technician.id,
                name: technician.name,
                email: technician.email,
                crmCode: technician.crmCode,
                persona: technician.persona,
                isActive: technician.isActive,
                client: technician.client
            }
        });

    } catch (error) {
        console.error('Error fetching technician by CRM code:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch technician',
            error: error.message
        });
    }
});

// Update technician persona
app.put('/api/technicians/crm/:crmCode/persona', async (req, res) => {
    try {
        const crmCode = req.params.crmCode;
        const { persona } = req.body;

        // Validate persona structure
        if (!persona || typeof persona !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Invalid persona data'
            });
        }

        const technician = await findTechnicianByCrmCode(crmCode);

        if (!technician) {
            return res.status(404).json({
                success: false,
                message: `Technician with CRM code ${crmCode} not found`
            });
        }

        // Update the technician's persona
        await technician.update({
            persona: {
                traits: persona.traits || [],
                personality: persona.personality || '',
                communicationStyle: persona.communicationStyle || ''
            }
        });

        res.json({
            success: true,
            message: 'Persona updated successfully',
            data: {
                crmCode: crmCode,
                name: technician.name,
                persona: technician.persona
            }
        });

    } catch (error) {
        console.error('Error updating technician persona:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update persona',
            error: error.message
        });
    }
});


// Get dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const totalReviews = await Review.count();
        const averageRating = await Review.findAll({
            attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']]
        });
        const activeTechnicians = await Technician.count({ where: { isActive: true } });

        // Calculate total rewards (assuming $5 per positive review)
        const positiveReviews = await Review.count({ where: { rating: { [Op.gte]: 4 } } });
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
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard stats',
            error: error.message
        });
    }
});

// Generate AI response for a review
app.post('/api/reviews/:id/generate-response', async (req, res) => {
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

        // Update the review in database
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
        console.error('Generate response error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

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

        // Check if review is negative
        const isNegative = review.rating <= 2 || review.sentiment === 'negative';

        if (!isNegative) {
            return res.status(400).json({
                success: false,
                message: 'Only negative reviews require response approval'
            });
        }

        // Approve the response
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

        // Simulate API delay (remove this in production)
        await new Promise(resolve => setTimeout(resolve, 1000));

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

// Analyze sentiment of text
app.post('/api/ai/analyze-sentiment', async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
                message: 'Text is required'
            });
        }

        const sentiment = await openaiService.analyzeSentiment(text);

        res.json({
            success: true,
            data: sentiment
        });

    } catch (error) {
        console.error('Sentiment analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Sentiment analysis failed',
            error: error.message
        });
    }
});

// Get technicians
app.get('/api/technicians', async (req, res) => {
    try {
        const technicians = await Technician.findAll({
            where: { isActive: true },
            include: [
                {
                    model: Client,
                    as: 'client', // Add the alias
                    attributes: ['id', 'name']
                }
            ]
        });

        res.json({
            success: true,
            data: technicians,
            total: technicians.length
        });
    } catch (error) {
        console.error('Error fetching technicians:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch technicians',
            error: error.message
        });
    }
});
// Add new review (for testing)
app.post('/api/reviews', async (req, res) => {
    try {
        const { customerName, rating, text, technicianId } = req.body;

        const client = await Client.findOne();

        const review = await Review.create({
            clientId: client.id,
            technicianId: technicianId || null,
            customerName: customerName,
            rating: rating,
            text: text,
            reviewDate: new Date(),
            status: 'pending',
            source: 'manual'
        });

        res.json({
            success: true,
            message: 'Review created successfully',
            data: review
        });
    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create review',
            error: error.message
        });
    }
});

app.get('/api/dashboard/top-technicians', async (req, res) => {
    try {
        const technicians = await Technician.findAll({
            where: { isActive: true },
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
        console.error('Error fetching top technicians:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch top technicians',
            error: error.message
        });
    }
});

// Optional: Add endpoint to get published responses
app.get('/api/reviews/published', async (req, res) => {
    try {
        const publishedReviews = await Review.findAll({
            where: {
                status: 'published',
                responseText: { [Op.not]: null } // Make sure Op is imported
            },
            include: [
                {
                    model: Technician,
                    as: 'technician', // Add the alias
                    attributes: ['id', 'name', 'email']
                }
            ],
            order: [['publishedAt', 'DESC']]
        });

        res.json({
            success: true,
            data: publishedReviews,
            total: publishedReviews.length,
            message: `Found ${publishedReviews.length} published responses`
        });

    } catch (error) {
        console.error('Error fetching published reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch published reviews',
            error: error.message
        });
    }
});

async function createDefaultPrompts() {
    try {
        const promptCount = await Prompt.count();
        if (promptCount === 0) {
            console.log('🌱 Creating default prompt...');

            // Create system prompt
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

        // Get the next version number for this type
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
            isActive: false // New prompts start as inactive
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

        // Clear the prompt cache when prompts are updated
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

// Activate prompt (deactivates others of same type)
app.post('/api/prompts/:id/activate', async (req, res) => {
    try {
        const { id } = req.params;

        const prompt = await Prompt.activatePrompt(id);

        // Clear the prompt cache when prompts are activated
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

// Testing API endpoints
app.post('/api/testing/generate-response', async (req, res) => {
    try {
        const {
            reviewData,
            technicianData,
            responsePrompt, // This should be the custom prompt content
            useCustomPrompts = false
        } = req.body;

        if (!reviewData || !technicianData) {
            return res.status(400).json({
                success: false,
                message: 'Review data and technician data are required'
            });
        }

        // Use custom prompts if provided, otherwise use the service's default method
        let result;

        if (useCustomPrompts && responsePrompt) {
            // Test with custom prompt
            result = await openaiService.generateResponseWithCustomPrompts(
                reviewData,
                technicianData,
                responsePrompt // Pass the custom prompt directly
            );
        } else {
            // Use existing method with database prompts
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
        console.log(`🗄️ Connected to AWS Aurora Database`);
        console.log(`🔑 OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
    });
});