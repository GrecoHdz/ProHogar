const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const PagoVisita = sequelize.define("PagoVisita", {
    id_pagovisita: {
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
    id_solicitud: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'solicitudservicio',
            key: 'id_solicitud'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    id_cuenta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'cuentas',
            key: 'id_cuenta'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
    },
    monto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    num_comprobante: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fecha: {
        type: DataTypes.DATE,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM("pendiente", "aprobado", "rechazado"),
        allowNull: true,
        defaultValue: "pendiente"
    }
}, {
    timestamps: false,
    tableName: "pagovisita",
});

module.exports = PagoVisita;