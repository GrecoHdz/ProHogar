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

//Obtener ultimo pago de solicitud espefica
const obtenerUltimoPagoPorSolicitud = async (req, res) => {
    try {
        const pago = await PagoVisita.findOne({
            where: { id_solicitud: req.params.id_solicitud },
            order: [['id_pagovisita','DESC']],
            attributes: ['estado']  
        });

        if (!pago) {
            return res.json({
              status: "not_found",
              data: { estado: "pendiente" }
            });
          } 

        return res.json({
            status: "success",
            data: { estado: pago.estado }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "error",
            message: "Error al obtener el estado del último pago"
        });
    }
}; 

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
    obtenerUltimoPagoPorSolicitud,
    obtenerPagosPorUsuario,
    crearPago,
    actualizarPago,
    eliminarPago
}
