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
        allowNull: false
    },
    id_pagovisita: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    id_pagoservicio: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    id_pagomembresia: {
        type: DataTypes.INTEGER,
        allowNull: true
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
            fields: ['id_pagoservicio']
        },
        {
            name: 'idx_factura_relacion_pagomembresia',
            fields: ['id_pagomembresia']
        }
    ]
});

module.exports = FacturaRelacion;
