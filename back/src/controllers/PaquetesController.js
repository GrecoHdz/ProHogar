const Paquete = require("../models/paquetesModel");
const PaqueteUsuario = require("../models/paquetesUsuariosModel");
const Ciudad = require("../models/ciudadesModel");
const { Op } = require('sequelize');

// Obtener todos los paquetes
const obtenerPaquetes = async (req, res) => {
    try {
        const { id_ciudad } = req.query;
        const queryOptions = {
            include: [{
                model: Ciudad,
                as: 'ciudades',
                through: { attributes: [] }
            }]
        };

        if (id_ciudad) {
            queryOptions.include[0].where = { id_ciudad };
            queryOptions.include[0].required = true;
        }

        const paquetes = await Paquete.findAll(queryOptions);
        res.json(paquetes);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error al obtener los paquetes",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener todos los paquetes activos 
const obtenerPaquetesActivos = async (req, res) => {
    try {
        const { id_ciudad, id_usuario } = req.query;
        
        // Primero obtenemos los paquetes que ya tiene el usuario
        let paquetesUsuario = [];
        if (id_usuario) {
            paquetesUsuario = await PaqueteUsuario.findAll({
                where: { id_usuario },
                attributes: ['id_paquete']
            });
        }
        const idsPaquetesUsuario = paquetesUsuario.map(p => p.id_paquete);

        const paquetesDelUsuario = idsPaquetesUsuario.length > 0
            ? await Paquete.findAll({
                where: { 
                    id_paquete: { [Op.in]: idsPaquetesUsuario },
                    estado: true
                },
                include: [{
                    model: Ciudad,
                    as: 'ciudades',
                    through: { attributes: [] },
                    where: id_ciudad ? { id_ciudad } : {},
                    required: !!id_ciudad
                }]
            })
            : [];

        // Luego obtenemos los paquetes disponibles
        const queryOptions = {
            where: { 
                estado: true,
                [Op.and]: [
                    // Paquetes que el usuario no tiene
                    { id_paquete: { [Op.notIn]: idsPaquetesUsuario } },
                    // Y que estén disponibles (cantidad > 0 o ilimitados)
                    {
                        [Op.or]: [
                            { cantidad: { [Op.gt]: 0 } },
                            { cantidad: null }
                        ]
                    }
                ]
            },
            include: [{
                model: Ciudad,
                as: 'ciudades',
                through: { attributes: [] },
                where: id_ciudad ? { id_ciudad } : {},
                required: !!id_ciudad
            }]
        };

        const paquetesDisponibles = await Paquete.findAll(queryOptions);
        
        // Combinamos los paquetes del usuario con los disponibles
        const todosLosPaquetes = [...paquetesDelUsuario, ...paquetesDisponibles];
        
        // Agregar información de disponibilidad a cada paquete
        const paquetesConDisponibilidad = todosLosPaquetes.map(paquete => ({
            ...paquete.toJSON(),
            disponible: !idsPaquetesUsuario.includes(paquete.id_paquete) && 
                       (paquete.cantidad === null || paquete.cantidad > 0)
        }));

        res.json(paquetesConDisponibilidad);
    } catch (error) {
        console.error('Error en obtenerPaquetesActivos:', error);
        res.status(500).json({
            success: false,
            error: "Error al obtener los paquetes activos",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener un paquete por ID
const obtenerPaquetePorId = async (req, res) => {
    try {
        const paquete = await Paquete.findByPk(req.params.id, {
            include: [{
                model: Ciudad,
                as: 'ciudades',
                through: { attributes: [] }
            }]
        });
        if (!paquete) {
            return res.status(404).json({
                success: false,
                error: "Paquete no encontrado"
            });
        }
        res.json(paquete);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Error al obtener el paquete",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Crear un nuevo paquete
const crearPaquete = async (req, res) => {
    try {
        const { nombre, descripcion, costo, cantidad, id_ciudades } = req.body;

        // Validar que se proporcionen todos los campos requeridos
        if (!nombre || !descripcion || costo === undefined) {
            return res.status(400).json({
                success: false,
                error: "Los campos nombre, descripción y costo son obligatorios"
            });
        }

        // Validar que el costo sea un número positivo
        if (isNaN(costo) || costo <= 0) {
            return res.status(400).json({
                success: false,
                error: "El costo debe ser un número positivo"
            });
        }

        // Validar que si se proporciona cantidad, sea un número entero positivo
        if (cantidad !== undefined && (isNaN(cantidad) || cantidad < 1 || !Number.isInteger(Number(cantidad)))) {
            return res.status(400).json({
                success: false,
                error: "La cantidad debe ser un número entero positivo mayor a 0"
            });
        }

        // Crear el objeto de paquete con los campos proporcionados
        const datosPaquete = {
            nombre,
            descripcion,
            costo,
            cantidad: cantidad || null, // Si cantidad es undefined, se guarda como null
            estado: true
        };

        const paquete = await Paquete.create(datosPaquete);

        if (id_ciudades && Array.isArray(id_ciudades)) {
            await paquete.setCiudades(id_ciudades);
        }

        const paqueteCompleto = await Paquete.findByPk(paquete.id_paquete, {
            include: [{
                model: Ciudad,
                as: 'ciudades',
                through: { attributes: [] }
            }]
        });

        res.status(201).json({
            success: true,
            message: 'Paquete creado correctamente',
            data: paqueteCompleto
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Error al crear el paquete",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Actualizar un paquete existente
const actualizarPaquete = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, costo, estado, cantidad, id_ciudades } = req.body;

        const paquete = await Paquete.findByPk(id);
        if (!paquete) {
            return res.status(404).json({
                success: false,
                error: "Paquete no encontrado"
            });
        }

        // Validar que el costo sea un número positivo si se proporciona
        if (costo !== undefined && (isNaN(costo) || costo <= 0)) {
            return res.status(400).json({
                success: false,
                error: "El costo debe ser un número positivo"
            });
        }

        // Validar que si se proporciona cantidad, sea un número entero positivo
        if (cantidad !== undefined) {
            if (isNaN(cantidad) || cantidad < 1 || !Number.isInteger(Number(cantidad))) {
                return res.status(400).json({
                    success: false,
                    error: "La cantidad debe ser un número entero positivo mayor a 0"
                });
            }
        }

        // Actualizar solo los campos proporcionados
        const datosActualizados = {};
        if (nombre !== undefined) datosActualizados.nombre = nombre;
        if (descripcion !== undefined) datosActualizados.descripcion = descripcion;
        if (costo !== undefined) datosActualizados.costo = costo;
        if (estado !== undefined) datosActualizados.estado = estado;
        if (cantidad !== undefined) {
            // Si se envía null o un valor, lo guardamos tal cual
            // Si se envía una cadena vacía o undefined, lo convertimos a null
            datosActualizados.cantidad = cantidad || null;
        }

        await paquete.update(datosActualizados);

        if (id_ciudades && Array.isArray(id_ciudades)) {
            await paquete.setCiudades(id_ciudades);
        }

        const paqueteCompleto = await Paquete.findByPk(id, {
            include: [{
                model: Ciudad,
                as: 'ciudades',
                through: { attributes: [] }
            }]
        });

        res.json({
            success: true,
            message: 'Paquete actualizado correctamente',
            data: paqueteCompleto
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Error al actualizar el paquete",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Cambiar estado de un paquete (activar/desactivar)
const desactivarPaquete = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        // Validar que el estado sea un booleano
        if (typeof estado !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: "El estado debe ser un valor booleano (true/false)"
            });
        }

        const paquete = await Paquete.findByPk(id);
        if (!paquete) {
            return res.status(404).json({
                success: false,
                error: "Paquete no encontrado"
            });
        }

        // Actualizar el estado del paquete
        await paquete.update({ estado });

        const accion = estado ? 'activado' : 'desactivado';
        res.json({
            success: true,
            message: `Paquete ${accion} correctamente`,
            data: {
                id: paquete.id_paquete,
                estado: paquete.estado
            }
        });
    } catch (error) {
        console.error('Error al cambiar el estado del paquete:', error);
        res.status(500).json({
            success: false,
            error: "Error al cambiar el estado del paquete",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Eliminar permanentemente un paquete (solo para administradores)
const eliminarPaquete = async (req, res) => {
    try {
        const paquete = await Paquete.findByPk(req.params.id);
        if (!paquete) {
            return res.status(404).json({
                success: false,
                error: "Paquete no encontrado"
            });
        }

        await paquete.destroy();

        res.json({
            success: true,
            message: "Paquete eliminado permanentemente"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Error al eliminar el paquete",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    obtenerPaquetes,
    obtenerPaquetesActivos,
    obtenerPaquetePorId,
    crearPaquete,
    actualizarPaquete,
    desactivarPaquete,
    eliminarPaquete
};
