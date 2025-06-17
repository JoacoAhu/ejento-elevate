'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Client extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Client.hasMany(models.Technician, {
        foreignKey: 'clientId',
        as: 'technicians'
      });
      Client.hasMany(models.Review, {
        foreignKey: 'clientId',
        as: 'reviews'
      });
    }
  }
  Client.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    googleAccountId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    googleBusinessProfileId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Client',
  });
  return Client;
};