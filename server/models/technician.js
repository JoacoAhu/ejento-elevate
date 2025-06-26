'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
  class Technician extends Model {
    static associate(models) {
      Technician.belongsTo(models.Client, {
        foreignKey: 'clientId',
        as: 'client'
      });
      Technician.hasMany(models.Review, {
        foreignKey: 'technicianId',
        as: 'reviews'
      });
    }

    async checkPassword(password) {
      return await bcrypt.compare(password, this.hashedPassword);
    }

    // Method to set password
    async setPassword(password) {
      const saltRounds = 10;
      this.hashedPassword = await bcrypt.hash(password, saltRounds);
      this.isFirstLogin = false;
    }

    // Static method to generate password
    static generatePassword() {
      return crypto.randomBytes(6).toString('hex'); // 12 characters
    }

    // Method to reset password for first login
    async generateFirstTimePassword() {
      const newPassword = Technician.generatePassword();
      await this.setPassword(newPassword);
      this.isFirstLogin = true;
      this.mustChangePassword = true;
      return newPassword;
    }
  }

  Technician.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: DataTypes.STRING,
    crmCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true // This is the username
    },
    hashedPassword: {
      type: DataTypes.STRING,
      allowNull: true // Can be null initially
    },
    isFirstLogin: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    mustChangePassword: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    persona: {
      type: DataTypes.JSON,
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
    indexes: [
      {
        unique: true,
        fields: ['crmCode']
      }
    ]
  });

  return Technician;
};