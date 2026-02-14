"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const task_controller_1 = require("../controllers/task.controller");
const router = (0, express_1.Router)();
// NOTE: No authentication required - allows managing tasks without login
// GET /api/tasks - Get all tasks
router.get('/', task_controller_1.getAllTasks);
// GET /api/tasks/:id - Get a single task by ID
router.get('/:id', task_controller_1.getTaskById);
// POST /api/tasks - Create a new task
router.post('/', task_controller_1.createTask);
// PUT /api/tasks/:id - Update a task
router.put('/:id', task_controller_1.updateTask);
// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', task_controller_1.deleteTask);
exports.default = router;
