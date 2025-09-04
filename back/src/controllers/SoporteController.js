const Soporte = require("../models/soporteModel");
const { Op } = require('sequelize');

//Obtener todos los Soportes
const obtenerSoportes = async (req, res) => {
    try {
        const soportes = await Soporte.findAll();
        res.json(soportes);
    } catch (error) {
        console.error("Error al obtener soportes:", error);
        res.status(500).json({ error: "Error al obtener soportes" });
    }
};

//Obtener Soporte por Cliente
const obtenerSoportePorCliente = async (req, res) => {
    const { id } = req.params;
    
    if (!id) {
        return res.status(400).json({ error: "Se requiere el ID del cliente" });
    }
    
    try {
        const soporte = await Soporte.findOne({ where: { id_usuario: id } });
        
        if (!soporte) {
            return res.status(404).json({ 
                mensaje: "No se encontró ningún soporte con el ID del cliente proporcionado",
                idBuscado: id
            });
        }
        
        res.json(soporte);
    } catch (error) {
        console.error("Error al obtener soporte por cliente:", error);
        res.status(500).json({ 
            error: "Error al obtener soporte por cliente",
            detalle: error.message 
        });
    }
};

//Crear Soporte
const crearSoporte = async (req, res) => {
    const { id_usuario, id_solicitud, asunto, mensaje, estado } = req.body;
    
    if (!id_usuario || !asunto || !mensaje) {
        return res.status(400).json({ error: "Se requieren el ID del usuario, el asunto y el mensaje" });
    }
    
    try {
        const soporte = await Soporte.create({ id_usuario, id_solicitud, asunto, mensaje, estado });
        res.json(soporte);
    } catch (error) {
        console.error("Error al crear soporte:", error);
        res.status(500).json({ error: "Error al crear soporte" });
    }
};

//Actualizar Soporte
const actualizarSoporte = async (req, res) => {
    const { id } = req.params;
    const { id_usuario, id_solicitud, asunto, mensaje, estado } = req.body;
    
    if (!id) {
        return res.status(400).json({ error: "Se requiere el ID del soporte" });
    }
    
    try {
        const soporte = await Soporte.findByPk(id);
        
        if (!soporte) {
            return res.status(404).json({ 
                mensaje: "No se encontró ningún soporte con el ID proporcionado",
                idBuscado: id
            });
        }
        
        await soporte.update({ id_usuario, id_solicitud, asunto, mensaje, estado });
        res.json(soporte);
    } catch (error) {
        console.error("Error al actualizar soporte:", error);
        res.status(500).json({ error: "Error al actualizar soporte" });
    }
};

//Eliminar Soporte
const eliminarSoporte = async (req, res) => {
    const { id } = req.params;
    
    if (!id) {
        return res.status(400).json({ error: "Se requiere el ID del soporte" });
    }
    
    try {
        const soporte = await Soporte.findByPk(id);
        
        if (!soporte) {
            return res.status(404).json({ 
                mensaje: "No se encontró ningún soporte con el ID proporcionado",
                idBuscado: id
            });
        }
        
        await soporte.destroy();
        res.json({ mensaje: "Soporte eliminado exitosamente" });
    } catch (error) {
        console.error("Error al eliminar soporte:", error);
        res.status(500).json({ error: "Error al eliminar soporte" });
    }
};

module.exports = {
    obtenerSoportes,
    obtenerSoportePorCliente,
    crearSoporte,
    actualizarSoporte,
    eliminarSoporte
};
