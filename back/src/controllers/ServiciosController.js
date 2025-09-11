const Servicio = require("../models/serviciosModel");

//Obtener todos los servicios
const obtenerServicios = async (req, res) => {
    try {
        const servicios = await Servicio.findAll();
        res.json(servicios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener los servicios" });
    }
};

//Obtener todos los servicios activos
const obtenerServiciosActivos = async (req, res) => {
    try {
        const servicios = await Servicio.findAll({ where: { estado: 1 } });
        res.json(servicios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener los servicios activos" });
    }
};

//Obtener un servicio por ID
const obtenerServicioPorId = async (req, res) => {
    try {
        const servicio = await Servicio.findByPk(req.params.id);
        if (!servicio) {
            return res.status(404).json({ error: "Servicio no encontrado" });
        }
        res.json(servicio);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener el servicio" });
    }
};

//Crear un servicio
const crearServicio = async (req, res) => {
    try {
        const servicio = await Servicio.create(req.body);
        res.json(servicio);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear el servicio" });
    }
};

//Actualizar un servicio
const actualizarServicio = async (req, res) => {
    try {
        const servicio = await Servicio.findByPk(req.params.id);
        if (!servicio) {
            return res.status(404).json({ error: "Servicio no encontrado" });
        }
        await servicio.update(req.body);
        res.json(servicio);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar el servicio" });
    }
};

//Eliminar un servicio
const eliminarServicio = async (req, res) => {
    try {
        const servicio = await Servicio.findByPk(req.params.id);
        if (!servicio) {
            return res.status(404).json({ error: "Servicio no encontrado" });
        }
        await servicio.destroy();
        res.json({ message: "Servicio eliminado correctamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar el servicio" });
    }
};

module.exports = {
    obtenerServicios,
    obtenerServicioPorId,
    obtenerServiciosActivos,
    crearServicio,
    actualizarServicio,
    eliminarServicio
};
