const { sequelize } = require("../config/database");

// Importar modelos
const MembresiaBeneficio = require("./membresiabeneficiosModel");
const Membresia = require("./membresiasModel");
const Usuario = require("./usuariosModel");
const Rol = require("./rolesModel");
const Referido = require("./referidosModel");
const Tecnico = require("./tecnicosModel");
const CategoriaServicio = require("./categoriasModel");
const Ciudad = require("./ciudadesModel");
const Membresia = require("./membresiasModel");


// Definir las asociaciones
MembresiaBeneficio.belongsTo(Membresia, { foreignKey: "id_membresia" });
MembresiaBeneficio.belongsTo(Membresia, { foreignKey: "id_beneficio" });
Membresia.hasMany(MembresiaBeneficio, { foreignKey: "id_membresia" });
MembresiaBeneficio.belongsTo(Membresia, { foreignKey: "id_membresia" });


// Ejecutar las asociaciones
setupAssociations();

module.exports = {
  sequelize
};