/**
 * Configuración de limitadores de tasa para proteger contra ataques DDoS y de fuerza bruta
 */
const { rateLimit } = require('express-rate-limit');

/**
 * Limitador estricto para rutas de autenticación
 * - Ventana: 1 hora
 * - Máximo: 6 intentos por hora
 */
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora en milisegundos
  max: 6, // Máximo 6 solicitudes por ventana
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
 * - Máximo: 600 solicitudes por 3 minutos
 * - Usa el ID de usuario del token JWT para el conteo
 */
const apiLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 3 minutos en milisegundos
  max: 200, // Máximo 600 solicitudes por ventana
  standardHeaders: true, // Devuelve los headers estándar de rate limit (X-RateLimit-*)
  legacyHeaders: false, // Deshabilita los headers X-RateLimit-* obsoletos
  message: {
    status: 429,
    message: 'Demasiadas solicitudes. Por favor, inténtelo de nuevo después de 3 minutos.'
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
