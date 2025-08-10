
const express = require("express")
const morgan = require("morgan");
const cors = require("cors");
const app = express(); 
const { connectDB } = require("./src/config/database");
//const { authLimiter, apiLimiter } = require("./src/middleware/rateLimiters"); 
const userRoutes = require("./src/routes/UsuarioRoute");


// Middlewares
app.use(morgan("dev"));
app.use(express.json());
app.use(
  cors({
    origin: true, //"http://localhost:3000",//true, //process.env.NODE_ENV === "production" ? "https://prohogar.com" : true
    credentials: true,
  })
);


// Importar Rutas 
app.use("/usuarios", userRoutes);

// Aplicar limitador estricto a rutas de autenticación
//app.use("/login", authLimiter, authRoutes);


// Aplicar middleware de verificación de token y limitador de API a todas las demás rutas
//app.use("/productos", apiLimiter, verifyToken, productRoutes);



// Iniciar servidor PROBAR SERVERRRRRRR en lugar de app.liste
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', async () => {
  await connectDB();
  console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
});
