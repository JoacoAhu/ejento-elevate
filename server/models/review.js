'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Review extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Review.belongsTo(models.Client, {
        foreignKey: 'clientId',
        as: 'client'
      });
      Review.belongsTo(models.Technician, {
        foreignKey: 'technicianId',
        as: 'technician'
      });
    }
  }
  Review.init({
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    technicianId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    googleReviewId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    sentiment: {
      type: DataTypes.STRING,
      allowNull: true
    },
    sentimentScore: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    reviewDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    responseText: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    responseDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending'
    },
    source: {
      type: DataTypes.STRING,
      defaultValue: 'google'
    },
    // NEW PUBLISHING FIELDS
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    publishedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'system'
    },
    publishedPlatform: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Review',
  });
  return Review;
};