import { Router } from 'express';
import {
  getAllTasks,
  getTaskById,
  getResearchGroups,
  getTasksByUserId,
  createTask,
  updateTask,
  deleteTask
} from '../controllers/task.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// ── Public routes (no auth) ──────────────────────────────────────────────────

// GET /api/tasks/groups - Home page directory of research groups
router.get('/groups', getResearchGroups);

// GET /api/tasks/by-user/:userId - Participant chatbox tasks
// NOTE: Must be declared before /:id to avoid Express matching "by-user" as an id param
router.get('/by-user/:userId', getTasksByUserId);

// ── Researcher routes (JWT required — scoped to the logged-in researcher) ────

// GET /api/tasks - Get all tasks for the authenticated researcher
router.get('/', authenticate, getAllTasks);

// GET /api/tasks/:id - Get a single task (must belong to the researcher)
router.get('/:id', authenticate, getTaskById);

// POST /api/tasks - Create a task for the authenticated researcher
router.post('/', authenticate, createTask);

// PUT /api/tasks/:id - Update a task
router.put('/:id', authenticate, updateTask);

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', authenticate, deleteTask);

export default router;

