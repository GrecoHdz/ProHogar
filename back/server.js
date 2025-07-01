
const express = require("express")
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser"); 
const app = express(); 
const { connectDB, sequelize } = require("./config/database");
const { authLimiter, apiLimiter } = require("./middlewares/rateLimiters"); 
const verifyToken = require("./middlewares/authMiddleware");
const authRoutes = require("./routes/auth");


// Middlewares
app.use(morgan("dev"));
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",//true, //process.env.NODE_ENV === "production" ? "https://prohogar.com" : true
    credentials: true,
  })
);
app.use(cookieParser());


// Importar Rutas
const productRoutes = require("./routes/producto"); 


// Aplicar limitador estricto a rutas de autenticación
app.use("/login", authLimiter, authRoutes);


// Aplicar middleware de verificación de token y limitador de API a todas las demás rutas
app.use("/productos", verifyToken, apiLimiter, productRoutes);



// Iniciar servidor
const PORT = process.env.PORT || 4000;
server.listen(PORT, async () => {
  await connectDB();
  console.log(` Servidor corriendo en http://localhost:${PORT}`);
});
