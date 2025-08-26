const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const RefreshToken = sequelize.define('RefreshToken', {  // Cambiado a PascalCase
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
        references: {  // Referencia explícita a la tabla usuarios
            model: 'usuario',
            key: 'id_usuario'
        }
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: 'refresh_tokens',
    indexes: [
        // Índice para búsquedas por usuario_id
        {
            name: 'idx_refresh_token_usuario',
            unique: true,
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