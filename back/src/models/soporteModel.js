const DataTypes = require("sequelize");
const { sequelize } = require("../config/database");

const Soporte = sequelize.define("Soporte", {
    id_soporte: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_solicitud: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    asunto: {
        type: DataTypes.STRING,
        allowNull: false
    },
    mensaje: {
        type: DataTypes.STRING,
        allowNull: false
    },
    estado: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    }
}, {
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    tableName: "soporte"
});

module.exports = Soporte;