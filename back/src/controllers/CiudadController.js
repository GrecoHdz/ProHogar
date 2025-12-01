const Ciudad = require("../models/ciudadesModel");

//Obtener todas las Ciudades
const obtenerCiudades = async (req, res) => {
    try {
        const ciudades = await Ciudad.findAll();
        res.json(ciudades);
    } catch (error) {
        console.error("Error al obtener ciudades:", error);
        res.status(500).json({ error: "Error al obtener ciudades" });
    }
};

//Obtener una Ciudad por nombre
const obtenerCiudadPorNombre = async (req, res) => {
    const { nombre } = req.params;
    
    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ error: "Se requiere un término de búsqueda" });
    }
    
    try {
        const ciudad = await Ciudad.findOne({ where: { nombre } });
        
        if (!ciudad) {
            return res.status(404).json({ 
                mensaje: "No se encontró ninguna ciudad con el nombre proporcionado",
                nombreBuscado: nombre
            });
        }
        
        res.json(ciudad);
    } catch (error) {
        console.error("Error al obtener ciudad por nombre:", error);
        res.status(500).json({ 
            error: "Error al obtener ciudad por nombre",
            detalle: error.message 
        });
    }
};

//Crear una Ciudad
const crearCiudad = async (req, res) => {
    const { nombre_ciudad } = req.body;
    
    if (!nombre_ciudad) {
        return res.status(400).json({ error: "Se requiere el nombre de la ciudad" });
    }
    
    try {
        const ciudad = await Ciudad.create({ nombre_ciudad });
        res.status(201).json(ciudad);
    } catch (error) {
        console.error("Error al crear ciudad:", error);
        res.status(500).json({ error: "Error al crear ciudad" });
    }
};

//Actualizar una Ciudad
const actualizarCiudad = async (req, res) => {
    const { id } = req.params;
    const { nombre_ciudad } = req.body;
    
    if (!id) {
        return res.status(400).json({ error: "Se requiere el ID de la ciudad" });
    }
    
    try {
        const ciudad = await Ciudad.findByPk(id);
        if (!ciudad) {
            return res.status(404).json({ 
                mensaje: "No se encontró ninguna ciudad con el ID proporcionado",
                idBuscado: id
            });
        }
        
        ciudad.nombre_ciudad = nombre_ciudad;
        await ciudad.save();
        
        res.json(ciudad);
    } catch (error) {
        console.error("Error al actualizar ciudad:", error);
        res.status(500).json({ error: "Error al actualizar ciudad" });
    }
};

//Eliminar una Ciudad
const eliminarCiudad = async (req, res) => {
    const { id } = req.params;
    
    if (!id) {
        return res.status(400).json({ error: "Se requiere el ID de la ciudad" });
    }
    
    try {
        const ciudad = await Ciudad.findByPk(id);
        if (!ciudad) {
            return res.status(404).json({ 
                mensaje: "No se encontró ninguna ciudad con el ID proporcionado",
                idBuscado: id
            });
        }
        
        await ciudad.destroy();
        
        res.json({ mensaje: "Ciudad eliminada exitosamente" });
    } catch (error) {
        console.error("Error al eliminar ciudad:", error);
        res.status(500).json({ error: "Error al eliminar ciudad" });
    }
};

module.exports = {
    obtenerCiudades,
    obtenerCiudadPorNombre,
    crearCiudad,
    actualizarCiudad,
    eliminarCiudad
};
