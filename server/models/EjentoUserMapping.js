// Small enhancement to your EjentoUserMapping model
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class EjentoUserMapping extends Model {
        static associate(models) {
            // Each Ejento user maps to one Technician
            EjentoUserMapping.belongsTo(models.Technician, {
                foreignKey: 'technicianId',
                as: 'technician'
            });

            // Also reference the location mapping
            EjentoUserMapping.belongsTo(models.EjentoLocationMapping, {
                foreignKey: 'ejentoLocationMappingId',
                as: 'locationMapping'
            });
        }

        // Helper method to check permissions
        canAccessTechnician(technicianId) {
            if (this.userRole === 'admin' || this.userRole === 'manager') {
                return true; // Admins/managers can access all technicians in their location
            }
            return this.technicianId === technicianId; // Technicians can only access their own data
        }

        // Helper method to check if user can manage integrations
        canManageIntegrations() {
            return this.userRole === 'admin';
        }
    }

    EjentoUserMapping.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        ejentoUserId: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            comment: 'Hashed user ID from Ejento (e.g., FHUDHWUE4884)'
        },
        technicianId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Internal Technician ID in our system'
        },
        ejentoLocationMappingId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Reference to the location mapping'
        },
        userRole: {
            type: DataTypes.ENUM('technician', 'admin', 'manager'),
            defaultValue: 'technician',
            comment: 'User role in the system'
        },
        // ENHANCEMENT: Add permissions for granular control
        permissions: {
            type: DataTypes.JSON,
            defaultValue: {
                canGenerateResponses: true,
                canApproveResponses: false,
                canPublishResponses: false,
                canViewAllReviews: false,
                canManagePrompts: false
            },
            comment: 'Granular permissions for this user'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        lastAccessAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Last time this user accessed the system'
        },
        // ENHANCEMENT: Track failed access attempts
        failedAccessAttempts: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Number of failed access attempts'
        },
        lastFailedAccessAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Last failed access attempt'
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'EjentoUserMapping',
        indexes: [
            {
                unique: true,
                fields: ['ejentoUserId']
            },
            {
                fields: ['ejentoLocationMappingId']
            },
            {
                fields: ['technicianId']
            },
            {
                fields: ['isActive', 'lastAccessAt'] // For finding active users
            }
        ]
    });

    return EjentoUserMapping;
};