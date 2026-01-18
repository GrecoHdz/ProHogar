const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Configuración para perfiles
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'HogarSeguro/usuarios/perfiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{
      width: 800,
      height: 800,
      crop: 'fill',
      gravity: 'face',
      quality: 'auto:best',
      fetch_format: 'auto',
      format: 'webp',
      dpr: 'auto',
      effect: 'sharpen:100',
      flags: 'lossy',
      secure: true
    }],
    resource_type: 'image'
  }
});

// Configuración para paquetes
const packageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'HogarSeguro/paquetes',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{
      width: 1200,
      height: 900,
      crop: 'fill',
      gravity: 'auto',
      quality: 'auto:best',
      fetch_format: 'auto',
      format: 'webp',
      dpr: 'auto',
      effect: 'sharpen:100',
      flags: 'lossy',
      secure: true
    }],
    resource_type: 'image'
  }
});

// Middleware para subir imágenes de perfil
exports.uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // Aumentado a 15MB para permitir mayor calidad
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten archivos de imagen (JPG, JPEG, PNG, WEBP)'), false);
    }
    cb(null, true);
  }
});

// Middleware para subir imágenes de paquetes
exports.uploadPackage = multer({
  storage: packageStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // Aumentado a 15MB para permitir mayor calidad
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten archivos de imagen (JPG, JPEG, PNG, WEBP)'), false);
    }
    cb(null, true);
  }
});

// Exportar la instancia de cloudinary para operaciones directas
exports.cloudinary = cloudinary;