'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Technician extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Technician.belongsTo(models.Client, {
        foreignKey: 'clientId',
        as: 'client'
      });
      Technician.hasMany(models.Review, {
        foreignKey: 'technicianId',
        as: 'reviews'
      });
    }
  }
  Technician.init({
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    crmCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    persona: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        communicationStyle: 'professional and friendly',
        personality: 'customer-focused and reliable',
        traits: ['professional', 'helpful', 'thorough']
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Technician',
  });
  return Technician;
};