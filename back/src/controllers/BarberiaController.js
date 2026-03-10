const Barberia = require("../models/barberiaModel");
const Usuario = require("../models/usuariosModel");
const { cloudinary } = require('../config/cloudinary');

// Obtener todas las barberías
const obtenerBarberias = async (req, res) => {
    try {
        const barberias = await Barberia.findAll({
            include: [{
                model: Usuario,
                as: 'tecnico',
                attributes: ['nombre']
            }]
        });
        res.json(barberias);
    } catch (error) {
        console.error('Error al obtener barberías:', error);
        res.status(500).json({
            error: 'Error al obtener las barberías',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener barbería por ID de técnico
const obtenerBarberiaPorTecnico = async (req, res) => {
    try {
        const barberia = await Barberia.findOne({
            where: { id_tecnico: req.params.id_tecnico },
            include: [{
                model: Usuario,
                as: 'tecnico',
                attributes: ['nombre']
            }]
        });
        if (!barberia) {
            return res.json(null); // Return null if not found
        }
        res.json(barberia);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error al obtener la barbería del técnico",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener barbería por ID
const obtenerBarberiaPorId = async (req, res) => {
    try {
        const barberia = await Barberia.findByPk(req.params.id, {
            include: [{
                model: Usuario,
                as: 'tecnico',
                attributes: ['nombre']
            }]
        });
        if (!barberia) {
            return res.status(404).json({ error: "Barbería no encontrada" });
        }
        res.json(barberia);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error al obtener la barbería",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Crear una barbería
const crearBarberia = async (req, res) => {
    try {
        const barberia = await Barberia.create(req.body);
        res.json({
            success: true,
            message: 'Barbería creada correctamente',
            data: barberia
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Error al crear la barbería",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Actualizar una barbería
const actualizarBarberia = async (req, res) => {
    try {
        const barberia = await Barberia.findByPk(req.params.id);
        if (!barberia) {
            return res.status(404).json({
                success: false,
                error: "Barbería no encontrada"
            });
        }
        await barberia.update(req.body);
        res.json({
            success: true,
            message: 'Barbería actualizada correctamente',
            data: barberia
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Error al actualizar la barbería",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Eliminar una barbería
const eliminarBarberia = async (req, res) => {
    try {
        const barberia = await Barberia.findByPk(req.params.id);
        if (!barberia) {
            return res.status(404).json({
                success: false,
                error: "Barbería no encontrada"
            });
        }
        await barberia.destroy();
        res.json({
            success: true,
            message: "Barbería eliminada correctamente"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Error al eliminar la barbería",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Actualizar foto de la barbería
const actualizarFotoBarberia = async (req, res) => {
    try {
        const { id, campo } = req.params; // 'campo' será 'foto1' o 'foto2'

        if (!['foto1', 'foto2'].includes(campo)) {
            return res.status(400).json({ success: false, error: 'Campo de foto no válido' });
        }

        const barberia = await Barberia.findByPk(id);
        if (!barberia) {
            return res.status(404).json({ success: false, error: 'Barbería no encontrada' });
        }

        const publicIdAntiguo = barberia[`${campo}_public_id`];

        if (req.file) {
            // Actualizar la barbería con los nuevos datos de imagen
            const updates = {
                [campo]: req.file.path,
                [`${campo}_public_id`]: req.file.filename
            };
            await barberia.update(updates);

            // Eliminar la imagen anterior de Cloudinary si existía
            if (publicIdAntiguo) {
                try {
                    await cloudinary.uploader.destroy(publicIdAntiguo);
                } catch (error) {
                    console.error('Error al eliminar imagen anterior de Cloudinary:', error);
                }
            }

            return res.json({
                success: true,
                message: 'Imagen actualizada correctamente',
                data: {
                    url: req.file.path,
                    campo
                }
            });
        }

        return res.status(400).json({ success: false, error: 'No se proporcionó ninguna imagen' });

    } catch (error) {
        console.error('Error al actualizar foto de barbería:', error);

        // Limpiar la imagen recién subida si hubo un error en la BD
        if (req.file && req.file.filename) {
            try {
                await cloudinary.uploader.destroy(req.file.filename);
            } catch (e) {
                console.error('Error al limpiar imagen subida:', e);
            }
        }

        res.status(500).json({
            success: false,
            error: 'Error al actualizar la foto',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Eliminar foto de la barbería
const eliminarFotoBarberia = async (req, res) => {
    try {
        const { id, campo } = req.params;

        if (!['foto1', 'foto2'].includes(campo)) {
            return res.status(400).json({ success: false, error: 'Campo de foto no válido' });
        }

        const barberia = await Barberia.findByPk(id);
        if (!barberia) {
            return res.status(404).json({ success: false, error: 'Barbería no encontrada' });
        }

        const publicId = barberia[`${campo}_public_id`];

        if (!publicId) {
            return res.status(400).json({ success: false, error: 'No hay ninguna foto para eliminar en este campo' });
        }

        // Limpiar en la BD
        await barberia.update({
            [campo]: null,
            [`${campo}_public_id`]: null
        });

        // Eliminar de Cloudinary
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            console.error('Error al eliminar imagen de Cloudinary:', error);
        }

        res.json({
            success: true,
            message: 'Imagen eliminada correctamente'
        });

    } catch (error) {
        console.error('Error al eliminar foto de barbería:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar la foto',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    obtenerBarberias,
    obtenerBarberiaPorId,
    obtenerBarberiaPorTecnico,
    crearBarberia,
    actualizarBarberia,
    eliminarBarberia,
    actualizarFotoBarberia,
    eliminarFotoBarberia
};
