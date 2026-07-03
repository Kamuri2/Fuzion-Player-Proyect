import { Router } from 'express';
import { getCourses, getCourseById, createCourse, updateCourse, deleteCourse, addEvidence, deleteEvidence } from '../controllers/courseController';
import { authenticate, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', getCourses);
router.get('/:id', getCourseById);

// Protected Admin Routes
router.post('/', authenticate, requireAdmin, createCourse);
router.put('/:id', authenticate, requireAdmin, updateCourse);
router.delete('/:id', authenticate, requireAdmin, deleteCourse);
router.post('/:id/evidence', authenticate, addEvidence);
router.delete('/:id/evidence/:evidenceId', authenticate, deleteEvidence);

export default router;
