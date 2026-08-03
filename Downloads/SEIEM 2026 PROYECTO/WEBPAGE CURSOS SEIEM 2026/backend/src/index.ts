import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
import { prisma } from './prisma';
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SEIEM Backend API is running' });
});

import authRoutes from './routes/authRoutes';
import courseRoutes from './routes/courseRoutes';
import systemRoutes from './routes/systemRoutes';
import { upload, avatarUpload } from './middlewares/uploadMiddleware';
import { authenticate } from './middlewares/authMiddleware';

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// We will add more routes here
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/system', systemRoutes);

// Avatar upload endpoint
app.post('/api/upload/avatars', authenticate, avatarUpload.single('files'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const userId = (req as any).user?.id || 'unknown';
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${userId}/${req.file.filename}`;
  return res.json({ urls: [fileUrl] });
});

app.post('/api/upload/rollback', authenticate, (req, res) => {
  const { urls } = req.body;
  if (!urls || !Array.isArray(urls)) return res.status(400).json({ error: 'Invalid urls' });

  for (const url of urls) {
    try {
      const urlParts = url.split('/uploads/');
      if (urlParts.length === 2) {
        const relativePath = decodeURIComponent(urlParts[1]);
        const absolutePath = path.join(process.cwd(), 'uploads', relativePath);
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      }
    } catch (e) {
      console.error('Rollback error', e);
    }
  }
  res.json({ success: true });
});

app.post('/api/upload/:courseId', authenticate, upload.array('files', 50), (req, res) => {
  // File upload endpoint
  if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  
  const courseId = req.params.courseId;
  const files = req.files as Express.Multer.File[];
  
  // Return the URLs to access the files
  const fileUrls = files.map(file => {
    return `${req.protocol}://${req.get('host')}/uploads/${courseId}/${file.filename}`;
  });
  
  res.json({ urls: fileUrls });
});

import { scanUploadsBot } from './controllers/systemController';

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Ejecutar el bot escáner cada 5 minutos (300000 ms) para buscar nuevas evidencias
  console.log('Iniciando el bot escáner en segundo plano...');
  setInterval(() => {
    scanUploadsBot(null as any, null as any).catch(err => console.error('Error en el bot escáner:', err));
  }, 300000);
  
  // Ejecutar una vez al inicio
  scanUploadsBot(null as any, null as any).catch(err => console.error('Error en el bot escáner:', err));
});
