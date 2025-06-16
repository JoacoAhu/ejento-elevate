'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Reviews', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      clientId: {
        type: Sequelize.INTEGER
      },
      technicianId: {
        type: Sequelize.INTEGER
      },
      googleReviewId: {
        type: Sequelize.STRING
      },
      customerName: {
        type: Sequelize.STRING
      },
      rating: {
        type: Sequelize.INTEGER
      },
      text: {
        type: Sequelize.TEXT
      },
      sentiment: {
        type: Sequelize.STRING
      },
      sentimentScore: {
        type: Sequelize.FLOAT
      },
      reviewDate: {
        type: Sequelize.DATE
      },
      responseText: {
        type: Sequelize.TEXT
      },
      responseDate: {
        type: Sequelize.DATE
      },
      status: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Reviews');
  }
};