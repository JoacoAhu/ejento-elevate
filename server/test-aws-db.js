// Update server/test-aws-db.js for LOCAL testing
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USERNAME,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        // Remove SSL for local connection
        logging: console.log
    }
);

async function testLocalConnection() {
    try {
        console.log('🔄 Testing Local MySQL connection...');
        console.log('📍 Host:', process.env.DB_HOST);
        console.log('👤 User:', process.env.DB_USERNAME);

        await sequelize.authenticate();
        console.log('✅ Local MySQL connection successful!');

        const [results] = await sequelize.query('SELECT DATABASE() as db_name, VERSION() as version');
        console.log('📊 Connected to database:', results[0].db_name);
        console.log('🔧 MySQL Version:', results[0].version);

    } catch (error) {
        console.error('❌ Connection failed:', error.message);
    } finally {
        await sequelize.close();
    }
}

testLocalConnection();