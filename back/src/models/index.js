// Importa todos los modelos
const Usuario = require('./usuariosModel');
const Rol = require('./rolesModel');
const Tecnico = require('./tecnicosModel');
const Categoria = require('./categoriasModel');
const Servicio = require('./serviciosModel');
const SolicitudServicio = require('./solicitudServicioModel');
const Cotizacion = require('./cotizacionModel'); 
const Membresia = require('./membresiaModel'); 
const PagoVisita = require('./pagoVisitaModel');
const Referido = require('./referidosModel');
const Ciudad = require('./ciudadesModel');
const RefreshToken = require('./refreshtokenModel');
const Cuenta = require('./cuentasModel');
const PagoCotizacion = require('./pagoCotizacionModel');

// Función para configurar las asociaciones
const setupAssociations = () => {
  // Relación Usuario - Rol
  Usuario.belongsTo(Rol, { 
    foreignKey: 'id_rol',
    as: 'rol'  // Añadimos el alias 'rol' para la relación
  });
  Rol.hasMany(Usuario, { 
    foreignKey: 'id_rol',
    as: 'usuarios'  // Añadimos el alias 'usuarios' para la relación inversa
  });

  // Relación Usuario - Ciudad
  Usuario.belongsTo(Ciudad, {
    foreignKey: 'id_ciudad',
    as: 'ciudad'
  });
  Ciudad.hasMany(Usuario, {
    foreignKey: 'id_ciudad',
    as: 'usuarios'
  });

  // Relación Usuario - Técnico
  Usuario.hasOne(Tecnico, { foreignKey: 'usuario_id' });
  Tecnico.belongsTo(Usuario, { foreignKey: 'usuario_id' });

  // Relación Técnico - Categoría
  Tecnico.belongsToMany(Categoria, { 
    through: 'tecnicos_categorias',
    foreignKey: 'tecnico_id'
  });
  Categoria.belongsToMany(Tecnico, { 
    through: 'tecnicos_categorias',
    foreignKey: 'categoria_id'
  });

  // Relación Usuario - Solicitud de Servicio (Cliente)
  Usuario.hasMany(SolicitudServicio, { foreignKey: 'id_usuario' });
  SolicitudServicio.belongsTo(Usuario, { foreignKey: 'id_usuario' });

  // Relación Técnico - Solicitud de Servicio
  Tecnico.hasMany(SolicitudServicio, { foreignKey: 'id_tecnico' });
  SolicitudServicio.belongsTo(Tecnico, { foreignKey: 'id_tecnico' });

  // Relación Solicitud de Servicio - Cotización
  SolicitudServicio.hasOne(Cotizacion, { foreignKey: 'id_solicitud' });
  Cotizacion.belongsTo(SolicitudServicio, { foreignKey: 'id_solicitud' });

  // Relación Servicio - Solicitud de Servicio
  Servicio.hasMany(SolicitudServicio, { 
    foreignKey: 'id_servicio',
    as: 'solicitudes'
  });
  SolicitudServicio.belongsTo(Servicio, { 
    foreignKey: 'id_servicio',
    as: 'servicio'  // Añadimos el alias 'servicio' para la relación
  });

  // Relación Ciudad - Solicitud de Servicio
  Ciudad.hasMany(SolicitudServicio, { foreignKey: 'id_ciudad' });
  SolicitudServicio.belongsTo(Ciudad, { foreignKey: 'id_ciudad' }); 

  // Relación Usuario - RefreshToken
  Usuario.hasMany(RefreshToken, { 
    foreignKey: 'usuario_id',
    as: 'refreshTokens',
  });
  RefreshToken.belongsTo(Usuario, { 
    foreignKey: 'usuario_id',
    as: 'usuario'
  }); 

  // Relación Usuario - Referidos
  Usuario.hasMany(Referido, { foreignKey: 'usuario_referidor_id' });
  Referido.belongsTo(Usuario, { 
    foreignKey: 'usuario_referidor_id',
    as: 'Referidor'
  });
  
  Usuario.hasMany(Referido, { foreignKey: 'usuario_referido_id' });
  Referido.belongsTo(Usuario, {
    foreignKey: 'usuario_referido_id',
    as: 'Referido'
  });

  // Relación Usuario - Membresia
  Usuario.hasOne(Membresia, { foreignKey: 'id_usuario' });
  Membresia.belongsTo(Usuario, { foreignKey: 'id_usuario' });

  // Relación Pagovisita - Solicitud de Servicio
  PagoVisita.belongsTo(SolicitudServicio, { foreignKey: 'id_solicitud' });
  SolicitudServicio.hasOne(PagoVisita, { foreignKey: 'id_solicitud' });

  // Relación Pagovisita - Cuenta
  PagoVisita.belongsTo(Cuenta, { foreignKey: 'id_cuenta' });
  Cuenta.hasOne(PagoVisita, { foreignKey: 'id_cuenta' });

  // Relación Pagovisita - Usuario
  PagoVisita.belongsTo(Usuario, { foreignKey: 'id_usuario' });
  Usuario.hasOne(PagoVisita, { foreignKey: 'id_usuario' });
  
  // Relación PagoCotizacion - Solicitud de Servicio
  PagoCotizacion.belongsTo(SolicitudServicio, { foreignKey: 'id_solicitud' });
  SolicitudServicio.hasOne(PagoCotizacion, { foreignKey: 'id_solicitud' });

  // Relación PagoCotizacion - Cuenta
  PagoCotizacion.belongsTo(Cuenta, { foreignKey: 'id_cuenta' });
  Cuenta.hasOne(PagoCotizacion, { foreignKey: 'id_cuenta' }); 

  console.log('Asociaciones configuradas correctamente');
};

// Exporta la función de configuración
module.exports = setupAssociations;