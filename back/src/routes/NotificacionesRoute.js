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
// Middleware de autenticación
// ============================================================
router.use(authMiddleware);

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
  crearNotificacion
);

// 4️⃣ Enviar notificación (a usuario, por rol o global)
router.post(
  "/enviar",
  [
    body("id_notificacion")
      .isInt({ min: 1 })
      .withMessage("Debe indicar una notificación válida (id_notificacion)"),
    body("id_usuario")
      .optional()
      .isInt({ min: 1 })
      .withMessage("El id_usuario debe ser un número entero positivo"),
    body("nombre_rol")
      .optional()
      .isString()
      .withMessage("El nombre_rol debe ser una cadena de texto"),
    body("global")
      .optional()
      .isBoolean()
      .withMessage("El campo 'global' debe ser booleano"),
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
  eliminarNotificacion
);

// 7️⃣ Eliminar todas las notificaciones leídas
router.delete("/eliminar/leidas", eliminarLeidas);

// 8️⃣ Obtener notificaciones creadas manualmente
router.get("/manuales", obtenerCreadasManualmente);

module.exports = router;
