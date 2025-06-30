const jwt = require('jsonwebtoken');

const db = require('../models');
const { EjentoLocationMapping, EjentoUserMapping, Technician, Client } = db;

const EJENTO_SECRET = process.env.EJENTO_SECRET || 'ejento-verify-secret-key';

// Middleware to authenticate via URL parameters (for iframe embedding)
const authenticateEjentoUser = async (req, res, next) => {
    try {
        // Get parameters from URL query string
        const { location, user, token } = req.query;

        if (!location || !user) {
            return res.status(401).json({
                success: false,
                message: 'Missing required parameters: location and user'
            });
        }

        // Verify the request is coming from Ejento (optional but recommended)
        if (token) {
            try {
                jwt.verify(token, EJENTO_SECRET);
            } catch (error) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid verification token'
                });
            }
        }

        // Look up the location mapping
        const locationMapping = await EjentoLocationMapping.findOne({
            where: {
                ejentoLocationId: location,
                isActive: true
            },
            include: [
                {
                    model: Client,
                    as: 'client',
                    attributes: ['id', 'name', 'email', 'isActive']
                }
            ]
        });

        if (!locationMapping || !locationMapping.client || !locationMapping.client.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or inactive location'
            });
        }

        // Look up the user mapping
        const userMapping = await EjentoUserMapping.findOne({
            where: {
                ejentoUserId: user,
                ejentoLocationMappingId: locationMapping.id,
                isActive: true
            },
            include: [
                {
                    model: Technician,
                    as: 'technician',
                    attributes: ['id', 'name', 'email', 'crmCode', 'persona', 'isActive']
                }
            ]
        });

        if (!userMapping || !userMapping.technician || !userMapping.technician.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or inactive user'
            });
        }

        // Update last access time
        await userMapping.update({ lastAccessAt: new Date() });

        // Attach context to request
        req.ejento = {
            locationId: location,
            userId: user,
            client: locationMapping.client,
            technician: userMapping.technician,
            userRole: userMapping.userRole,
            locationMapping: locationMapping,
            userMapping: userMapping
        };

        // For backward compatibility, also set req.technician
        req.technician = userMapping.technician;

        next();
    } catch (error) {
        console.error('Ejento auth error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error',
            error: error.message
        });
    }
};

// Generate a verification token for Ejento requests
const generateEjentoToken = (locationId, userId) => {
    return jwt.sign(
        {
            locationId,
            userId,
            timestamp: Date.now(),
            issuer: 'ejento'
        },
        EJENTO_SECRET,
        { expiresIn: '1h' }
    );
};

// Middleware to check if user has admin privileges
const requireAdminRole = (req, res, next) => {
    if (!req.ejento || req.ejento.userRole !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required'
        });
    }
    next();
};

// Middleware to check if user has manager or admin privileges
const requireManagerRole = (req, res, next) => {
    if (!req.ejento || !['admin', 'manager'].includes(req.ejento.userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager or admin privileges required'
        });
    }
    next();
};

module.exports = {
    authenticateEjentoUser,
    generateEjentoToken,
    requireAdminRole,
    requireManagerRole,
    EJENTO_SECRET
};