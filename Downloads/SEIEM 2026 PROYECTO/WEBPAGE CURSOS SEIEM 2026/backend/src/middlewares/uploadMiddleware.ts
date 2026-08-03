import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // ⚠️ PARA EL TÉCNICO DE TI:
    // Si instalas un nuevo disco duro, cambia la base por la ruta de tu nuevo disco.
    const baseUploadDir = 'uploads/';
    const courseId = (req.params.courseId as string) || 'general';
    const finalPath = path.join(baseUploadDir, courseId);
    
    // Create directory automatically if it doesn't exist
    if (!fs.existsSync(finalPath)) {
      fs.mkdirSync(finalPath, { recursive: true });
    }
    
    cb(null, finalPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
});

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = (req as any).user?.id || 'unknown';
    const baseUploadDir = 'uploads/';
    const finalPath = path.join(baseUploadDir, 'avatars', userId);
    
    if (fs.existsSync(finalPath)) {
      // Vaciar la carpeta para destruir la imagen anterior
      const files = fs.readdirSync(finalPath);
      for (const existingFile of files) {
        fs.unlinkSync(path.join(finalPath, existingFile));
      }
    } else {
      fs.mkdirSync(finalPath, { recursive: true });
    }
    
    cb(null, finalPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now();
    cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for avatars
});

const systemStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const baseUploadDir = 'uploads/';
    const finalPath = path.join(baseUploadDir, 'system');
    if (!fs.existsSync(finalPath)) {
      fs.mkdirSync(finalPath, { recursive: true });
    }
    cb(null, finalPath);
  },
  filename: (req, file, cb) => {
    const type = req.params.type || 'logo';
    const uniqueSuffix = Date.now();
    cb(null, `${type}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const systemUpload = multer({
  storage: systemStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});
