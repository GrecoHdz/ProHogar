const Referido = require("../models/referidosModel");
const { Op } = require("sequelize");

// Obtener todos los referidos
const getAllReferidos = async (req, res) => {
    try {
        const referidos = await Referido.findAll();
        res.json({ 
            success: true,
            data: referidos 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false,
            error: "Error al obtener los referidos" 
        });
    }
};

// Obtener referidos de un usuario
const getReferidosByUser = async (req, res) => {
    try {
        const { id_referidor } = req.params;
        const referidos = await Referido.findAll({ where: { id_referidor } });
        res.json({ 
            success: true,
            data: referidos 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false,
            error: "Error al obtener los referidos" 
        });
    }
};

// Obtener referidor de un usuario
const getReferidorByUser = async (req, res) => {
    try {
        const { id_referido_usuario } = req.params;
        const referido = await Referido.findOne({ 
            where: { id_referido_usuario } 
        });
        
        if (!referido) {
            return res.status(404).json({ 
                success: false,
                message: "No se encontró el referidor" 
            });
        }
        
        res.json({ 
            success: true,
            id_referidor: referido.id_referidor
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false,
            error: "Error al obtener el referidor" 
        });
    }
};

// Crear Referido
const createReferido = async (req, res) => {
    try {
        const { id_referidor, id_referido_usuario } = req.body;
        
        // Validar que no exista ya el referido
        const existeReferido = await Referido.findOne({ 
            where: { id_referido_usuario } 
        });
        
        if (existeReferido) {
            return res.status(400).json({ 
                success: false,
                error: "Este usuario ya tiene un referido registrado" 
            });
        }
        
        const referido = await Referido.create({ 
            id_referidor, 
            id_referido_usuario 
        });
        
        res.status(201).json({ 
            success: true,
            data: referido 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false,
            error: "Error al crear el referido" 
        });
    }
};

module.exports = {
    getAllReferidos,
    getReferidosByUser,
    getReferidorByUser,
    createReferido
};