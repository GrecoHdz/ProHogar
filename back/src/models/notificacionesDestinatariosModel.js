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
        allowNull: false
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: true
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

