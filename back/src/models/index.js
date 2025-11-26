// Importa todos los modelos
const Usuario = require('./usuariosModel');
const Rol = require('./rolesModel');  
const Servicio = require('./serviciosModel');
const SolicitudServicio = require('./solicitudServicioModel');
const Membresia = require('./membresiaModel'); 
const PagoVisita = require('./pagoVisitaModel'); 
const Ciudad = require('./ciudadesModel');
const RefreshToken = require('./refreshtokenModel');
const Cuenta = require('./cuentasModel');
const Cotizacion = require('./cotizacionModel');
const Movimiento = require('./movimientosModel');
const Calificacion = require('./calificacionesModels');
const CreditoUsuario = require('./creditoUsuariosModel');
const Referido = require('./referidosModel');
const Notificacion = require('./notificacionesModel');
const NotificacionDestinatario = require('./notificacionesDestinatariosModel');
const Config = require('./configModel');


// Función para configurar las asociaciones
const setupAssociations = () => {
  // Relación Usuario - Rol
  Usuario.belongsTo(Rol, { 
    foreignKey: 'id_rol', 
    as: 'rol' 
  });
  Rol.hasMany(Usuario, { 
    foreignKey: 'id_rol', 
    as: 'usuarios' 
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

  // Relación Usuario - Solicitud de Servicio (como cliente)
  Usuario.hasMany(SolicitudServicio, { 
    foreignKey: 'id_usuario',
    as: 'solicitudesCliente',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });
  
  // Relación Usuario - Solicitud de Servicio (como técnico)
  Usuario.hasMany(SolicitudServicio, { 
    foreignKey: 'id_tecnico', 
    as: 'solicitudesTecnico',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });
  
  // Relación SolicitudServicio - Usuario (cliente)
  SolicitudServicio.belongsTo(Usuario, {
    foreignKey: 'id_usuario',
    as: 'cliente',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });

  // Relación SolicitudServicio - Usuario (técnico)
  SolicitudServicio.belongsTo(Usuario, { 
    foreignKey: 'id_tecnico', 
    as: 'tecnico',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  });

  // Relación SolicitudServicio - Cotización
  SolicitudServicio.hasOne(Cotizacion, { 
    foreignKey: 'id_solicitud',
    as: 'cotizacion',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });
  
  Cotizacion.belongsTo(SolicitudServicio, { 
    foreignKey: 'id_solicitud',
    as: 'solicitud',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });

  // Relación Servicio - SolicitudServicio
  Servicio.hasMany(SolicitudServicio, { 
    foreignKey: 'id_servicio',
    as: 'solicitudes',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });
  
  SolicitudServicio.belongsTo(Servicio, { 
    foreignKey: 'id_servicio',
    as: 'servicio',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });

  // Relación Ciudad - SolicitudServicio
  Ciudad.hasMany(SolicitudServicio, { 
    foreignKey: 'id_ciudad',
    as: 'solicitudes',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });
  
  SolicitudServicio.belongsTo(Ciudad, { 
    foreignKey: 'id_ciudad',
    as: 'ciudad',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });

  // Relación Usuario - RefreshToken
  Usuario.hasMany(RefreshToken, { 
    foreignKey: 'usuario_id',
    as: 'refreshTokens',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });
  
  RefreshToken.belongsTo(Usuario, { 
    foreignKey: 'usuario_id',
    as: 'usuario',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  }); 

  // Relación Usuario - Membresía
  Usuario.hasMany(Membresia, { 
    foreignKey: 'id_usuario',
    as: 'membresias',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });
  
  Membresia.belongsTo(Usuario, { 
    foreignKey: 'id_usuario',
    as: 'usuario',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });

  // Relación Membresía - Cuenta
  Membresia.belongsTo(Cuenta, {
    foreignKey: 'id_cuenta',
    as: 'cuenta',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  });

  Cuenta.hasMany(Membresia, {
    foreignKey: 'id_cuenta',
    as: 'membresias',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  });

  // Relación Usuario - Cuenta
  Usuario.hasOne(Cuenta, { 
    foreignKey: 'id_usuario',
    as: 'cuenta'
  });
  
  Cuenta.belongsTo(Usuario, { 
    foreignKey: 'id_usuario',
    as: 'usuario',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });

  // Relación Usuario - Movimiento
  Usuario.hasMany(Movimiento, { 
    foreignKey: 'id_usuario',
    as: 'movimientos',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });
  
  Movimiento.belongsTo(Usuario, { 
    foreignKey: 'id_usuario',
    as: 'usuario',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });

  // Relación Cotización - Movimiento
  Cotizacion.hasMany(Movimiento, {
    foreignKey: 'id_cotizacion',
    as: 'movimientos',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });
  
  Movimiento.belongsTo(Cotizacion, {
    foreignKey: 'id_cotizacion',
    as: 'cotizacion',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });

  // Relación PagoVisita - SolicitudServicio
  PagoVisita.belongsTo(SolicitudServicio, { 
    foreignKey: 'id_solicitud',
    as: 'solicitud',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });
  
  SolicitudServicio.hasOne(PagoVisita, { 
    foreignKey: 'id_solicitud',
    as: 'pagoVisita',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });

  // Relación PagoVisita - Cuenta
  PagoVisita.belongsTo(Cuenta, { 
    foreignKey: 'id_cuenta',
    as: 'cuenta',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });
  
  Cuenta.hasMany(PagoVisita, { 
    foreignKey: 'id_cuenta',
    as: 'pagosVisita',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });

  // Relación PagoVisita - Usuario
  PagoVisita.belongsTo(Usuario, { 
    foreignKey: 'id_usuario',
    as: 'usuario',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });
  
  Usuario.hasMany(PagoVisita, { 
    foreignKey: 'id_usuario',
    as: 'pagosVisita',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });

  // Relación Cotización - Cuenta
  Cotizacion.belongsTo(Cuenta, { 
    foreignKey: 'id_cuenta',
    as: 'cuenta',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });
  
  Cuenta.hasMany(Cotizacion, { 
    foreignKey: 'id_cuenta',
    as: 'cotizaciones',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });

  // Relación Calificación - SolicitudServicio
  Calificacion.belongsTo(SolicitudServicio, { 
    foreignKey: 'id_solicitud',
    as: 'calificacionsolicitud',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });

  // Relación Calificación - Usuario calificador
  Calificacion.belongsTo(Usuario, { 
    foreignKey: 'id_usuario_calificador',
    as: 'usuarioCalificador',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });

  // Relación Calificación - Usuario calificado
  Calificacion.belongsTo(Usuario, { 
    foreignKey: 'id_usuario_calificado',
    as: 'usuarioCalificado',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });

  // Relación SolicitudServicio - Calificación (1:1)
  SolicitudServicio.hasOne(Calificacion, {
    foreignKey: 'id_solicitud',
    as: 'calificacion',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  });

  // Relación Credito - Usuario
  CreditoUsuario.belongsTo(Usuario, { 
    foreignKey: 'id_usuario',
    as: 'usuario',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  }); 

  // Relación Referido - Usuario
  Referido.belongsTo(Usuario, { 
    foreignKey: 'id_referido_usuario',
    as: 'usuario',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  }); 

  // Relación Notificación - NotificaciónDestinatario
  Notificacion.hasMany(NotificacionDestinatario, {
    foreignKey: "id_notificacion",
    as: "destinatarios",
  });
  NotificacionDestinatario.belongsTo(Notificacion, {
    foreignKey: "id_notificacion",
  });

  // Relación Usuario - NotificaciónDestinatario
  Usuario.hasMany(NotificacionDestinatario, {
    foreignKey: "id_usuario",
    as: "notificacionesDestinatario"
  });
  
  NotificacionDestinatario.belongsTo(Usuario, {
    foreignKey: "id_usuario",
    as: "usuario"
  });

  // Relación Config - Usuario (para referidor predeterminado)
Config.belongsTo(Usuario, {
  foreignKey: 'valor',  // This assumes 'valor' in Config stores the user ID
  as: 'usuario',
  constraints: false  // This allows the foreign key to reference a non-primary key
});
  
  console.log('Asociaciones configuradas correctamente');
};

// Exporta la función de configuración
module.exports = setupAssociations;