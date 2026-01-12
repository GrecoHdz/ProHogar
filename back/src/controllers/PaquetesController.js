const Paquete = require("../models/paquetesModel");

// Obtener todos los paquetes
const obtenerPaquetes = async (req, res) => {
    try {
        const paquetes = await Paquete.findAll();
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
        const paquetes = await Paquete.findAll({ where: { estado: true } });
        res.json(paquetes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            error: "Error al obtener los paquetes activos",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener un paquete por ID
const obtenerPaquetePorId = async (req, res) => {
    try {
        const paquete = await Paquete.findByPk(req.params.id);
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
        const { nombre, descripcion, costo } = req.body;
        
        // Validar que se proporcionen todos los campos requeridos
        if (!nombre || !descripcion || costo === undefined) {
            return res.status(400).json({
                success: false,
                error: "Todos los campos son obligatorios"
            });
        }

        // Validar que el costo sea un número positivo
        if (isNaN(costo) || costo <= 0) {
            return res.status(400).json({
                success: false,
                error: "El costo debe ser un número positivo"
            });
        }

        const paquete = await Paquete.create({
            nombre,
            descripcion,
            costo,
            estado: true
        });

        res.status(201).json({ 
            success: true,
            message: 'Paquete creado correctamente',
            data: paquete 
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
        const { nombre, descripcion, costo, estado } = req.body;

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

        // Actualizar solo los campos proporcionados
        const datosActualizados = {};
        if (nombre !== undefined) datosActualizados.nombre = nombre;
        if (descripcion !== undefined) datosActualizados.descripcion = descripcion;
        if (costo !== undefined) datosActualizados.costo = costo;
        if (estado !== undefined) datosActualizados.estado = estado;

        await paquete.update(datosActualizados);
        
        res.json({ 
            success: true,
            message: 'Paquete actualizado correctamente',
            data: paquete 
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
