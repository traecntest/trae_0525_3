const { Sequelize } = require('sequelize');

console.log('Testing Sequelize with MySQL socket connection...');

const sequelize = new Sequelize('feishu_docs', 'root', '', {
  dialect: 'mysql',
  socketPath: '/var/run/mysqld/mysqld.sock',
  logging: console.log,
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  timezone: '+08:00',
});

async function test() {
  try {
    await sequelize.authenticate();
    console.log('✅ Sequelize connection successful!');
    
    const [results] = await sequelize.query('SELECT 1 + 1 AS solution');
    console.log('Query result:', results[0].solution);
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Sequelize connection failed:', error.message);
    console.error('Error:', error);
  }
}

test();
