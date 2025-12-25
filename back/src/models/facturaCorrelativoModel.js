const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const FacturaCorrelativo = sequelize.define("FacturaCorrelativo", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    cai: {
        type: DataTypes.STRING,
        allowNull: false
    },
    prefijo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    rango_inicio: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    rango_fin: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    correlativo_actual: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    fecha_autorizacion: {
        type: DataTypes.DATE,
        allowNull: false
    },
    fecha_vencimiento: {
        type: DataTypes.DATE,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM("ACTIVO", "INACTIVO", "VENCIDO", "AGOTADO"),
        allowNull: false,
        defaultValue: "ACTIVO"
    }
}, {
    timestamps: false,
    tableName: "factura_correlativos",
    indexes: [
        {
            name: 'idx_factura_correlativo_cai',
            fields: ['cai'],
            unique: true
        },
        {
            name: 'idx_factura_correlativo_estado',
            fields: ['estado']
        },
        {
            name: 'idx_factura_correlativo_vencimiento',
            fields: ['fecha_vencimiento']
        }
    ]
});

module.exports = FacturaCorrelativo;
