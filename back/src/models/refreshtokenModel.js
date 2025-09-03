const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const RefreshToken = sequelize.define('RefreshToken', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    token: {
        type: DataTypes.STRING(512),  // Longitud específica para tokens JWT
        allowNull: false,
        unique: 'token_unique'  // Nombre explícito para la restricción única
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuario',
            key: 'id_usuario',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        }
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: 'refresh_tokens',
    // Deshabilitar la sincronización automática de índices para evitar duplicados
    sync: { alter: false },
    indexes: [
        // Índice único para token (con nombre explícito)
        {
            name: 'token_unique',
            unique: true,
            fields: ['token']
        },
        // Índice para búsquedas por usuario_id (no único)
        {
            name: 'idx_refresh_token_usuario',
            fields: ['usuario_id']
        },
        // Índice para limpieza de tokens expirados
        {
            name: 'idx_refresh_token_expires',
            fields: ['expires_at']
        }
    ]
});

// Relación con Usuario
RefreshToken.associate = function(models) {
    RefreshToken.belongsTo(models.Usuario, {
        foreignKey: 'usuario_id',
        as: 'usuario',
        onDelete: 'CASCADE',  // Eliminar tokens cuando se elimine el usuario
        onUpdate: 'CASCADE'
    });
};

module.exports = RefreshToken;