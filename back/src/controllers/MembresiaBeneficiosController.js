const MembresiaBeneficio = require("../models/membresiaBeneficiosModel");
const Config = require("../models/configModel");

//Obtener todos los beneficios
const obtenerBeneficios = async (req, res) => {
    try {
        // Obtener beneficios de la base de datos
        const benefits = await MembresiaBeneficio.findAll({
            attributes: ['mes_requerido', 'tipo_beneficio', 'descripcion'],
            raw: true
        });

        // Obtener valores de configuración
        const [visitaTecnico, porcentajeDescuento] = await Promise.all([
            Config.findOne({ 
                where: { tipo_config: 'visita_tecnico' },
                attributes: ['valor'],
                raw: true
            }),
            Config.findOne({ 
                where: { tipo_config: 'porcentaje_descuento' },
                attributes: ['valor'],
                raw: true
            })
        ]);

        // Mapear beneficios y reemplazar valores según corresponda
        const beneficiosConValores = benefits.map(benefit => {
            let tipoBeneficio = benefit.tipo_beneficio;
            let descripcion = benefit.descripcion;

            // Reemplazar marcadores en el título y descripción
            if (tipoBeneficio.includes('%')) {
                tipoBeneficio = tipoBeneficio.replace('%', porcentajeDescuento?.valor || '0');
            }
            if (descripcion.includes('%')) {
                descripcion = descripcion.replace(/%/g, porcentajeDescuento?.valor || '0');
            }
            if (descripcion.includes('{visita_tecnico}')) {
                descripcion = descripcion.replace('{visita_tecnico}', visitaTecnico?.valor || '0');
            }

            return {
                ...benefit,
                tipo_beneficio: tipoBeneficio,
                descripcion: descripcion
            };
        });

        // Devolver beneficios junto con los valores de configuración
        res.json({
            beneficios: beneficiosConValores,
            valores: {
                visita_tecnico: visitaTecnico?.valor || '0',
                porcentaje_descuento: porcentajeDescuento?.valor || '10'
            }
        });
    } catch (error) {
        console.error('Error al obtener los beneficios:', error);
        res.status(500).json({ error: 'Error al obtener los beneficios' });
    }
}

//Obtener un beneficio por id
const obtenerBeneficioPorId = async (req, res) => {
    try {
        const benefit = await MembresiaBeneficio.findByPk(req.params.id);
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
