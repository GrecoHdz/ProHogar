const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const VehiculoConductor = sequelize.define("vehiculo_conductor", {
    id_vehiculo: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_tecnico: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true // Un técnico = un vehículo registrado
    },
    placa: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    modelo: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    color: {
        type: DataTypes.STRING(50),
        allowNull: true
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
    tableName: "vehiculos_conductores",
});

module.exports = VehiculoConductor;
