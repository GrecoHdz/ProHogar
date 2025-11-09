const express = require("express");
const router = express.Router();
const { body, param, query, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { 
    getAllMovimientos,
    obtenerEstadisticasDashboard,
    obtenerReporteIngresos,
    obtenerRetiros,
    getMovimientosPorUsuario,
    getIngresosMensuales,
    getServiciosPorMes,
    getServiciosPorTipo,
    getEstadisticasGenerales,
    getIngresosTotalesReferidos,
    getIngresosyRetirosdeReferidos,
    crearMovimiento,
    actualizarMovimiento,
    eliminarMovimiento,
    getTransacciones
} = require("../controllers/MovimientosController");

// Middleware de autenticación
//router.use(authMiddleware);
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

//Obtener retiros
router.get("/retiros", validarErrores, obtenerRetiros);

//Obtener movimientos por usuario
router.get("/:id_usuario", [
    param("id_usuario").isInt().withMessage("El id_usuario debe ser un numero entero")
], validarErrores, getMovimientosPorUsuario);

//Obtener estadisticas del dashboard admin
router.get("/estadisticas/admin", validarErrores, obtenerEstadisticasDashboard);

//Obtener reporte de ingresos y gráfico mensual
router.get("/reporte/ingresos", validarErrores, obtenerReporteIngresos);

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

// Obtener transacciones con paginación y filtros
router.get("/creditos/:id_usuario", [
    param("id_usuario").isInt().withMessage("El id_usuario debe ser un número entero"),
    query("page").optional().isInt({ min: 1 }).withMessage("La página debe ser un número entero mayor a 0"),
    query("limit").optional().isInt({ min: 1 }).withMessage("El límite debe ser un número entero mayor a 0"),
    query("startDate").optional().isISO8601().withMessage("La fecha de inicio debe tener un formato válido"),
    query("endDate").optional().isISO8601().withMessage("La fecha de fin debe tener un formato válido")
], validarErrores, getTransacciones);

//Obtener estadisticas generales por tecnico
router.get("/estadisticas/:id_tecnico", [
    param("id_tecnico").isInt().withMessage("El id_tecnico debe ser un numero entero")
], validarErrores, getEstadisticasGenerales);

//Obtener ingresos totales de referidos
router.get("/ingresos/referidos/:id_usuario", [
    param("id_usuario").isInt().withMessage("El id_usuario debe ser un numero entero")
], validarErrores, getIngresosTotalesReferidos);

//Obtener ingresos y retiros de los referidos de un usuario
router.get("/historial/referidos/:id_usuario", [
    param("id_usuario").isInt().withMessage("El id_usuario debe ser un numero entero")
], validarErrores, getIngresosyRetirosdeReferidos);

//Crear movimiento
router.post("/", [
    body("id_usuario").isInt().withMessage("El id_usuario debe ser un numero entero"), 
    body("id_cotizacion").optional().isInt().withMessage("El id_cotizacion debe ser un numero entero"),
    body("id_referido").optional().isInt().withMessage("El id_referido debe ser un numero entero"),
    body("tipo").isIn(["ingreso", "retiro","ingreso_referido"]).withMessage("El tipo debe ser 'ingreso' o 'retiro'"),
    body("monto").isFloat({ min: 0 }).withMessage("El monto debe ser un número válido (entero o decimal) y mayor o igual a 0"),
    body("descripcion").optional().isString().withMessage("La descripción debe ser un texto"),
], validarErrores, crearMovimiento);

//Actualizar movimiento
router.put("/:id", [
    param("id").isInt().withMessage("El id debe ser un numero entero"), 
    body("estado").optional().isIn(["pendiente", "completado"]).withMessage("El estado debe ser 'pendiente', 'completado'")
], validarErrores, actualizarMovimiento);

//Eliminar movimiento
router.delete("/:id", [
    param("id").isInt().withMessage("El id debe ser un numero entero")
], validarErrores, eliminarMovimiento);

module.exports = router;
