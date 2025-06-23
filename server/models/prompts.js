// server/models/prompt.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Prompt extends Model {
        static associate(models) {
            // Add associations here if needed in the future
        }
    }

    Prompt.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('response_generation'), // Only response_generation
            allowNull: false
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        version: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        createdBy: {
            type: DataTypes.STRING,
            defaultValue: 'admin'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'Prompt',
        indexes: [
            {
                unique: true,
                fields: ['type'],
                where: { isActive: true },
                name: 'unique_active_prompt_per_type'
            }
        ]
    });

    return Prompt;
};