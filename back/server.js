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
const { authLimiter, apiLimiter } = require("./src/middleware/rateLimiters");
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
const creditoRoutes = require("./src/routes/CreditoRoute");
const referidoRoutes = require("./src/routes/ReferidoRoute");
const pagoServicioRoutes = require("./src/routes/PagoServicioRoute");
const notificacionesRoutes = require("./src/routes/NotificacionesRoute");
const tecnicoServicioRoutes = require("./src/routes/TecnicoServicioRoute");
const facturaRoutes = require("./src/routes/FacturaRoute");
const facturaRelacionRoutes = require("./src/routes/FacturaRelacionRoute");
const facturaCorrelativoRoutes = require("./src/routes/FacturaCorrelativoRoute");
const paquetesRoutes = require("./src/routes/PaquetesRoute");
const paquetesUsuariosRoutes = require("./src/routes/PaquetesUsuariosRoute");
const barberiaRoutes = require("./src/routes/BarberiaRoute");
const vehiculosRoutes = require("./src/routes/VehiculoConductorRoute");


// Configurar las asociaciones de los modelos
const setupAssociations = require('./src/models');
setupAssociations();

// Configuración de cookies
const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // En producción, solo enviar sobre HTTPS
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Para desarrollo local
  partitioned: process.env.NODE_ENV === 'production',
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
console.log("CORS origin:", process.env.FRONTEND_URL);
// Configuración de CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir solicitudes sin origin (Postman, apps móviles)
    if (!origin) return callback(null, true);

    // Lista de orígenes permitidos
    const allowedOrigins = [
      'https://front-six-lemon.vercel.app',  // URL principal
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ];

    // Permitir todas las URLs de Vercel de tu proyecto
    const isVercelPreview = origin && origin.includes('miseguros-projects-00c1e523.vercel.app');

    if (allowedOrigins.includes(origin) || isVercelPreview) {
      callback(null, true);
    } else {
      console.log('❌ Origen bloqueado por CORS:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control', 'Pragma'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

app.use(cors(corsOptions));

// Importar Rutas 
app.use("/usuarios", apiLimiter, userRoutes);
app.use("/auth", authLimiter, authRoutes);
app.use("/roles", apiLimiter, rolRoutes);
app.use("/ciudad", apiLimiter, ciudadRoutes);
app.use("/servicios", apiLimiter, serviciosRoutes);
app.use("/solicitudservicio", apiLimiter, solicitudServicioRoutes);
app.use("/soporte", apiLimiter, soporteRoutes);
app.use("/membresia", apiLimiter, membresiaRoutes);
app.use("/cuentas", apiLimiter, cuentasRoutes);
app.use("/config", apiLimiter, configRoutes);
app.use("/membresiabeneficios", apiLimiter, membresiaBeneficiosRoutes);
app.use("/pagovisita", apiLimiter, pagoVisitaRoutes);
app.use("/cotizacion", apiLimiter, cotizacionRoutes);
app.use("/movimientos", apiLimiter, movimientosRoutes);
app.use("/calificaciones", apiLimiter, calificacionesRoutes);
app.use("/credito", apiLimiter, creditoRoutes);
app.use("/referidos", apiLimiter, referidoRoutes);
app.use("/pagoservicio", apiLimiter, pagoServicioRoutes);
app.use("/notificaciones", apiLimiter, notificacionesRoutes);
app.use("/tecnicoServicio", apiLimiter, tecnicoServicioRoutes);
app.use("/facturas/correlativos", apiLimiter, facturaCorrelativoRoutes);
app.use("/facturas/relaciones", apiLimiter, facturaRelacionRoutes);
app.use("/facturas", apiLimiter, facturaRoutes);
app.use("/paquetes", apiLimiter, paquetesRoutes);
app.use("/paquetes/usuarios", apiLimiter, paquetesUsuariosRoutes);
app.use("/barberias", apiLimiter, barberiaRoutes);
app.use("/vehiculos", apiLimiter, vehiculosRoutes);


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