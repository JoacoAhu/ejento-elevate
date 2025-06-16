const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Import OpenAI service
const openaiService = require('./services/openaiService');

const app = express();
const PORT = process.env.PORT || 8000;

// Database connection
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USERNAME,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: false, // Set to console.log to see SQL queries
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Define Models
const Client = sequelize.define('Client', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    googleAccountId: DataTypes.STRING,
    googleBusinessProfileId: DataTypes.STRING,
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

const Technician = sequelize.define('Technician', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    clientId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: DataTypes.STRING,
    crmCode: DataTypes.STRING,
    persona: {
        type: DataTypes.JSON,
        defaultValue: {
            communicationStyle: 'professional and friendly',
            personality: 'customer-focused and reliable',
            traits: ['professional', 'helpful', 'thorough']
        }
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

const Review = sequelize.define('Review', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    clientId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    technicianId: DataTypes.INTEGER,
    googleReviewId: DataTypes.STRING,
    customerName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        }
    },
    text: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    sentiment: DataTypes.STRING,
    sentimentScore: DataTypes.FLOAT,
    reviewDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    responseText: DataTypes.TEXT,
    responseDate: DataTypes.DATE,
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending'
    },
    source: {
        type: DataTypes.STRING,
        defaultValue: 'google'
    }
});

// Define associations
Client.hasMany(Technician, { foreignKey: 'clientId' });
Client.hasMany(Review, { foreignKey: 'clientId' });
Technician.belongsTo(Client, { foreignKey: 'clientId' });
Technician.hasMany(Review, { foreignKey: 'technicianId' });
Review.belongsTo(Client, { foreignKey: 'clientId' });
Review.belongsTo(Technician, { foreignKey: 'technicianId' });

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
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

    } catch (error) {
        console.error('❌ Unable to connect to database:', error);
    }
}

// Create sample data
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
            source: 'google'
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
            source: 'google'
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
            source: 'google'
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

// Get all reviews
app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.findAll({
            include: [
                {
                    model: Technician,
                    attributes: ['id', 'name', 'email', 'persona']
                },
                {
                    model: Client,
                    attributes: ['id', 'name']
                }
            ],
            order: [['reviewDate', 'DESC']]
        });

        // Format the data for frontend compatibility
        const formattedReviews = reviews.map(review => ({
            id: review.id,
            customerName: review.customerName,
            technicianName: review.Technician ? review.Technician.name : 'Unknown',
            rating: review.rating,
            text: review.text,
            date: review.reviewDate,
            sentiment: review.sentiment,
            responded: review.status === 'responded',
            source: review.source,
            responseText: review.responseText,
            responseDate: review.responseDate
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

// Get dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const totalReviews = await Review.count();
        const averageRating = await Review.findAll({
            attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']]
        });
        const activeTechnicians = await Technician.count({ where: { isActive: true } });

        // Calculate total rewards (assuming $5 per positive review)
        const positiveReviews = await Review.count({ where: { rating: { [sequelize.Op.gte]: 4 } } });
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

        if (review.status === 'responded') {
            return res.status(400).json({
                success: false,
                message: 'Review already has a response'
            });
        }

        // Generate AI response
        console.log(`Generating AI response for review ${reviewId}...`);
        const aiResult = await openaiService.generateReviewResponse(
            {
                customerName: review.customerName,
                rating: review.rating,
                text: review.text,
                date: review.reviewDate,
                sentiment: review.sentiment
            },
            review.Technician
        );

        if (!aiResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate AI response',
                error: aiResult.error,
                fallbackResponse: aiResult.fallbackResponse
            });
        }

        // Update the review in database
        await review.update({
            responseText: aiResult.response,
            responseDate: new Date(),
            status: 'responded'
        });

        res.json({
            success: true,
            message: 'AI response generated successfully',
            data: {
                reviewId: reviewId,
                response: aiResult.response,
                usage: aiResult.usage,
                review: {
                    id: review.id,
                    responseText: aiResult.response,
                    responseDate: new Date(),
                    status: 'responded'
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

        // Get the first client (or create logic to determine client)
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