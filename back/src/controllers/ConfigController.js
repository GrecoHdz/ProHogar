const Config = require("../models/configModel");
const { Op } = require('sequelize');

//Obtener todas las configuraciones
const obtenerConfig = async (req, res) => {
    try {
        const config = await Config.findAll();
        res.json(config);
    } catch (error) {
        console.error("Error al obtener configuraciones:", error);
        res.status(500).json({ 
            error: "Error al obtener configuraciones",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Obtener configuracion por id
const obtenerConfigPorId = async (req, res) => {
    try {
        const config = await Config.findOne({ where: { id_config: req.params.id } });
        res.json(config);
    } catch (error) {
        console.error("Error al obtener configuracion por id:", error);
        res.status(500).json({ 
            error: "Error al obtener configuracion por id",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Obtener valor de configuracion
const obtenerValorConfig = async (req, res) => {
    try {
        const { tipo_config } = req.params;
        
        if (tipo_config === 'referidor_predeterminado') {
            const config = await Config.findOne({
                where: { tipo_config },
                include: [{
                    model: require('../models/usuariosModel'),
                    as: 'usuario',
                    attributes: ['id_usuario', 'nombre']
                }]
            });
            
            if (config && config.usuario) {
                return res.json({
                    ...config.toJSON(),
                    usuario: {
                        id_usuario: config.usuario.id_usuario,
                        nombre: config.usuario.nombre
                    }
                });
            }
        }
        
        // Para otros tipos de configuración o si no se encontró el referidor
        const config = await Config.findOne({ where: { tipo_config } });
        res.json(config);
    } catch (error) {
        console.error("Error al obtener valor de configuracion:", error);
        res.status(500).json({ 
            error: "Error al obtener valor de configuracion",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Crear configuracion
const crearConfig = async (req, res) => {
    try {
        const config = await Config.create(req.body);
        res.json(config);
    } catch (error) {
        console.error("Error al crear configuracion:", error);
        res.status(500).json({ 
            error: "Error al crear configuracion",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Actualizar configuracion
const actualizarConfig = async (req, res) => {
    try {
        const config = await Config.update(req.body, { where: { id_config: req.params.id } });
        res.json(config);
    } catch (error) {
        console.error("Error al actualizar configuracion:", error);
        res.status(500).json({ 
            error: "Error al actualizar configuracion",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Eliminar configuracion
const eliminarConfig = async (req, res) => {
    try {
        const config = await Config.destroy({ where: { id_config: req.params.id } });
        res.json(config);
    } catch (error) {
        console.error("Error al eliminar configuracion:", error);
        res.status(500).json({ 
            error: "Error al eliminar configuracion",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    obtenerConfig,
    obtenerConfigPorId,
    obtenerValorConfig,
    crearConfig,
    actualizarConfig,
    eliminarConfig
};
