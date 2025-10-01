//Importaciones
const { connectDB } = require("./src/config/database");
const cookieParser = require("cookie-parser");
const express = require("express")
const morgan = require("morgan");
const cors = require("cors");
const app = express();  

//Rutas
const userRoutes = require("./src/routes/UsuarioRoute");
const authRoutes = require("./src/routes/authRoute");
//const { authLimiter, apiLimiter } = require("./src/middleware/rateLimiters"); 
const rolRoutes = require("./src/routes/RolRoute");
const ciudadRoutes = require("./src/routes/CiudadRoute");
const serviciosRoutes = require("./src/routes/ServiciosRoute");
const solicitudServicioRoutes = require("./src/routes/SolicitudServicioRoute");
const soporteRoutes = require("./src/routes/SoporteRoute");
const membresiaRoutes = require("./src/routes/MembresiaRoute");
const cuentasRoutes = require("./src/routes/CuentasRoute");
const configRoutes = require("./src/routes/ConfigRoute");
const membresiaBeneficiosRoutes = require("./src/routes/MembresiBeneficiosRoute");
const pagoVisitaRoutes = require("./src/routes/PagoVisitaRoute"); 
const cotizacionRoutes = require("./src/routes/CotizacionRoute"); 
const movimientosRoutes = require("./src/routes/MovimientosRoute");
const calificacionesRoutes = require("./src/routes/CalificacionesRoute");
// Configurar las asociaciones de los modelos
const setupAssociations = require('./src/models');
setupAssociations();

// Configuración de cookies
const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // En producción, solo enviar sobre HTTPS
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Para desarrollo local
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  path: '/',
};
//Middleware para configurar la configuración de cookies en todas las rutas
app.use((req, res, next) => {
  req.cookieConfig = cookieConfig;
  next();
});

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

// Importar Rutas 
app.use("/usuarios", userRoutes);
app.use("/auth", authRoutes);
app.use("/roles", rolRoutes);
app.use("/ciudad", ciudadRoutes);
app.use("/servicios", serviciosRoutes);
app.use("/solicitudservicio", solicitudServicioRoutes);
app.use("/soporte", soporteRoutes);
app.use("/membresia", membresiaRoutes);
app.use("/cuentas", cuentasRoutes);
app.use("/config", configRoutes);
app.use("/membresiabeneficios", membresiaBeneficiosRoutes);
app.use("/pagovisita", pagoVisitaRoutes); 
app.use("/cotizacion", cotizacionRoutes);  
app.use("/movimientos", movimientosRoutes);
app.use("/calificaciones", calificacionesRoutes);
// Aplicar limitador estricto a rutas de autenticación
//app.use("/login", authLimiter, authRoutes);

// Aplicar middleware de verificación de token y limitador de API a todas las demás rutas
//app.use("/productos", apiLimiter, verifyToken, productRoutes); 

// Iniciar servidor
const PORT = process.env.PORT || 4000;
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();