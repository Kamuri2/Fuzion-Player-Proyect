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
    const baseUploadDir = 'uploads/';
    const finalPath = path.join(baseUploadDir, 'avatars');
    if (!fs.existsSync(finalPath)) {
      fs.mkdirSync(finalPath, { recursive: true });
    }
    cb(null, finalPath);
  },
  filename: (req, file, cb) => {
    // We expect the frontend to pass the user ID in a header or we decode it from auth token
    // But middleware runs before we might have parsed the ID in this specific route if not careful.
    // Since we'll use this with the auth middleware, req.user will be populated.
    const userId = (req as any).user?.id || 'unknown';
    // Overwrite the previous file by keeping a fixed name based on ID
    cb(null, `avatar-${userId}${path.extname(file.originalname)}`);
  },
});

export const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for avatars
});
