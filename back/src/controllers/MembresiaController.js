const Membresia = require("../models/membresiaModel"); 

//Obtener todas las membresias
const obtenerMembresias = async (req, res) => {
    try {
        const membresias = await Membresia.findAll();
        res.json(membresias);
    } catch (error) {
        console.error("Error al obtener membresias:", error);
        res.status(500).json({ error: "Error al obtener membresias" });
    }
};

// Obtener historial completo de membresías de un usuario
const obtenerHistorialMembresias = async (req, res) => {
    try {
        const membresias = await Membresia.findAll({ 
            where: { id_usuario: req.params.id },
            order: [['fecha', 'DESC']], // Ordenar por fecha descendente
            raw: true
        });
        
        if (!membresias || membresias.length === 0) {
            return res.status(404).json({ 
                status: 'not_found',
                message: 'No se encontraron membresías para este usuario'
            });
        }
        
        res.json({
            status: 'success',
            data: membresias,
            count: membresias.length
        });
    } catch (error) {
        console.error("Error al obtener el historial de membresías:", error);
        res.status(500).json({ 
            status: 'error',
            message: 'Error al obtener el historial de membresías',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener la membresía activa más reciente de un usuario
const obtenerMembresiaActual = async (req, res) => {
    try {
        const membresia = await Membresia.findOne({ 
            where: { 
                id_usuario: req.params.id
            },
            order: [['fecha', 'DESC']], // Ordenar por fecha descendente
            raw: true
        });
        
        if (!membresia) {
            return res.status(404).json({ 
                status: 'not_found',
                message: 'No se encontró una membresía activa para este usuario'
            });
        }
        
        res.json({
            status: 'success',
            data: membresia
        });
    } catch (error) {
        console.error("Error al obtener la membresía actual:", error);
        res.status(500).json({ 
            status: 'error',
            message: 'Error al obtener la membresía actual',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Crear membresia
const crearMembresia = async (req, res) => {
    try {
        const datosMembresia = {
            ...req.body,
            fecha: new Date(),  // Agregar la fecha actual
            estado: 'pendiente' // Establecer estado inicial como pendiente
        };
        
        const membresia = await Membresia.create(datosMembresia);
        res.json(membresia);
    } catch (error) {
        console.error("Error al crear membresia:", error);
        res.status(500).json({ error: "Error al crear membresia" });
    }
};

//Actualizar membresia
const actualizarMembresia = async (req, res) => {
    try {
        const [updated] = await Membresia.update(req.body, { 
            where: { 
                id_membresia: req.params.id 
            } 
        });
        
        if (updated) {
            const updatedMembresia = await Membresia.findByPk(req.params.id);
            return res.json({
                status: 'success',
                data: updatedMembresia
            });
        }
        
        throw new Error('No se pudo actualizar la membresía');
    } catch (error) {
        console.error("Error al actualizar membresia:", error);
        res.status(500).json({ 
            status: 'error',
            message: 'Error al actualizar membresía',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Eliminar membresia
const eliminarMembresia = async (req, res) => {
    try {
        const membresia = await Membresia.destroy({ where: { id: req.params.id } });
        res.json(membresia);
    } catch (error) {
        console.error("Error al eliminar membresia:", error);
        res.status(500).json({ error: "Error al eliminar membresia" });
    }
};

module.exports = {
    obtenerMembresias,
    obtenerHistorialMembresias,
    obtenerMembresiaActual,
    crearMembresia,
    actualizarMembresia,
    eliminarMembresia
};
