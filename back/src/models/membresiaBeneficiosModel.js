const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const MembresiaBeneficio = sequelize.define("MembresiaBeneficio", {
    id_beneficio: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    mes_requerido: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    tipo_beneficio: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

module.exports = MembresiaBeneficio;