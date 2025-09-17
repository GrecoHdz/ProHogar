const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SolicitudServicio = sequelize.define("solicitudservicio", {
    id_solicitud: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id_usuario'
        }
    },
    id_servicio: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'servicios',
            key: 'id_servicio'
        }
    },
    id_ciudad:{
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'ciudades',
            key: 'id_ciudad'
        }
    },
    id_tecnico: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'tecnicos',
            key: 'id_tecnico'
        }
    },
    colonia:{
        type: DataTypes.STRING,
        allowNull: false
    },
    direccion_precisa:{
        type: DataTypes.STRING,
        allowNull: false
    },
    descripcion:{
        type: DataTypes.TEXT,
        allowNull: false
    },
    fecha_solicitud:{
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
    },
    estado:{
        type: DataTypes.ENUM("pendiente_pagovisita", "pendiente_asignacion", "verificando_pagovisita","asignado", "pendiente_cotizacion","en_proceso", "pendiente_pagoservicio", "verificando_pagoservicio", "finalizado", "cancelado"),
        allowNull: false
    },
    pagar_visita:{
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    comentario:{
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: false,
    tableName: "solicitudservicio",
});

module.exports = SolicitudServicio;



