const { Sequelize } = require('sequelize');
require('dotenv').config();

// Test connection without specifying database first
const sequelize = new Sequelize(
    '', // No database specified
    process.env.DB_USERNAME,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mysql',
        logging: false
    }
);

async function testLocalConnection() {
    try {
        console.log('🔄 Testing Local MySQL connection...');
        console.log('📍 Host:', process.env.DB_HOST);
        console.log('👤 User:', process.env.DB_USERNAME);
        console.log('🔑 Password:', process.env.DB_PASSWORD ? `[${process.env.DB_PASSWORD.length} chars]` : 'EMPTY');

        // Test basic connection
        await sequelize.authenticate();
        console.log('✅ MySQL connection successful!');

        // Show existing databases
        const [databases] = await sequelize.query('SHOW DATABASES');
        console.log('📋 Available databases:', databases.map(db => db.Database));

        // Create our database if it doesn't exist
        await sequelize.query('CREATE DATABASE IF NOT EXISTS ejento_elevate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        console.log('✅ Database ejento_elevate created or verified');

    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.log('\n🔧 Let\'s try a few things:');
        console.log('1. Check if MySQL service is running');
        console.log('2. Try connecting with no password');
        console.log('3. Create a new user specifically for this project');
    } finally {
        await sequelize.close();
    }
}

testLocalConnection();