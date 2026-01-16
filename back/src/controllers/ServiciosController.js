const Servicio = require("../models/serviciosModel");
const Ciudad = require("../models/ciudadesModel");
const Paquete = require("../models/paquetesModel");
const PaqueteUsuario = require("../models/paquetesUsuariosModel");

// Obtener todos los servicios (filtra por ciudad solo si se envía)
const obtenerServicios = async (req, res) => {
    try {
        const { id_ciudad } = req.query;

        const includeCiudades = {
            model: Ciudad,
            as: 'ciudades',
            through: { attributes: [] },
            required: false
        };

        // Si viene id_ciudad, filtrar
        if (id_ciudad) {
            includeCiudades.where = { id_ciudad };
            includeCiudades.required = true;
        }

        const servicios = await Servicio.findAll({
            include: [includeCiudades]
        });

        res.json(servicios);

    } catch (error) {
        console.error('Error al obtener servicios:', error);
        res.status(500).json({
            error: 'Error al obtener los servicios',
            details: process.env.NODE_ENV === 'development'
                ? error.message
                : undefined
        });
    }
};


// Obtener todos los servicios activos (filtra por ciudad solo si se envía)
const obtenerServiciosActivos = async (req, res) => {
    try {
        const { id_ciudad } = req.query;

        const includeCiudades = {
            model: Ciudad,
            as: 'ciudades',
            through: { attributes: [] },
            required: false
        };

        // Si se envía ciudad, filtrar
        if (id_ciudad) {
            includeCiudades.where = { id_ciudad };
            includeCiudades.required = true;
        }

        const servicios = await Servicio.findAll({
            where: { estado: 1 },
            include: [includeCiudades]
        });

        res.json(servicios);

    } catch (error) {
        console.error('Error al obtener servicios activos:', error);
        res.status(500).json({
            error: 'Error al obtener los servicios activos',
            details: process.env.NODE_ENV === 'development'
                ? error.message
                : undefined
        });
    }
};


//Obtener un servicio por ID
const obtenerServicioPorId = async (req, res) => {
    try {
        const servicio = await Servicio.findByPk(req.params.id, {
            include: [{
                model: Ciudad,
                as: 'ciudades',
                through: { attributes: [] }
            }]
        });
        if (!servicio) {
            return res.status(404).json({ error: "Servicio no encontrado" });
        }
        res.json(servicio);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error al obtener el servicio",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Crear un servicio
const crearServicio = async (req, res) => {
    try {
        const { id_ciudades, ...servicioData } = req.body;
        const servicio = await Servicio.create(servicioData);

        if (id_ciudades && Array.isArray(id_ciudades)) {
            await servicio.setCiudades(id_ciudades);
        }

        const servicioCompleto = await Servicio.findByPk(servicio.id_servicio, {
            include: [{
                model: Ciudad,
                as: 'ciudades',
                through: { attributes: [] }
            }]
        });

        res.json({
            success: true,
            message: 'Servicio creado correctamente',
            data: servicioCompleto
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Error al crear el servicio",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Actualizar un servicio
const actualizarServicio = async (req, res) => {
    try {
        const { id_ciudades, ...servicioData } = req.body;
        const servicio = await Servicio.findByPk(req.params.id);

        if (!servicio) {
            return res.status(404).json({
                success: false,
                error: "Servicio no encontrado"
            });
        }

        await servicio.update(servicioData);

        if (id_ciudades && Array.isArray(id_ciudades)) {
            await servicio.setCiudades(id_ciudades);
        }

        const servicioCompleto = await Servicio.findByPk(servicio.id_servicio, {
            include: [{
                model: Ciudad,
                as: 'ciudades',
                through: { attributes: [] }
            }]
        });

        res.json({
            success: true,
            message: 'Servicio actualizado correctamente',
            data: servicioCompleto
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Error al actualizar el servicio",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Eliminar un servicio
const eliminarServicio = async (req, res) => {
    try {
        const servicio = await Servicio.findByPk(req.params.id);
        if (!servicio) {
            return res.status(404).json({
                success: false,
                error: "Servicio no encontrado"
            });
        }
        await servicio.destroy();
        res.json({
            success: true,
            message: "Servicio eliminado correctamente"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Error al eliminar el servicio",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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
