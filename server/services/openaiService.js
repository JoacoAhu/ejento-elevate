// server/services/openaiService.js
const OpenAI = require('openai');

class OpenAIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    /**
     * Generate a personalized response to a review based on technician persona
     */
    async generateReviewResponse(review, technician) {
        try {
            const prompt = this.buildResponsePrompt(review, technician);

            const completion = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: this.getSystemPrompt()
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 300,
                temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
                presence_penalty: 0.1,
                frequency_penalty: 0.1
            });

            const response = completion.choices[0]?.message?.content?.trim();

            if (!response) {
                throw new Error('No response generated from OpenAI');
            }

            return {
                success: true,
                response: response,
                usage: completion.usage
            };

        } catch (error) {
            console.error('OpenAI response generation failed:', error);
            return {
                success: false,
                error: error.message,
                fallbackResponse: this.getFallbackResponse(review.rating)
            };
        }
    }

    /**
     * Analyze sentiment of a review
     */
    async analyzeSentiment(reviewText) {
        try {
            const completion = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `You are a sentiment analysis expert. Analyze the sentiment of customer reviews and respond with only a JSON object containing:
{
  "sentiment": "positive|neutral|negative",
  "score": 0.0-1.0,
  "confidence": 0.0-1.0,
  "keywords": ["array", "of", "key", "sentiment", "words"]
}`
                    },
                    {
                        role: 'user',
                        content: `Analyze this review: "${reviewText}"`
                    }
                ],
                max_tokens: 150,
                temperature: 0.1
            });

            const result = JSON.parse(completion.choices[0].message.content);
            return result;

        } catch (error) {
            console.error('Sentiment analysis failed:', error);
            // Fallback sentiment analysis
            return this.basicSentimentAnalysis(reviewText);
        }
    }

    /**
     * Extract technician name from review text
     */
    async extractTechnicianName(reviewText, possibleNames) {
        try {
            const completion = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert at extracting technician names from customer reviews. 
Given a review and a list of possible technician names, identify which technician is mentioned.
Respond with only the exact name from the list, or "NONE" if no match is found.

Possible names: ${possibleNames.join(', ')}`
                    },
                    {
                        role: 'user',
                        content: `Review: "${reviewText}"`
                    }
                ],
                max_tokens: 50,
                temperature: 0.1
            });

            const extractedName = completion.choices[0].message.content.trim();
            return extractedName === 'NONE' ? null : extractedName;

        } catch (error) {
            console.error('Name extraction failed:', error);
            return this.basicNameExtraction(reviewText, possibleNames);
        }
    }

    /**
     * Build the prompt for generating review responses
     */
    buildResponsePrompt(review, technician) {
        const persona = technician?.persona || this.getDefaultPersona();

        return `Generate a professional response to this customer review:

REVIEW DETAILS:
- Customer: ${review.customerName}
- Rating: ${review.rating}/5 stars
- Review: "${review.text}"
- Date: ${review.date}
- Sentiment: ${review.sentiment}

TECHNICIAN PERSONA:
- Name: ${technician?.name || 'Our technician'}
- Communication Style: ${persona.communicationStyle}
- Personality: ${persona.personality}
- Industry: Home services/pest control

RESPONSE REQUIREMENTS:
1. Write as if you are ${technician?.name || 'the technician'} responding personally
2. Match the communication style: ${persona.communicationStyle}
3. Address the specific points mentioned in the review
4. Keep response under 150 words
5. Be authentic and ${persona.personality}
6. Include gratitude for the feedback
7. ${review.rating >= 4 ? 'Express appreciation' : 'Address concerns professionally'}
8. Invite future business if appropriate

Generate only the response text, no additional formatting or explanations.`;
    }

    /**
     * Get system prompt for response generation
     */
    getSystemPrompt() {
        return `You are an AI assistant helping home service technicians respond to customer reviews. You excel at creating personalized, authentic responses that match each technician's unique communication style.

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

Remember: Each technician has a unique voice - capture that authenticity while maintaining professionalism.`;
    }

    /**
     * Get default persona if none specified
     */
    getDefaultPersona() {
        return {
            communicationStyle: 'professional and friendly',
            personality: 'detail-oriented and customer-focused',
            traits: ['reliable', 'thorough', 'communicative']
        };
    }

    /**
     * Get fallback response for failed AI generation
     */
    getFallbackResponse(rating) {
        if (rating >= 4) {
            return "Thank you so much for your wonderful review! It means a lot to know that our service met your expectations. We truly appreciate your business and look forward to serving you again in the future.";
        } else if (rating >= 3) {
            return "Thank you for your feedback. We appreciate you taking the time to share your experience. If there's anything we can do to improve our service, please don't hesitate to reach out to us directly.";
        } else {
            return "Thank you for your feedback. We take all customer concerns seriously and would like the opportunity to make this right. Please contact us directly so we can address your concerns and improve your experience.";
        }
    }

    /**
     * Basic sentiment analysis fallback
     */
    basicSentimentAnalysis(text) {
        const positiveWords = ['great', 'excellent', 'amazing', 'professional', 'recommend', 'satisfied', 'helpful'];
        const negativeWords = ['terrible', 'awful', 'poor', 'disappointed', 'horrible', 'worst', 'unprofessional'];

        const lowerText = text.toLowerCase();
        const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
        const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

        if (positiveCount > negativeCount) {
            return { sentiment: 'positive', score: 0.7, confidence: 0.6 };
        } else if (negativeCount > positiveCount) {
            return { sentiment: 'negative', score: 0.3, confidence: 0.6 };
        } else {
            return { sentiment: 'neutral', score: 0.5, confidence: 0.5 };
        }
    }

    /**
     * Basic name extraction fallback
     */
    basicNameExtraction(text, possibleNames) {
        const lowerText = text.toLowerCase();

        for (const name of possibleNames) {
            const lowerName = name.toLowerCase();
            const nameParts = lowerName.split(' ');

            // Check if any part of the name appears in the text
            if (nameParts.some(part => lowerText.includes(part))) {
                return name;
            }
        }

        return null;
    }

    /**
     * Test the OpenAI connection
     */
    async testConnection() {
        try {
            const completion = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: 'Say "OpenAI connection successful" and nothing else.'
                    }
                ],
                max_tokens: 10
            });

            return {
                success: true,
                message: completion.choices[0].message.content,
                model: process.env.OPENAI_MODEL || 'gpt-4o'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new OpenAIService();