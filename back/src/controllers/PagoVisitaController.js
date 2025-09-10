const PagoVisita  = require("../models/pagoVisitaModel");

//Obtener todos los pagos
const obtenerPagos = async (req, res) => {
    try {
        const pagos = await PagoVisita.findAll();
        res.json(pagos);
    } catch (error) {
        console.error(error);
        return null;
    }
}

//Obtener un pago por id
const obtenerPagoPorId = async (req, res) => {
    try {
        const pago = await PagoVisita.findByPk(id);
        res.json(pago);
    } catch (error) {
        console.error(error);
        return null;
    }
}

//Obtener pagos por usuario
const obtenerPagosPorUsuario = async (req, res) => {
    try {
        const pagos = await PagoVisita.findAll({ where: { id_usuario: req.params.id } });
        res.json(pagos);
    } catch (error) {
        console.error(error);
        return null;
    }
}

//Crear un pago
const crearPago = async (req, res) => {
    try {
        const newPago = await PagoVisita.create(req.body);
        res.json(newPago);
    } catch (error) {
        console.error(error);
        return null;
    }
}

//Actualizar un pago
const actualizarPago = async (req, res) => {
    try {
        const updatedPago = await PagoVisita.update(req.body, { where: { id_pagovisita: req.params.id } });
        res.json(updatedPago);
    } catch (error) {
        console.error(error);
        return null;
    }
}

//Eliminar un pago
const eliminarPago = async (req, res) => {
    try {
        const pago = await PagoVisita.destroy({ where: { id_pagovisita: req.params.id } });
        res.json(pago);
    } catch (error) {
        console.error(error);
        return null;
    }
}

module.exports = {
    obtenerPagos,
    obtenerPagoPorId,
    obtenerPagosPorUsuario,
    crearPago,
    actualizarPago,
    eliminarPago
}
