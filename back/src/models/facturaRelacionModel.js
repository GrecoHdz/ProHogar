const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const FacturaRelacion = sequelize.define("FacturaRelacion", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_factura: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'facturas',
            key: 'id_factura'
        }

    },
    id_pagovisita: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'pagovisita',
            key: 'id_pagovisita'
        }
    },
    id_cotizacion: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'cotizaciones',
            key: 'id_cotizacion'
        }
    },
    id_membresia: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'pagomembresia',
            key: 'id_membresia'
        }
    },
    id_pago_paquete: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'pago_paquete',
            key: 'id_pago_paquete'
        }
    }
}, {
    timestamps: false,
    tableName: "facturas_relacion",
    indexes: [
        {
            name: 'idx_factura_relacion_factura',
            fields: ['id_factura'],
            unique: true
        },
        {
            name: 'idx_factura_relacion_pagovisita',
            fields: ['id_pagovisita']
        },
        {
            name: 'idx_factura_relacion_pagoservicio',
            fields: ['id_cotizacion']
        },
        {
            name: 'idx_factura_relacion_pagomembresia',
            fields: ['id_membresia']
        },
        {
            name: 'idx_factura_relacion_pagopaquete',
            fields: ['id_pago_paquete']
        }
    ]
});

module.exports = FacturaRelacion;
