const VehiculoConductor = require("../models/vehiculoConductorModel");
const Usuario = require("../models/usuariosModel");
const { cloudinary } = require('../config/cloudinary');

// Obtener vehículo por ID de técnico
const obtenerVehiculoPorTecnico = async (req, res) => {
    try {
        const vehiculo = await VehiculoConductor.findOne({
            where: { id_tecnico: req.params.id_tecnico },
            include: [{
                model: Usuario,
                as: 'conductor',
                attributes: ['nombre', 'telefono']
            }]
        });
        res.json(vehiculo || null);
    } catch (error) {
        console.error('Error al obtener vehículo del conductor:', error);
        res.status(500).json({ error: "Error al obtener el vehículo del conductor" });
    }
};

// Obtener vehículo por ID de vehículo
const obtenerVehiculoPorId = async (req, res) => {
    try {
        const vehiculo = await VehiculoConductor.findByPk(req.params.id, {
            include: [{
                model: Usuario,
                as: 'conductor',
                attributes: ['nombre', 'telefono']
            }]
        });
        if (!vehiculo) {
            return res.status(404).json({ error: "Vehículo no encontrado" });
        }
        res.json(vehiculo);
    } catch (error) {
        console.error('Error al obtener vehículo:', error);
        res.status(500).json({ error: "Error al obtener el vehículo" });
    }
};

// Crear o actualizar vehículo de conductor (upsert)
const crearVehiculo = async (req, res) => {
    try {
        const existing = await VehiculoConductor.findOne({ where: { id_tecnico: req.body.id_tecnico } });
        if (existing) {
            await existing.update(req.body);
            return res.json({ success: true, message: 'Vehículo actualizado correctamente', data: existing });
        }
        const vehiculo = await VehiculoConductor.create(req.body);
        res.json({ success: true, message: 'Vehículo registrado correctamente', data: vehiculo });
    } catch (error) {
        console.error('Error al crear vehículo:', error);
        res.status(500).json({ success: false, error: "Error al registrar el vehículo" });
    }
};

// Actualizar datos básicos del vehículo
const actualizarVehiculo = async (req, res) => {
    try {
        const vehiculo = await VehiculoConductor.findByPk(req.params.id);
        if (!vehiculo) return res.status(404).json({ success: false, error: "Vehículo no encontrado" });
        await vehiculo.update(req.body);
        res.json({ success: true, message: 'Vehículo actualizado correctamente', data: vehiculo });
    } catch (error) {
        console.error('Error al actualizar vehículo:', error);
        res.status(500).json({ success: false, error: "Error al actualizar el vehículo" });
    }
};

// Subir / actualizar foto del vehículo
const actualizarFotoVehiculo = async (req, res) => {
    try {
        const { id, campo } = req.params;

        if (!['foto1', 'foto2'].includes(campo)) {
            return res.status(400).json({ success: false, error: 'Campo de foto no válido' });
        }

        const vehiculo = await VehiculoConductor.findByPk(id);
        if (!vehiculo) {
            return res.status(404).json({ success: false, error: 'Vehículo no encontrado' });
        }

        const publicIdAntiguo = vehiculo[`${campo}_public_id`];

        if (req.file) {
            await vehiculo.update({
                [campo]: req.file.path,
                [`${campo}_public_id`]: req.file.filename
            });

            if (publicIdAntiguo) {
                try { await cloudinary.uploader.destroy(publicIdAntiguo); } catch (e) { /* silencioso */ }
            }

            return res.json({
                success: true,
                message: 'Imagen actualizada correctamente',
                data: { url: req.file.path, campo }
            });
        }

        return res.status(400).json({ success: false, error: 'No se proporcionó ninguna imagen' });

    } catch (error) {
        console.error('Error al actualizar foto del vehículo:', error);
        if (req.file && req.file.filename) {
            try { await cloudinary.uploader.destroy(req.file.filename); } catch (e) { /* silencioso */ }
        }
        res.status(500).json({ success: false, error: 'Error al actualizar la foto' });
    }
};

// Eliminar foto del vehículo
const eliminarFotoVehiculo = async (req, res) => {
    try {
        const { id, campo } = req.params;

        if (!['foto1', 'foto2'].includes(campo)) {
            return res.status(400).json({ success: false, error: 'Campo de foto no válido' });
        }

        const vehiculo = await VehiculoConductor.findByPk(id);
        if (!vehiculo) return res.status(404).json({ success: false, error: 'Vehículo no encontrado' });

        const publicId = vehiculo[`${campo}_public_id`];
        if (!publicId) {
            return res.status(400).json({ success: false, error: 'No hay ninguna foto para eliminar en este campo' });
        }

        await vehiculo.update({ [campo]: null, [`${campo}_public_id`]: null });

        try { await cloudinary.uploader.destroy(publicId); } catch (e) { /* silencioso */ }

        res.json({ success: true, message: 'Imagen eliminada correctamente' });

    } catch (error) {
        console.error('Error al eliminar foto del vehículo:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar la foto' });
    }
};

module.exports = {
    obtenerVehiculoPorTecnico,
    obtenerVehiculoPorId,
    crearVehiculo,
    actualizarVehiculo,
    actualizarFotoVehiculo,
    eliminarFotoVehiculo
};
