const CreditoUsuario = require("../models/creditoUsuariosModel");

//Obtener todos los creditos
const getAllCreditos = async (req, res) => {
    try {
        const creditos = await CreditoUsuario.findAll();
        res.json({
            success: true,
            data: creditos
        });
    } catch (error) {
        console.error('Error al obtener los créditos:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener los créditos',
            details: error.message 
        });
    }
};

//Obtener un credito por usuario
const getCreditoPorUsuario = async (req, res) => {
    try {
        const credito = await CreditoUsuario.findOne({ 
            where: { id_usuario: req.params.id_usuario } 
        });
        
        if (!credito) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró el crédito para el usuario especificado'
            });
        }
        
        res.json({
            success: true,
            data: credito
        });
    } catch (error) {
        console.error('Error al obtener el crédito:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener el crédito',
            details: error.message 
        });
    }
};

// Crear o actualizar crédito
const createCredito = async (req, res) => {
    try {
        const { id_usuario, monto_credito } = req.body; 

        // Buscar crédito existente
        const creditoExistente = await CreditoUsuario.findOne({ 
            where: { id_usuario } 
        });

        let montoFinal = parseInt(monto_credito);
        
        // Si ya existe un crédito, sumar el monto
        if (creditoExistente) {
            montoFinal += parseInt(creditoExistente.monto_credito);
        }
        
        // Crear o actualizar el crédito con el monto total
        const [credito, created] = await CreditoUsuario.upsert(
            { 
                id_usuario,
                monto_credito: montoFinal,
                fecha: new Date()
            },
            {
                where: { id_usuario },
                returning: true
            }
        );

        res.json({
            success: true,
            message: created ? 'Crédito creado exitosamente' : 'Crédito actualizado exitosamente',
            data: credito,
            monto_anterior: creditoExistente ? creditoExistente.monto_credito : 0,
            monto_agregado: monto_credito,
            monto_actual: montoFinal
        });
    } catch (error) {
        console.error('Error al guardar el crédito:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al procesar el crédito',
            details: error.message
        });
    }
}; 

// Resetear crédito de un usuario a 0
const resetCredito = async (req, res) => {
    try {
        const { id_usuario } = req.params;

        const creditoExistente = await CreditoUsuario.findOne({ 
            where: { id_usuario } 
        }); 

        // Actualizar monto_credito a 0
        creditoExistente.monto_credito = 0;
        creditoExistente.fecha = new Date();
        await creditoExistente.save();

        res.json({
            success: true,
            message: 'Crédito reseteado a 0 exitosamente',
            data: creditoExistente
        });
    } catch (error) {
        console.error('Error al resetear el crédito:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al resetear el crédito',
            details: error.message
        });
    }
};

//Eliminar credito
const deleteCredito = async (req, res) => {
    try {
        const resultado = await CreditoUsuario.destroy({ 
            where: { id_credito_usuario: req.params.id_credito_usuario } 
        });
        
        if (resultado === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró el crédito a eliminar'
            });
        }
        
        res.json({
            success: true,
            message: 'Crédito eliminado exitosamente',
            data: { id_credito_usuario: req.params.id_credito_usuario }
        });
    } catch (error) {
        console.error('Error al eliminar el crédito:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al eliminar el crédito',
            details: error.message 
        });
    }
};

module.exports = {
    getAllCreditos,
    getCreditoPorUsuario,
    createCredito,
    resetCredito,
    deleteCredito
};
