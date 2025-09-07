const Config = require("../models/configModel");
const { Op } = require('sequelize');

//Obtener todas las configuraciones
const obtenerConfig = async (req, res) => {
    try {
        const config = await Config.findAll();
        res.json(config);
    } catch (error) {
        console.error("Error al obtener configuraciones:", error);
        res.status(500).json({ error: "Error al obtener configuraciones" });
    }
};

//Obtener configuracion por id
const obtenerConfigPorId = async (req, res) => {
    try {
        const config = await Config.findOne({ where: { id_config: req.params.id } });
        res.json(config);
    } catch (error) {
        console.error("Error al obtener configuracion por id:", error);
        res.status(500).json({ error: "Error al obtener configuracion por id" });
    }
};

//Obtener valor de configuracion
const obtenerValorConfig = async (req, res) => {
    try {
        const config = await Config.findOne({ where: { tipo_config: req.params.tipo_config } });
        res.json(config);
    } catch (error) {
        console.error("Error al obtener valor de configuracion:", error);
        res.status(500).json({ error: "Error al obtener valor de configuracion" });
    }
};

//Crear configuracion
const crearConfig = async (req, res) => {
    try {
        const config = await Config.create(req.body);
        res.json(config);
    } catch (error) {
        console.error("Error al crear configuracion:", error);
        res.status(500).json({ error: "Error al crear configuracion" });
    }
};

//Actualizar configuracion
const actualizarConfig = async (req, res) => {
    try {
        const config = await Config.update(req.body, { where: { id_config: req.params.id } });
        res.json(config);
    } catch (error) {
        console.error("Error al actualizar configuracion:", error);
        res.status(500).json({ error: "Error al actualizar configuracion" });
    }
};

//Eliminar configuracion
const eliminarConfig = async (req, res) => {
    try {
        const config = await Config.destroy({ where: { id_config: req.params.id } });
        res.json(config);
    } catch (error) {
        console.error("Error al eliminar configuracion:", error);
        res.status(500).json({ error: "Error al eliminar configuracion" });
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
