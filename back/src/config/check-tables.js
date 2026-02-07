// src/config/check-tables.js
const { sequelize } = require('./database'); // ✅ Sin './src/config/'

async function checkTables() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');
    
    const [results] = await sequelize.query('SHOW TABLES');
    console.log('📋 Tablas en la base de datos:');
    console.log(results);
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTables();