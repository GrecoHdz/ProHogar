const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Usuario = sequelize.define("Usuario", {
    id_usuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_rol: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    identidad: {
        type: DataTypes.STRING(20), // Especificar longitud máxima
        allowNull: false,
        unique: 'identidad_unique' // Nombre específico para la restricción única
    },
    email: {
        type: DataTypes.STRING(100), // Especificar longitud máxima
        allowNull: false,
        unique: 'email_unique' // Nombre específico para la restricción única
    },
    telefono: {
        type: DataTypes.STRING(20), // Especificar longitud máxima
        allowNull: false,
        unique: 'telefono_unique' // Nombre específico para la restricción única (consistente con los demás)
    },
    password_hash: {
        type: DataTypes.STRING(255), // Longitud suficiente para hashes
        allowNull: false
    },
    fecha_registro: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
    },
}, {
    timestamps: false, // Desactiva los timestamps automáticos de Sequelize
    tableName: "usuario", // Nombre de la tabla en minúsculas
    indexes: [
        // Índices
        {
            name: 'idx_usuario_identidad',
            unique: true,
            fields: ['identidad']
        },
        {
            name: 'idx_usuario_email',
            unique: true,
            fields: ['email']
        },
        {
            name: 'idx_usuario_id_rol',
            fields: ['id_rol']
        },
        // Índice único para teléfono ya está definido en el campo
    ]
});

module.exports = Usuario;
