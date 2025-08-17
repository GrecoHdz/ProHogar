
const express = require("express")
const { sequelize } = require("./src/config/database");;
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express(); 
const { connectDB } = require("./src/config/database");
//const { authLimiter, apiLimiter } = require("./src/middleware/rateLimiters"); 
const userRoutes = require("./src/routes/UsuarioRoute");
const authRoutes = require("./src/routes/authRoute");
const verifyToken = require("./src/middleware/authMiddleware");
const rolRoutes = require("./src/routes/RolRoute");

// Configuración de cookies
const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // En producción, solo enviar sobre HTTPS
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Para desarrollo local
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  path: '/',
};

// Middlewares
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Hacer que la configuración de cookies esté disponible en todas las rutas
app.use((req, res, next) => {
  req.cookieConfig = cookieConfig;
  next();
});


// Importar Rutas 
app.use("/usuarios", userRoutes);
app.use("/auth", authRoutes);
app.use("/roles", rolRoutes);

// Aplicar limitador estricto a rutas de autenticación
//app.use("/login", authLimiter, authRoutes);


// Aplicar middleware de verificación de token y limitador de API a todas las demás rutas
//app.use("/productos", apiLimiter, verifyToken, productRoutes);



// Configurar las asociaciones de los modelos
const setupAssociations = require('./src/models');
setupAssociations();

// Sincronizar modelos con la base de datos
const syncModels = async () => {
  try {
    // { force: true } para forzar la recreación de las tablas (cuidado en producción)
    // { alter: true } para alterar las tablas existentes
    await sequelize.sync({ alter: true });
    console.log('✅ Modelos sincronizados con la base de datos');
  } catch (error) {
    console.error('❌ Error al sincronizar modelos:', error);
  }
};

// Iniciar servidor
const PORT = process.env.PORT || 4000;
const startServer = async () => {
  try {
    await connectDB();
    await syncModels();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();
