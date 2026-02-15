const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SuscripcionNotificacion = sequelize.define("SuscripcionNotificacion", {
    id_suscripcion: {
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
    endpoint: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    expiration_time: {
        type: DataTypes.DATE,
        allowNull: true
    },
    keys_auth: {
        type: DataTypes.STRING,
        allowNull: false
    },
    keys_p256dh: {
        type: DataTypes.STRING,
        allowNull: false
    },
    user_agent: {
        type: DataTypes.STRING,
        allowNull: true
    },
    fecha_creacion: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: "suscripciones_notificaciones",
});

module.exports = SuscripcionNotificacion;
