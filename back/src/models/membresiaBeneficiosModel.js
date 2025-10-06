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
    },
    descripcion: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: false,
    tableName: "membresiabeneficio",
});

module.exports = MembresiaBeneficio;