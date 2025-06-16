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
    }
  }
  Review.init({
    clientId: DataTypes.INTEGER,
    technicianId: DataTypes.INTEGER,
    googleReviewId: DataTypes.STRING,
    customerName: DataTypes.STRING,
    rating: DataTypes.INTEGER,
    text: DataTypes.TEXT,
    sentiment: DataTypes.STRING,
    sentimentScore: DataTypes.FLOAT,
    reviewDate: DataTypes.DATE,
    responseText: DataTypes.TEXT,
    responseDate: DataTypes.DATE,
    status: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Review',
  });
  return Review;
};