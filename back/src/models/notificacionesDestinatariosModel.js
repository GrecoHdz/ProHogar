const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const NotificacionDestinatario = sequelize.define("NotificacionDestinatario", {
    id_destinatario_notificacion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_notificacion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'notificaciones',
            key: 'id_notificacion'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'usuario',
            key: 'id_usuario'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    leido: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    fecha_creacion: {
        type: DataTypes.DATE,
        allowNull: false
    },
    fecha_leido: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: false,
    tableName: "notificaciones_destinatarios",
});

module.exports = NotificacionDestinatario;

