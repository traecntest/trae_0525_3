const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('Testing MySQL socket connection...');
  console.log('Socket path:', '/var/run/mysqld/mysqld.sock');
  
  try {
    const connection = await mysql.createConnection({
      socketPath: '/var/run/mysqld/mysqld.sock',
      user: 'root',
      database: 'feishu_docs'
    });
    
    console.log('✅ Connected successfully!');
    
    const [rows] = await connection.execute('SELECT 1 + 1 AS solution');
    console.log('Query result:', rows[0].solution);
    
    await connection.end();
    console.log('Connection closed');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error);
  }
}

testConnection();
