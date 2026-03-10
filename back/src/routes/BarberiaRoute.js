const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");

const { uploadBarberia } = require("../config/cloudinary");

const {
    obtenerBarberias,
    obtenerBarberiaPorId,
    obtenerBarberiaPorTecnico,
    crearBarberia,
    actualizarBarberia,
    eliminarBarberia,
    actualizarFotoBarberia,
    eliminarFotoBarberia
} = require("../controllers/BarberiaController");

// Middleware para validar errores
const validarErrores = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errores: errors.array() });
    }
    next();
};

// Obtener todas las barberías
router.get("/", obtenerBarberias);

// Actualizar foto de barbería
router.post("/foto/:id/:campo",
    [
        param("id").isInt().withMessage("El ID debe ser un número entero"),
        param("campo").isIn(['foto1', 'foto2']).withMessage("Campo no válido")
    ],
    validarErrores,
    uploadBarberia.single('imagen'),
    actualizarFotoBarberia
);

// Eliminar foto de barbería
router.delete("/foto/:id/:campo",
    [
        param("id").isInt().withMessage("El ID debe ser un número entero"),
        param("campo").isIn(['foto1', 'foto2']).withMessage("Campo no válido")
    ],
    validarErrores,
    eliminarFotoBarberia
);

// Obtener barbería por ID de técnico
router.get("/tecnico/:id_tecnico", obtenerBarberiaPorTecnico);

// Obtener una barbería por ID
router.get("/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo"),
], validarErrores, obtenerBarberiaPorId);

// Crear una barbería
router.post("/", [
    body("nombre").isString().withMessage("El nombre es requerido"),
    body("colonia").isString().withMessage("La colonia es requerida"),
    body("direccion_precisa").isString().withMessage("La dirección precisa es requerida")
], validarErrores, crearBarberia);

// Actualizar una barbería
router.put("/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo")
], validarErrores, actualizarBarberia);

// Eliminar una barbería
router.delete("/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo")
], validarErrores, eliminarBarberia);

module.exports = router;
