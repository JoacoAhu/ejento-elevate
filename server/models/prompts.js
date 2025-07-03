'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Prompt extends Model {
        static associate(models) {
            // Associate prompts with technicians
            Prompt.belongsTo(models.Technician, {
                foreignKey: 'technicianId',
                as: 'technician',
                allowNull: true // Allow null for system prompts
            });

            // Add association for technician active prompts tracking
            Prompt.hasMany(models.TechnicianActivePrompt, {
                foreignKey: 'promptId',
                as: 'technicianActivations'
            });
        }

        // Modified method to handle technician-specific activation logic
        static async activatePrompt(promptId, technicianId) {
            if (!technicianId) {
                throw new Error('Technician ID is required for prompt activation');
            }

            const transaction = await sequelize.transaction();

            try {
                // Find the prompt to activate
                const promptToActivate = await this.findByPk(promptId, { transaction });

                if (!promptToActivate) {
                    throw new Error('Prompt not found');
                }

                // Get TechnicianActivePrompt model from sequelize.models
                const TechnicianActivePrompt = sequelize.models.TechnicianActivePrompt;

                // Deactivate all currently active prompts for this technician
                await TechnicianActivePrompt.destroy({
                    where: {
                        technicianId: technicianId,
                        type: promptToActivate.type
                    },
                    transaction
                });

                // ALWAYS clear isActive flag on all personal prompts for this technician
                // This ensures personal prompts are deactivated when system prompts are activated
                await this.update(
                    { isActive: false },
                    {
                        where: {
                            type: promptToActivate.type,
                            technicianId: technicianId
                        },
                        transaction
                    }
                );

                // Create new activation record for this technician
                await TechnicianActivePrompt.create({
                    technicianId: technicianId,
                    promptId: promptId,
                    type: promptToActivate.type,
                    isActive: true
                }, { transaction });

                // For personal prompts, set the specific prompt as active
                if (promptToActivate.technicianId === technicianId) {
                    await promptToActivate.update({ isActive: true }, { transaction });
                }

                await transaction.commit();
                return promptToActivate;
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        }

        // Get active prompt for a specific technician
        static async getActivePromptForTechnician(type, technicianId) {
            if (!technicianId) {
                // Fall back to system prompts only if no technician ID
                return await this.findOne({
                    where: {
                        type: type,
                        isActive: true,
                        technicianId: null
                    }
                });
            }

            // Get TechnicianActivePrompt model from sequelize.models
            const TechnicianActivePrompt = sequelize.models.TechnicianActivePrompt;

            // Find active prompt for this specific technician
            const activeRecord = await TechnicianActivePrompt.findOne({
                where: {
                    technicianId: technicianId,
                    type: type,
                    isActive: true
                },
                include: [
                    {
                        model: this,
                        as: 'prompt',
                        include: [
                            {
                                model: sequelize.models.Technician,
                                as: 'technician',
                                required: false
                            }
                        ]
                    }
                ]
            });

            if (activeRecord) {
                return activeRecord.prompt;
            }

            // No active prompt found for this technician
            return null;
        }

        // Check if a prompt is active for a specific technician
        static async isActiveForTechnician(promptId, technicianId) {
            if (!technicianId) return false;

            const TechnicianActivePrompt = sequelize.models.TechnicianActivePrompt;

            const activeRecord = await TechnicianActivePrompt.findOne({
                where: {
                    technicianId: technicianId,
                    promptId: promptId,
                    isActive: true
                }
            });

            return !!activeRecord;
        }

        // Get all prompts with their activation status for a specific technician
        static async getAllWithActivationStatus(type, technicianId) {
            const TechnicianActivePrompt = sequelize.models.TechnicianActivePrompt;

            let whereClause = {};
            if (type) {
                whereClause.type = type;
            }

            // Show technician's prompts + system prompts
            if (technicianId) {
                whereClause[sequelize.Sequelize.Op.or] = [
                    { technicianId: technicianId },
                    { technicianId: null } // System prompts
                ];
            }

            const prompts = await this.findAll({
                where: whereClause,
                include: [
                    {
                        model: sequelize.models.Technician,
                        as: 'technician',
                        attributes: ['id', 'name', 'crmCode'],
                        required: false
                    },
                    {
                        model: TechnicianActivePrompt,
                        as: 'technicianActivations',
                        where: technicianId ? { technicianId: technicianId } : {},
                        required: false
                    }
                ],
                order: [['type', 'ASC'], ['version', 'DESC'], ['createdAt', 'DESC']]
            });

            // Add activation status for the specific technician
            return prompts.map(prompt => {
                const promptData = prompt.toJSON();

                // Check if this prompt is active for the specific technician
                const isActiveForTechnician = prompt.technicianActivations &&
                    prompt.technicianActivations.length > 0 &&
                    prompt.technicianActivations[0].isActive;

                promptData.isActiveForCurrentTechnician = isActiveForTechnician;

                // Keep the original isActive for personal prompts
                if (prompt.technicianId === technicianId) {
                    promptData.isActive = prompt.isActive;
                } else {
                    // For system prompts or other technicians' prompts, isActive doesn't apply
                    promptData.isActive = false;
                }

                return promptData;
            });
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
        // Add technicianId to associate prompts with specific technicians
        technicianId: {
            type: DataTypes.INTEGER,
            allowNull: true, // null means it's a system prompt available to all
            references: {
                model: 'Technicians',
                key: 'id'
            }
        },
        createdBy: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [1, 64]
            }
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
            },
            {
                fields: ['createdBy']
            },
            {
                fields: ['technicianId']
            },
            // Composite index for finding active prompts by type and technician
            {
                fields: ['type', 'technicianId', 'isActive']
            }
        ]
    });

    return Prompt;
};