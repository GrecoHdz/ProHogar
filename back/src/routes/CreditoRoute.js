const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");   
const { authMiddleware } = require("../middleware/authMiddleware");  
const { 
    getAllCreditos,
    getCreditoPorUsuario,
    createCredito,
    resetCredito,
    deleteCredito 
} = require("../controllers/CreditoController");
 
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

//Obtener todas los creditos
router.get("/", [
    validarErrores
], getAllCreditos);

//Obtener un credito por usuario
router.get("/usuario/:id_usuario", [
    param("id_usuario").isInt().withMessage("El ID debe ser un numero entero"),
    validarErrores
], getCreditoPorUsuario);

//Crear credito
router.post("/", [
    body("id_usuario").isInt().withMessage("El ID debe ser un numero entero"),
    body("monto_credito").isFloat().withMessage("El monto debe ser un número válido (entero o decimal) y mayor o igual a 0"),
    validarErrores
], createCredito); 
 
// Resetear crédito
router.put("/reset/:id_usuario", [
    param("id_usuario").isInt().withMessage("El ID debe ser un número entero"),
    validarErrores
], resetCredito);

//Eliminar credito
router.delete("/eliminar/:id_usuario", [
    param("id_usuario").isInt().withMessage("El ID debe ser un numero entero"),
    validarErrores
], deleteCredito);

module.exports = router;
