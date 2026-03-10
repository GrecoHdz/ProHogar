const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Barberia = sequelize.define("barberia", {
    id_barberia: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_tecnico: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    colonia: {
        type: DataTypes.STRING,
        allowNull: false
    },
    direccion_precisa: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    foto1: {
        type: DataTypes.STRING,
        allowNull: true
    },
    foto1_public_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    foto2: {
        type: DataTypes.STRING,
        allowNull: true
    },
    foto2_public_id: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: false,
    tableName: "barberias",
});

module.exports = Barberia;
