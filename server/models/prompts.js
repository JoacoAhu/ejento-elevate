'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Prompt extends Model {
        static associate(models) {
            // Add associations here if needed in the future
        }

        // Add a custom method to handle activation logic
        static async activatePrompt(promptId) {
            const transaction = await sequelize.transaction();

            try {
                // Find the prompt to activate
                const promptToActivate = await this.findByPk(promptId, { transaction });

                if (!promptToActivate) {
                    throw new Error('Prompt not found');
                }

                // Deactivate all other prompts of the same type
                await this.update(
                    { isActive: false },
                    {
                        where: {
                            type: promptToActivate.type,
                            id: { [sequelize.Sequelize.Op.ne]: promptId } // Exclude the current prompt
                        },
                        transaction
                    }
                );

                // Activate the selected prompt
                await promptToActivate.update({ isActive: true }, { transaction });

                await transaction.commit();
                return promptToActivate;
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
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
            type: DataTypes.ENUM('response_generation'),
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
                fields: ['type']
            },
            {
                fields: ['isActive']
            }
        ]
    });

    return Prompt;
};