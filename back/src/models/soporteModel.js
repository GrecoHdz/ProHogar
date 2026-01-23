const DataTypes = require("sequelize");
const { sequelize } = require("../config/database");
const Usuario = require("./usuariosModel");

const Soporte = sequelize.define("Soporte", {
    id_soporte: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuario',
            key: 'id_usuario'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    id_solicitud: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'solicitudservicio',
            key: 'id_solicitud'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
        allowNull: true,
        defaultValue: true
    }
}, {
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    tableName: "soporte"
});

// Definir la relación con Usuario
Soporte.belongsTo(Usuario, {
    foreignKey: 'id_usuario',
    as: 'usuario',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

module.exports = Soporte;