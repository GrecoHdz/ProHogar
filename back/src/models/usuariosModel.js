const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Usuario = sequelize.define("Usuario", {
    id_usuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_ciudad: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_rol: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    identidad: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: 'uk_usuario_identidad'
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: 'uk_usuario_email',
        validate: {
            isEmail: true
        }
    },
    telefono: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: 'uk_usuario_telefono'
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    fecha_registro: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    estado: {
        type: DataTypes.ENUM('activo', 'inactivo','deshabilitado'),
        allowNull: false,
        defaultValue: 'activo'
    },
    reset_password_token: {
        type: DataTypes.STRING,
        allowNull: true
    },
    reset_password_expires: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: false,
    tableName: 'usuario',
    indexes: [
        // Índice para búsquedas por rol
        {
            name: 'idx_usuario_id_rol',
            fields: ['id_rol']
        },
        // Índice para búsquedas por estado
        {
            name: 'idx_usuario_estado',
            fields: ['estado']
        },
        // Índice para búsquedas por ciudad
        {
            name: 'idx_usuario_id_ciudad',
            fields: ['id_ciudad']
        }
    ]
});


module.exports = Usuario;
