const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { 
  obtenerTodas,
  obtenerPorUsuario,
  crearNotificacion,
  enviarNotificacion,
  marcarComoLeida,
  eliminarNotificacion,
  eliminarLeidas,
  obtenerCreadasManualmente
} = require("../controllers/notificacionesController");

// ============================================================
// Middleware para validar errores
// ============================================================
const validarErrores = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errores: errors.array() });
  }
  next();
};

// ============================================================
// 📋 RUTAS DE NOTIFICACIONES
// ============================================================

// 1️⃣ Obtener todas las notificaciones
router.get("/", obtenerTodas);

// 2️⃣ Obtener notificaciones por usuario
router.get(
  "/usuario/:id_usuario",
  [
    param("id_usuario")
      .isInt({ min: 1 })
      .withMessage("El ID de usuario debe ser un número entero positivo"),
  ],
  validarErrores,
  authMiddleware,
  obtenerPorUsuario
);

// 3️⃣ Crear nueva notificación
router.post(
  "/",
  [
    body("tipo")
      .trim()
      .notEmpty()
      .withMessage("El tipo de notificación es requerido"),
    body("titulo")
      .trim()
      .notEmpty()
      .withMessage("El título de la notificación es requerido"),
    body("creado_por")
      .trim()
      .notEmpty()
      .withMessage("El campo 'creado_por' es requerido"),
  ],
  validarErrores,
  authMiddleware,
  crearNotificacion
);
 
// 4️⃣ Enviar notificación (ID, rol, global o automática por título)
router.post(
  "/enviar",
  [ 
    body("id_notificacion")
      .optional()
      .isInt({ min: 1 })
      .withMessage("El ID de notificación debe ser un número entero positivo"), 
    body("titulo")
      .optional()
      .isString()
      .withMessage("El título debe ser una cadena válida"), 
    body("id_usuario")
      .optional()
      .isInt({ min: 1 })
      .withMessage("El ID de usuario debe ser un número válido"), 
    body("nombre_rol")
      .optional()
      .isString()
      .withMessage("El nombre del rol debe ser un texto válido"), 
    body("global")
      .optional()
      .isBoolean()
      .withMessage("El campo global debe ser true o false"),
  ],
  validarErrores,
  enviarNotificacion
);


// 5️⃣ Marcar notificación como leída
router.put(
  "/marcar/leidas",
  [
    body("id_usuario")
      .isInt({ min: 1 })
      .withMessage("El ID de usuario debe ser un número entero positivo"),
  ],
  validarErrores,
  authMiddleware,
  marcarComoLeida
);

// 6️⃣ Eliminar una notificación
router.delete(
  "/:id_notificacion",
  [
    param("id_notificacion")
      .isInt({ min: 1 })
      .withMessage("El ID debe ser un número entero positivo"),
  ],
  validarErrores,
  authMiddleware,
  eliminarNotificacion
);

// 7️⃣ Eliminar todas las notificaciones leídas
router.delete("/eliminar/leidas", authMiddleware, eliminarLeidas);

// 8️⃣ Obtener notificaciones creadas manualmente
router.get("/manuales", authMiddleware, obtenerCreadasManualmente); 


module.exports = router;
