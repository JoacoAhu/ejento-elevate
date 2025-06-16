const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import OpenAI service
const openaiService = require('./services/openaiService');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// Mock data with enhanced details
const mockReviews = [
    {
        id: 1,
        customerName: 'Jamal Jefferson',
        technicianName: 'Antoine Clipper',
        rating: 5,
        text: 'Hivemind was the place you can count on when you need to get rid of pesky, unwelcome guests. Antoine was professional and thorough.',
        date: '2022-09-29',
        sentiment: 'positive',
        responded: true,
        source: 'google',
        responseText: 'Thank you so much for the kind words, Jamal! I really appreciate you taking the time to share your experience.',
        responseDate: '2022-09-30'
    },
    {
        id: 2,
        customerName: 'Saurabh Neis',
        technicianName: 'Marcus Wilson',
        rating: 5,
        text: 'Professional service, but the technician was 3 hours late to the appointment.',
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
];

const mockTechnicians = [
    {
        id: 1,
        name: 'Antoine Clipper',
        email: 'antoine@hivemind.com',
        persona: {
            communicationStyle: 'friendly and professional',
            personality: 'detail-oriented and customer-focused',
            traits: ['thorough', 'punctual', 'communicative']
        }
    },
    {
        id: 2,
        name: 'Marcus Wilson',
        email: 'marcus@hivemind.com',
        persona: {
            communicationStyle: 'professional and concise',
            personality: 'solution-focused and efficient',
            traits: ['experienced', 'reliable', 'technical']
        }
    }
];

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'Ejento Elevate Server is running!',
        database: 'Mock data (MySQL connection pending)',
        ai: process.env.OPENAI_API_KEY ? 'OpenAI configured' : 'OpenAI not configured'
    });
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
app.get('/api/reviews', (req, res) => {
    res.json({
        success: true,
        data: mockReviews,
        total: mockReviews.length
    });
});

// Get dashboard stats
app.get('/api/dashboard/stats', (req, res) => {
    res.json({
        success: true,
        data: {
            totalReviews: 1247,
            averageRating: 4.7,
            activeTechnicians: 28,
            totalRewards: 12450
        }
    });
});

// Generate AI response for a review
app.post('/api/reviews/:id/generate-response', async (req, res) => {
    try {
        const reviewId = parseInt(req.params.id);
        const review = mockReviews.find(r => r.id === reviewId);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        if (review.responded) {
            return res.status(400).json({
                success: false,
                message: 'Review already has a response'
            });
        }

        // Find technician
        const technician = mockTechnicians.find(t => t.name === review.technicianName);

        if (!technician && review.technicianName !== 'Unknown') {
            return res.status(400).json({
                success: false,
                message: 'Technician not found'
            });
        }

        // Generate AI response
        console.log(`Generating AI response for review ${reviewId}...`);
        const aiResult = await openaiService.generateReviewResponse(review, technician);

        if (!aiResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate AI response',
                error: aiResult.error,
                fallbackResponse: aiResult.fallbackResponse
            });
        }

        // Update the mock review (in real app, this would update the database)
        review.responseText = aiResult.response;
        review.responseDate = new Date().toISOString();
        review.responded = true;

        res.json({
            success: true,
            message: 'AI response generated successfully',
            data: {
                reviewId: reviewId,
                response: aiResult.response,
                usage: aiResult.usage,
                review: review
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

// Extract technician name from review
app.post('/api/ai/extract-technician', async (req, res) => {
    try {
        const { text, possibleNames } = req.body;

        if (!text || !possibleNames) {
            return res.status(400).json({
                success: false,
                message: 'Text and possibleNames are required'
            });
        }

        const extractedName = await openaiService.extractTechnicianName(text, possibleNames);

        res.json({
            success: true,
            data: {
                extractedName,
                confidence: extractedName ? 0.8 : 0.0
            }
        });

    } catch (error) {
        console.error('Name extraction error:', error);
        res.status(500).json({
            success: false,
            message: 'Name extraction failed',
            error: error.message
        });
    }
});

// Get technicians
app.get('/api/technicians', (req, res) => {
    res.json({
        success: true,
        data: mockTechnicians,
        total: mockTechnicians.length
    });
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

app.listen(PORT, () => {
    console.log(`🚀 Ejento Elevate Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🤖 AI test: http://localhost:${PORT}/api/ai/test`);
    console.log(`🗄️ Using mock data (database connection pending)`);
    console.log(`🔑 OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured - add OPENAI_API_KEY to .env'}`);
});