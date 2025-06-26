const jwt = require('jsonwebtoken');
const { Technician } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const token = req.cookies.authToken || req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        // Get the technician from database
        const technician = await Technician.findByPk(decoded.technicianId, {
            include: [
                {
                    model: require('../models').Client,
                    as: 'client',
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!technician || !technician.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or inactive technician'
            });
        }

        // Attach technician info to request
        req.technician = technician;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// Generate JWT token
const generateToken = (technicianId) => {
    return jwt.sign(
        { technicianId },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

// Middleware for optional authentication (for public routes)
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.cookies.authToken || req.headers.authorization?.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            const technician = await Technician.findByPk(decoded.technicianId);

            if (technician && technician.isActive) {
                req.technician = technician;
            }
        }
    } catch (error) {
        // Ignore token errors for optional auth
    }
    next();
};

module.exports = {
    authenticateToken,
    generateToken,
    optionalAuth,
    JWT_SECRET
};