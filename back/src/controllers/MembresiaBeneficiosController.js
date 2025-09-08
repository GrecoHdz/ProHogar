const MembresiaBeneficio = require("../models/membresiaBeneficiosModel");

//Obtener todos los beneficios
const obtenerBeneficios = async (req, res) => {
    try {
        const benefits = await MembresiaBeneficio.findAll();
        res.json(benefits);
    } catch (error) {
        console.error(error);
        return null;
    }
}

//Obtener un beneficio por id
const obtenerBeneficioPorId = async (req, res) => {
    try {
        const benefit = await MembresiaBeneficio.findByPk(id);
        res.json(benefit);
    } catch (error) {
        console.error(error);
        return null;
    }
} 

//Crear un beneficio
const crearBeneficio = async (req, res) => {
    try {
        const newBenefit = await MembresiaBeneficio.create(req.body);
        res.json(newBenefit);
    } catch (error) {
        console.error(error);
        return null;
    }
}

//Actualizar un beneficio
const actualizarBeneficio = async (req, res) => {
    try {
        const updatedBenefit = await MembresiaBeneficio.update(req.body, { where: { id_beneficio: req.params.id } });
        res.json(updatedBenefit);
    } catch (error) {
        console.error(error);
        return null;
    }
}

//Eliminar un beneficio
const eliminarBeneficio = async (req, res) => {
    try {
        const deletedBenefit = await MembresiaBeneficio.destroy({ where: { id_beneficio: req.params.id } });
        res.json(deletedBenefit);
    } catch (error) {
        console.error(error);
        return null;
    }
}

module.exports = {
    obtenerBeneficios,
    obtenerBeneficioPorId,
    crearBeneficio,
    actualizarBeneficio,
    eliminarBeneficio
}
