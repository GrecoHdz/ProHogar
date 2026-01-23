const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const PaqueteUsuario = sequelize.define("PaqueteUsuario", {
    id_paquete_usuario: {
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
    id_paquete: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'paquetes',
            key: 'id_paquete'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    fecha_actualizacion: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    estado: {
        type: DataTypes.ENUM('activo', 'utilizando', 'utilizado', 'verificando_pago', 'rechazado'),
        allowNull: false,
        defaultValue: 'activo'
    }
}, {
    timestamps: false,
    tableName: 'paquetes_usuarios',
    indexes: [
        {
            name: 'idx_paquete_usuario',
            fields: ['id_paquete']
        },
        {
            name: 'idx_paquete_estado',
            fields: ['estado']
        }
    ]
});

module.exports = PaqueteUsuario;