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
        allowNull: true,
        references: {
            model: 'roles',
            key: 'id_rol'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
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
    // Agregamos campos para auditoría
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
            name: 'idx_usuario_activo',
            fields: ['activo']
        }
    ]
});

// Agregamos la relación con Rol después de definir el modelo
Usuario.associate = function(models) {
  Usuario.belongsTo(models.Rol, {
    foreignKey: 'id_rol',
    as: 'rol',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });
};

module.exports = Usuario;
