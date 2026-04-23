const express = require("express");
const router = express.Router();
const { param, validationResult } = require("express-validator");
const { uploadVehiculo } = require("../config/cloudinary");

const {
    obtenerVehiculoPorTecnico,
    obtenerVehiculoPorId,
    crearVehiculo,
    actualizarVehiculo,
    actualizarFotoVehiculo,
    eliminarFotoVehiculo
} = require("../controllers/VehiculoConductorController");

const validarErrores = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });
    next();
};

// Obtener vehículo por ID de técnico/conductor
router.get("/conductor/:id_tecnico", obtenerVehiculoPorTecnico);

// Obtener vehículo por ID de vehículo
router.get("/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo")
], validarErrores, obtenerVehiculoPorId);

// Subir / actualizar foto del vehículo (foto1 o foto2)
router.post("/foto/:id/:campo",
    [
        param("id").isInt().withMessage("El ID debe ser un número entero"),
        param("campo").isIn(['foto1', 'foto2']).withMessage("Campo no válido")
    ],
    validarErrores,
    uploadVehiculo.single('imagen'),
    actualizarFotoVehiculo
);

// Eliminar foto del vehículo
router.delete("/foto/:id/:campo",
    [
        param("id").isInt().withMessage("El ID debe ser un número entero"),
        param("campo").isIn(['foto1', 'foto2']).withMessage("Campo no válido")
    ],
    validarErrores,
    eliminarFotoVehiculo
);

// Crear o registrar vehículo
router.post("/", crearVehiculo);

// Actualizar datos del vehículo
router.put("/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo")
], validarErrores, actualizarVehiculo);

module.exports = router;
