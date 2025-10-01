const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { 
    getAllMovimientos,
    getMovimientosPorUsuario,
    getIngresosMensuales,
    getServiciosPorMes,
    getServiciosPorTipo,
    getEstadisticasGenerales,
    crearMovimiento,
    actualizarMovimiento,
    eliminarMovimiento 
} = require("../controllers/MovimientosController");

// Middleware de autenticación
router.use(authMiddleware);
// Middleware para validar errores
const validarErrores = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    next();
  };

//Obtener todos los movimientos
router.get("/", validarErrores, getAllMovimientos);

//Obtener movimientos por usuario
router.get("/:id_usuario", [
    param("id_usuario").isInt().withMessage("El id_usuario debe ser un numero entero")
], validarErrores, getMovimientosPorUsuario);

//Obtener ingresos mensuales por tecnico
router.get("/ingresos/mensuales/:id_tecnico", [
    param("id_tecnico").isInt().withMessage("El id_tecnico debe ser un numero entero")
], validarErrores, getIngresosMensuales);

//Obtener cantidad de servicios por mes
router.get("/servicios/mensuales/:id_tecnico", [
    param("id_tecnico").isInt().withMessage("El id_tecnico debe ser un numero entero")
], validarErrores, getServiciosPorMes);

//Obtener cantidad de servicios por tipo
router.get("/servicios/tipo/:id_tecnico", [
    param("id_tecnico").isInt().withMessage("El id_tecnico debe ser un numero entero")
], validarErrores, getServiciosPorTipo);

//Obtener estadisticas generales por tecnico
router.get("/estadisticas/:id_tecnico", [
    param("id_tecnico").isInt().withMessage("El id_tecnico debe ser un numero entero")
], validarErrores, getEstadisticasGenerales);

//Crear movimiento
router.post("/", [
    body("id_usuario").isInt().withMessage("El id_usuario debe ser un numero entero"), 
    body("tipo").isIn(["ingreso", "retiro"]).withMessage("El tipo debe ser 'ingreso' o 'retiro'"),
    body("monto").isInt().withMessage("El monto debe ser un numero entero"),
    // Validación condicional para el campo descripción
    (req, res, next) => {
        if (req.body.descripcion !== undefined && req.body.descripcion !== null) {
            body('descripcion').isString().withMessage('La descripción debe ser un texto')(req, res, next);
        } else {
            next();
        }
    }
], validarErrores, crearMovimiento);

//Actualizar movimiento
router.put("/:id", [
    param("id").isInt().withMessage("El id debe ser un numero entero"),
    body("id_usuario").isInt().withMessage("El id_usuario debe ser un numero entero"),
    body("monto").isInt().withMessage("El monto debe ser un numero entero"),
    body("tipo").isIn(["ingreso", "retiro"]).withMessage("El tipo debe ser 'ingreso' o 'retiro'"),
    body("estado").optional().isIn(["pendiente", "completado"]).withMessage("El estado debe ser 'pendiente', 'completado'")
], validarErrores, actualizarMovimiento);

//Eliminar movimiento
router.delete("/:id", [
    param("id").isInt().withMessage("El id debe ser un numero entero")
], validarErrores, eliminarMovimiento);

module.exports = router;
