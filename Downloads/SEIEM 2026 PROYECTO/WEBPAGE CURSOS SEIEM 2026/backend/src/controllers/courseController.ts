import { Request, Response } from 'express';
import { prisma } from '../prisma';
import fs from 'fs';
import path from 'path';

export const getCourses = async (req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        evidences: true,
      },
    });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

export const getCourseById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const course = await prisma.course.findUnique({
      where: { id },
      include: { evidences: true },
    });
    
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const course = await prisma.course.create({
      data: {
        id: data.id,
        title: data.title,
        subtitle: data.subtitle,
        color: data.color,
        textColor: data.textColor,
        iconType: data.iconType,
        iconValue: data.iconValue,
        category: data.category,
        modality: data.modality,
        level: data.level,
        description: data.description,
        targetAudience: data.targetAudience,
        duration: data.duration,
        objective: data.objective,
        modules: Array.isArray(data.modules) ? JSON.stringify(data.modules) : data.modules,
        illustrationUrl: data.illustrationUrl,
        illustrationSide: data.illustrationSide,
        registrationUrl: data.registrationUrl,
        sede: data.sede,
        capacity: data.capacity,
        pdfUrl: data.pdfUrl,
        pdfPage: data.pdfPage,
        enrollmentDates: data.enrollmentDates,
        implementationDates: data.implementationDates,
      },
    });
    res.status(201).json(course);
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ error: 'Failed to create course' });
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = req.body;
    
    // Stringify modules if it is an array
    if (data.modules && Array.isArray(data.modules)) {
      data.modules = JSON.stringify(data.modules);
    }
    
    const course = await prisma.course.update({
      where: { id },
      data,
    });
    res.json(course);
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ error: 'Failed to update course' });
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.course.delete({ where: { id } });

    // Also delete physical directory for this course
    const courseUploadPath = path.join(process.cwd(), 'uploads', id);
    if (fs.existsSync(courseUploadPath)) {
      fs.rmSync(courseUploadPath, { recursive: true, force: true });
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete course' });
  }
};

export const addEvidence = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { url, caption, type, uploadedBy, userId } = req.body;
    
    // Default to GALLERY if not provided
    const evidenceType = type || 'GALLERY';

    const evidence = await prisma.evidence.create({
      data: {
        url,
        caption,
        type: evidenceType,
        uploadedBy,
        userId,
        courseId: id,
      },
    });
    
    res.status(201).json(evidence);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add evidence' });
  }
};
export const deleteEvidence = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const evidenceId = req.params.evidenceId as string;
    
    // Find the evidence to get the URL
    const evidence = await prisma.evidence.findFirst({
      where: {
        id: evidenceId,
        courseId: id,
      }
    });

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    // Security check
    // @ts-ignore
    const user = req.user;
    if (user && user.role !== 'ADMIN' && evidence.userId !== user.id) {
      return res.status(403).json({ error: 'No permission to delete this evidence' });
    }

    if (evidence && evidence.url) {
      // Verificar si el archivo está siendo usado como recurso principal del curso
      const course = await prisma.course.findUnique({ where: { id } });
      const isCourseAsset = course && (
        course.iconValue === evidence.url ||
        course.illustrationUrl === evidence.url ||
        course.pdfUrl === evidence.url
      );

      // Verificar si hay otras evidencias (WORK_SAMPLE o GALLERY) que usen este mismo archivo (por URL)
      const otherEvidences = await prisma.evidence.count({
        where: {
          url: evidence.url,
          id: { not: evidenceId }
        }
      });

      if (!isCourseAsset && otherEvidences === 0) {
        const urlParts = evidence.url.split('/uploads/');
        if (urlParts.length > 1) {
          const relativePath = decodeURIComponent(urlParts[1]);
          const absolutePath = path.join(process.cwd(), 'uploads', relativePath);
          if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
          }
        }
      }
    }

    // Ensure the evidence belongs to the course
    await prisma.evidence.deleteMany({
      where: {
        id: evidenceId,
        courseId: id,
      },
    });
    
    res.json({ message: 'Evidence deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete evidence' });
  }
};
