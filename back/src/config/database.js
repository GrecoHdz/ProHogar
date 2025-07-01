const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");

dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: "mysql",
  logging: false,
  timezone: '-06:00', // Configurar zona horaria para América Central (UTC-6)
});

// Función para conectar a la base de datos
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Base de datos conectada correctamente.");
  } catch (error) {
    console.error("❌ Error al conectar la base de datos:", error);
    process.exit(1); // Salir si no se puede conectar
  }
};

module.exports = { sequelize, connectDB };
