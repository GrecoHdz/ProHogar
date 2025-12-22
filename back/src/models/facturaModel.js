const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Factura = sequelize.define("Factura", {
    id_factura: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    numero_factura_correlativo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    cai: {
        type: DataTypes.STRING,
        allowNull: false
    },
    tipo_factura: {
        type: DataTypes.ENUM("CONSUMIDOR_FINAL", "CON_RTN"),
        allowNull: false
    },
    rtn_cliente: {
        type: DataTypes.STRING,
        allowNull: true
    },
    nombre_cliente: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fecha_emision: {
        type: DataTypes.DATE,
        allowNull: false
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    isv: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM("EMITIDA", "ANULADA"),
        allowNull: false,
        defaultValue: "EMITIDA"
    },
    creado_en: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: "facturas"
});

module.exports = Factura;
