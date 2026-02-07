const { connectDB } = require('./database');

async function initDatabase() {
  console.log('🚀 Inicializando base de datos en Railway...');
  await connectDB();
  console.log('✅ Base de datos inicializada correctamente');
  process.exit(0);
}

initDatabase();