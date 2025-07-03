'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class TechnicianActivePrompt extends Model {
        static associate(models) {
            // Associate with Technician
            TechnicianActivePrompt.belongsTo(models.Technician, {
                foreignKey: 'technicianId',
                as: 'technician'
            });

            // Associate with Prompt
            TechnicianActivePrompt.belongsTo(models.Prompt, {
                foreignKey: 'promptId',
                as: 'prompt'
            });
        }
    }

    TechnicianActivePrompt.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        technicianId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Technicians',
                key: 'id'
            }
        },
        promptId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Prompts',
                key: 'id'
            }
        },
        type: {
            type: DataTypes.ENUM('response_generation'),
            allowNull: false
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        sequelize,
        modelName: 'TechnicianActivePrompt',
        tableName: 'TechnicianActivePrompts',
        indexes: [
            {
                unique: true,
                fields: ['technicianId', 'type'] // Only one active prompt per technician per type
            },
            {
                fields: ['promptId']
            },
            {
                fields: ['type']
            },
            {
                fields: ['isActive']
            }
        ]
    });

    return TechnicianActivePrompt;
};