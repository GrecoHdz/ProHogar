/**
 * Configuración de limitadores de tasa para proteger contra ataques DDoS y de fuerza bruta
 */
const { rateLimit } = require('express-rate-limit');

/**
 * Limitador estricto para rutas de autenticación
 * - Ventana: 1 hora
 * - Máximo: 10 intentos por hora
 */
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora en milisegundos
  max: 10, // Máximo 10 solicitudes por ventana
  standardHeaders: true, // Devuelve los headers estándar de rate limit (X-RateLimit-*)
  legacyHeaders: false, // Deshabilita los headers X-RateLimit-* obsoletos
  message: {
    status: 429,
    message: 'Demasiados intentos de acceso. Por favor, inténtelo de nuevo después de una hora.'
  },
  // Personalizar la clave para el limitador (por defecto es la IP)
  keyGenerator: (req) => {
    return req.ip; // Usa la IP como identificador
  }
});

/**
 * Limitador para rutas protegidas con JWT
 * - Ventana: 5 minutos
 * - Máximo: 500 solicitudes por 5 minutos
 * - Usa el ID de usuario del token JWT para el conteo
 */
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos en milisegundos
  max: 500, // Máximo 500 solicitudes por ventana
  standardHeaders: true, // Devuelve los headers estándar de rate limit (X-RateLimit-*)
  legacyHeaders: false, // Deshabilita los headers X-RateLimit-* obsoletos
  message: {
    status: 429,
    message: 'Demasiadas solicitudes. Por favor, inténtelo de nuevo después de 5 minutos.'
  },
  // Personalizar la clave para el limitador usando el ID de usuario del token JWT
  keyGenerator: (req) => {
    // Si el usuario está autenticado (req.user existe), usar su ID
    // De lo contrario, usar la IP como respaldo
    return req.user ? `user_${req.user.id}` : req.ip;
  },
  // No aplicar el límite a las solicitudes que fallan la autenticación
  skip: (req) => {
    return !req.user; // Omitir si no hay usuario autenticado
  }
});

module.exports = {
  authLimiter,
  apiLimiter
};
