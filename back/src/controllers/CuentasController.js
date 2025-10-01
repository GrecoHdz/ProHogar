const Cuenta = require("../models/cuentasModel");
 
//Obtener todas las cuentas
const obtenerCuentas = async (req, res) => {
    try {
        const cuentas = await Cuenta.findAll({
            attributes: ['id_cuenta', 'banco', 'beneficiario', 'num_cuenta', 'tipo', 'activo']
        });
        res.json(cuentas);
    } catch (error) {
        console.error("Error al obtener cuentas:", error);
        res.status(500).json({ error: "Error al obtener cuentas" });
    }
};

//Obtener cuenta por id
const obtenerCuentaPorId = async (req, res) => {
    try {
        const cuenta = await Cuenta.findOne({ where: { id_cuenta: req.params.id } });
        res.json(cuenta);
    } catch (error) {
        console.error("Error al obtener cuenta por id:", error);
        res.status(500).json({ error: "Error al obtener cuenta por id" });
    }
};

//Crear cuenta
const crearCuenta = async (req, res) => {
    try {
        const cuenta = await Cuenta.create(req.body);
        res.json(cuenta);
    } catch (error) {
        console.error("Error al crear cuenta:", error);
        res.status(500).json({ error: "Error al crear cuenta" });
    }
};

//Actualizar cuenta
const actualizarCuenta = async (req, res) => {
    try {
        const cuenta = await Cuenta.update(req.body, { where: { id_cuenta: req.params.id } });
        res.json(cuenta);
    } catch (error) {
        console.error("Error al actualizar cuenta:", error);
        res.status(500).json({ error: "Error al actualizar cuenta" });
    }
};

//Eliminar cuenta
const eliminarCuenta = async (req, res) => {
    try {
        const cuenta = await Cuenta.destroy({ where: { id_cuenta: req.params.id } });
        res.json(cuenta);
    } catch (error) {
        console.error("Error al eliminar cuenta:", error);
        res.status(500).json({ error: "Error al eliminar cuenta" });
    }
};

module.exports = {
    obtenerCuentas,
    obtenerCuentaPorId,
    crearCuenta,
    actualizarCuenta,
    eliminarCuenta
};
