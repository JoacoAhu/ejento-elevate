'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class EjentoLocationMapping extends Model {
        static associate(models) {
            // Each Ejento location maps to one Client
            EjentoLocationMapping.belongsTo(models.Client, {
                foreignKey: 'clientId',
                as: 'client'
            });
        }
    }

    EjentoLocationMapping.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        ejentoLocationId: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            comment: 'Hashed location ID from Ejento (e.g., BFSHDH1284FHT)'
        },
        clientId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Internal Client ID in our system'
        },
        locationName: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Human-readable location name for reference'
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
        modelName: 'EjentoLocationMapping',
        indexes: [
            {
                unique: true,
                fields: ['ejentoLocationId']
            }
        ]
    });

    return EjentoLocationMapping;
};