'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class EjentoIntegration extends Model {
        static associate(models) {
            EjentoIntegration.belongsTo(models.Client, {
                foreignKey: 'clientId',
                as: 'client'
            });
        }
    }

    EjentoIntegration.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        clientId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Client this integration belongs to'
        },
        googleAccountId: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Google Business Profile account ID'
        },
        googleBusinessProfileId: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Google Business Profile location ID'
        },
        accessToken: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Encrypted Google access token'
        },
        refreshToken: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Encrypted Google refresh token'
        },
        tokenExpiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When the access token expires'
        },
        integrationStatus: {
            type: DataTypes.ENUM('active', 'inactive', 'error', 'pending'),
            defaultValue: 'pending'
        },
        lastSyncAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Last time reviews were synced'
        },
        syncSettings: {
            type: DataTypes.JSON,
            defaultValue: {
                autoSync: true,
                syncFrequency: 'hourly',
                autoRespond: false
            }
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
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
        modelName: 'EjentoIntegration',
        indexes: [
            {
                unique: true,
                fields: ['clientId']
            }
        ]
    });

    return EjentoIntegration;
};