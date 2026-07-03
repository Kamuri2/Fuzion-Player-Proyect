import { Request, Response } from 'express';
import { statfs } from 'fs/promises';
import fs from 'fs';
import path from 'path';

export const getStorageStats = async (req: Request, res: Response) => {
  try {
    // ⚠️ PARA EL TÉCNICO DE TI:
    // Si cambiaste la ruta de almacenamiento a un nuevo disco en uploadMiddleware.ts,
    // debes poner esa misma ruta aquí abajo para que el Monitor mida el disco correcto.
    // Ejemplo: const uploadsPath = 'D:/archivos_seiem/';
    const uploadsPath = path.join(__dirname, '../../uploads');
    
    const stats = await statfs(uploadsPath);
    
    // bsize = block size in bytes
    // blocks = total data blocks
    // bfree = free blocks
    // bavail = free blocks available to unprivileged users
    
    const totalBytes = stats.blocks * stats.bsize;
    const freeBytes = stats.bavail * stats.bsize;
    const usedBytes = totalBytes - freeBytes;
    
    const totalGB = parseFloat((totalBytes / (1024 ** 3)).toFixed(2));
    const usedGB = parseFloat((usedBytes / (1024 ** 3)).toFixed(2));
    const freeGB = parseFloat((freeBytes / (1024 ** 3)).toFixed(2));
    const usedPercentage = parseFloat(((usedBytes / totalBytes) * 100).toFixed(2));

    res.json({
      totalGB,
      usedGB,
      freeGB,
      usedPercentage,
      status: usedPercentage > 85 ? 'WARNING' : 'OK'
    });
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    res.status(500).json({ error: 'Failed to fetch storage stats' });
  }
};

import { prisma } from '../prisma';

export const scanUploadsBot = async (req: Request, res: Response) => {
  try {
    const uploadsPath = path.join(__dirname, '../../uploads');
    
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }
    
    const directories = fs.readdirSync(uploadsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
      
    const results: Record<string, string[]> = {};
    let addedCount = 0;
    
    for (const dir of directories) {
      const courseId = dir;
      // Comprobar si el curso existe en la base de datos
      const courseExists = await prisma.course.findUnique({ where: { id: courseId } });
      if (!courseExists) continue;

      const coursePath = path.join(uploadsPath, dir);
      const files = fs.readdirSync(coursePath, { withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .map(dirent => ({
           filename: dirent.name,
           url: `${req ? `${req.protocol}://${req.get('host')}` : 'http://localhost:3001'}/uploads/${dir}/${dirent.name}`
        }));
        
      if (files.length > 0) {
        results[dir] = [];
        for (const file of files) {
          // Ignorar los archivos que pertenecen a la configuración principal del curso (icono, ilustración, pdf)
          if (
            (courseExists.iconValue && courseExists.iconValue.endsWith(`/${file.filename}`)) ||
            (courseExists.illustrationUrl && courseExists.illustrationUrl.endsWith(`/${file.filename}`)) ||
            (courseExists.pdfUrl && courseExists.pdfUrl.endsWith(`/${file.filename}`))
          ) {
            continue;
          }
          
          // Comprobar duplicado en la base de datos comprobando que la URL termine en el nombre del archivo
          // Esto evita duplicados si el frontend usó un hostname diferente (ej. IP local vs localhost)
          const existingEvidence = await prisma.evidence.findFirst({
            where: {
              courseId,
              url: {
                endsWith: `/${file.filename}`
              }
            }
          });

          if (!existingEvidence) {
            await prisma.evidence.create({
              data: {
                courseId,
                url: file.url,
                caption: file.filename, // Usamos el nombre del archivo como caption inicial
                type: 'GALLERY', // Tipo por defecto
                uploadedBy: 'Sistema (Bot Escáner)',
              }
            });
            results[dir].push(file.url);
            addedCount++;
          }
        }
      }
    }
    // Cleanup phase: Remove database entries for files that no longer exist on disk
    let removedCount = 0;
    const allLocalEvidences = await prisma.evidence.findMany({
      where: {
        url: {
          contains: '/uploads/'
        }
      }
    });

    for (const evidence of allLocalEvidences) {
      const urlParts = evidence.url.split('/uploads/');
      if (urlParts.length === 2) {
        const relativePath = decodeURIComponent(urlParts[1]);
        const absolutePath = path.join(uploadsPath, relativePath);
        if (!fs.existsSync(absolutePath)) {
          await prisma.evidence.delete({ where: { id: evidence.id } });
          removedCount++;
        }
      }
    }
    
    if (res) {
      res.json({ message: `Escaneo completado. Se agregaron ${addedCount} y se limpiaron ${removedCount} fantasmas.`, results, removedCount });
    }
  } catch (error) {
    console.error('Error scanning uploads:', error);
    if (res) {
      res.status(500).json({ error: 'Failed to scan uploads' });
    }
  }
};
