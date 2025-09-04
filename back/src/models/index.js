// Importa todos los modelos
const Usuario = require('./usuariosModel');
const Rol = require('./rolesModel');
const Tecnico = require('./tecnicosModel');
const Categoria = require('./categoriasModel');
const Servicio = require('./serviciosModel');
const SolicitudServicio = require('./solicitudServicioModel');
const Cotizacion = require('./cotizacionModel');
const Pago = require('./pagoModel');
const Membresia = require('./membresiasModel');
const MembresiaBeneficio = require('./membresiaBeneficiosModel');
const Referido = require('./referidosModel');
const Ciudad = require('./ciudadesModel');
const RefreshToken = require('./refreshtokenModel');

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

  // Relación Cotización - Pago
  Cotizacion.hasOne(Pago, { foreignKey: 'id_cotizacion' });
  Pago.belongsTo(Cotizacion, { foreignKey: 'id_cotizacion' });

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

  console.log('Asociaciones configuradas correctamente');
};

// Exporta la función de configuración
module.exports = setupAssociations;