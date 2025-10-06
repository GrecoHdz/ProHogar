const Referido = require("../models/referidosModel");
const Usuario = require("../models/usuariosModel");
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

// Obtener referidos de un usuario con paginación
const getReferidosByUser = async (req, res) => {
    try {
        const { id_referidor } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Obtener los referidos con paginación
        const { count, rows: referidos } = await Referido.findAndCountAll({ 
            where: { id_referidor },
            include: [{
                model: Usuario,
                as: 'usuario',
                attributes: ['nombre']
            }],
            attributes: ['fecha_referido'],
            order: [['fecha_referido', 'DESC']],
            limit: parseInt(limit),
            offset: offset,
            distinct: true
        });
        
        // Mapear los resultados para incluir solo el nombre y la fecha
        const referidosSimples = referidos.map(referido => ({
            nombre: referido.usuario?.nombre || 'Usuario no encontrado',
            fecha: referido.fecha_referido
        }));
        
        const totalPages = Math.ceil(count / limit);
        
        res.json({ 
            success: true,
            data: referidosSimples,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: totalPages
            }
        });
    } catch (error) {
        console.error('Error en getReferidosByUser:', error);
        res.status(500).json({ 
            success: false,
            error: "Error al obtener los referidos",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
            return res.json({ 
                success: true,
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