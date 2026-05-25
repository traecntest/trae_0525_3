require('dotenv').config();
const { connectDB } = require('./src/config/database');
const config = require('./src/config');

async function testDatabaseConnection() {
  console.log('\n========== 数据库连接测试 ==========\n');
  console.log('当前配置:');
  console.log('  Host:', config.database.host);
  console.log('  Port:', config.database.port);
  console.log('  Database:', config.database.database);
  console.log('  Username:', config.database.username);
  console.log('  Password:', config.database.password ? '***已配置***' : '***空密码***');
  
  if (!config.database.password) {
    console.log('\n⚠️  警告：数据库密码为空！');
    console.log('请在 .env 文件中设置 DB_PASSWORD');
  }
  
  if (!process.env.DB_HOST && !config.database.host) {
    console.log('\n⚠️  警告：DB_HOST 未配置，使用默认值 localhost');
  }

  try {
    await connectDB();
    console.log('\n✅ 数据库连接成功！\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 数据库连接失败！\n');
    console.error('错误详情:');
    
    if (error.original) {
      const orig = error.original;
      console.error('  错误代码:', orig.code);
      console.error('  错误信息:', orig.message);
      
      if (orig.code === 'ER_BAD_DB_ERROR') {
        console.log('\n💡 提示：数据库不存在，请先执行:');
        console.log('   mysql -u root -p < database/schema.sql');
      } else if (orig.code === 'ER_ACCESS_DENIED_ERROR') {
        console.log('\n💡 提示：用户名或密码错误，请检查 .env 文件中的 DB_USERNAME 和 DB_PASSWORD');
      } else if (orig.code === 'ECONNREFUSED') {
        console.log('\n💡 提示：无法连接到 MySQL 服务器');
        console.log('   1. 确保 MySQL 服务已启动');
        console.log('   2. 检查主机和端口配置');
        console.log('   3. 检查防火墙设置');
      }
    } else {
      console.error('  错误信息:', error.message);
    }
    
    console.log('\n========== 配置检查清单 ==========\n');
    console.log('1. MySQL 服务是否已启动？');
    console.log('   systemctl status mysql  # Linux');
    console.log('   或者检查 Windows 服务\n');
    console.log('2. 数据库是否已创建？');
    console.log('   mysql -u root -p -e "SHOW DATABASES;"\n');
    console.log('3. 用户名和密码是否正确？');
    console.log('   mysql -u <用户名> -p\n');
    console.log('4. 防火墙是否允许连接？\n');
    
    process.exit(1);
  }
}

testDatabaseConnection();
