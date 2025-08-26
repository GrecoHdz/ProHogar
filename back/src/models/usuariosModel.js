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
            model: 'roles', // Nombre de la tabla a la que hace referencia
            key: 'id_rol'
        }
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    identidad: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    telefono: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    fecha_registro: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: "usuario",
    indexes: [
        // Solo índices realmente necesarios
        // Los campos con unique: true ya crean índices automáticamente
        {
            name: 'idx_usuario_id_rol',
            fields: ['id_rol']
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
