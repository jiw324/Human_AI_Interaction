import { Request, Response } from 'express';

// Mock database - In production, this would be replaced with actual database calls
const mockTasks = [
  {
    id: 'task-1',
    name: 'Task 1',
    settings: {
      personality: 'analytical',
      responseSpeed: 1.0,
      creativity: 0.7,
      helpfulness: 0.9,
      verbosity: 0.6,
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'You are a helpful AI assistant. Be friendly, informative, and engaging in your responses.',
      taskPrompt: ''
    }
  },
  {
    id: 'task-2',
    name: 'Task 2',
    settings: {
      personality: 'creative',
      responseSpeed: 1.0,
      creativity: 0.7,
      helpfulness: 0.9,
      verbosity: 0.6,
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'You are a helpful AI assistant. Be friendly, informative, and engaging in your responses.',
      taskPrompt: ''
    }
  },
  {
    id: 'task-3',
    name: 'Task 3',
    settings: {
      personality: 'expert',
      responseSpeed: 1.0,
      creativity: 0.7,
      helpfulness: 0.9,
      verbosity: 0.6,
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'You are a helpful AI assistant. Be friendly, informative, and engaging in your responses.',
      taskPrompt: ''
    }
  },
  {
    id: 'task-4',
    name: 'Task 4',
    settings: {
      personality: 'friendly',
      responseSpeed: 1.0,
      creativity: 0.7,
      helpfulness: 0.9,
      verbosity: 0.6,
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'You are a helpful AI assistant. Be friendly, informative, and engaging in your responses.',
      taskPrompt: ''
    }
  }
];

// In-memory storage for tasks (simulates database)
let tasks = [...mockTasks];

/**
 * Get all tasks
 */
export const getAllTasks = (_req: Request, res: Response) => {
  try {
    // TODO: Replace with actual database query
    // const tasks = await db.query('SELECT * FROM tasks');
    
    console.log('📤 [Backend] Sending all tasks to frontend');
    console.log(`📊 [Backend] Total tasks: ${tasks.length}`);
    console.log('📋 [Backend] Task names:', tasks.map(t => t.name).join(', '));
    
    res.status(200).json({
      success: true,
      data: tasks
    });
    
    console.log('✅ [Backend] Tasks sent successfully');
  } catch (error) {
    console.error('❌ [Backend] Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks'
    });
  }
};

/**
 * Get a single task by ID
 */
export const getTaskById = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`📤 [Backend] Fetching task by ID: ${id}`);
    
    // TODO: Replace with actual database query
    // const task = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
    
    const task = tasks.find(t => t.id === id);
    
    if (!task) {
      console.log(`⚠️ [Backend] Task not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    console.log(`✅ [Backend] Sending task: ${task.name}`);
    return res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('❌ [Backend] Error fetching task:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch task'
    });
  }
};

/**
 * Create a new task
 */
export const createTask = (req: Request, res: Response) => {
  try {
    const { name, settings } = req.body;
    console.log(`➕ [Backend] Creating new task: "${name}"`);
    
    if (!name || !settings) {
      console.log('⚠️ [Backend] Missing name or settings');
      return res.status(400).json({
        success: false,
        message: 'Name and settings are required'
      });
    }
    
    // Check if task name already exists
    const existingTask = tasks.find(t => t.name === name);
    if (existingTask) {
      console.log(`⚠️ [Backend] Task name already exists: "${name}"`);
      return res.status(409).json({
        success: false,
        message: 'Task with this name already exists'
      });
    }
    
    // Create new task
    const newTask = {
      id: `task-${Date.now()}`,
      name,
      settings
    };
    
    // TODO: Replace with actual database insert
    // const result = await db.query('INSERT INTO tasks (id, name, settings) VALUES (?, ?, ?)', 
    //   [newTask.id, newTask.name, JSON.stringify(newTask.settings)]);
    
    tasks.push(newTask);
    console.log(`✅ [Backend] Task created with ID: ${newTask.id}`);
    console.log(`📊 [Backend] Total tasks now: ${tasks.length}`);
    
    return res.status(201).json({
      success: true,
      data: newTask,
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('❌ [Backend] Error creating task:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create task'
    });
  }
};

/**
 * Update a task
 */
export const updateTask = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, settings } = req.body;
    console.log(`🔄 [Backend] Updating task: ${id}`);
    console.log(`📝 [Backend] Update data:`, { name, settingsUpdated: !!settings });
    
    // TODO: Replace with actual database query
    // const result = await db.query('UPDATE tasks SET name = ?, settings = ? WHERE id = ?',
    //   [name, JSON.stringify(settings), id]);
    
    const taskIndex = tasks.findIndex(t => t.id === id);
    
    if (taskIndex === -1) {
      console.log(`⚠️ [Backend] Task not found for update: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Update task
    const oldName = tasks[taskIndex].name;
    if (name !== undefined) {
      tasks[taskIndex].name = name;
    }
    if (settings !== undefined) {
      tasks[taskIndex].settings = settings;
    }
    
    console.log(`✅ [Backend] Task updated: "${oldName}" → "${tasks[taskIndex].name}"`);
    
    return res.status(200).json({
      success: true,
      data: tasks[taskIndex],
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('❌ [Backend] Error updating task:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update task'
    });
  }
};

/**
 * Delete a task
 */
export const deleteTask = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ [Backend] Delete request for task: ${id}`);
    console.log(`📊 [Backend] Current tasks count: ${tasks.length}`);
    
    // Prevent deletion if only one task remains
    if (tasks.length <= 1) {
      console.log('⚠️ [Backend] Cannot delete last task');
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the last task'
      });
    }
    
    // TODO: Replace with actual database query
    // const result = await db.query('DELETE FROM tasks WHERE id = ?', [id]);
    
    const taskIndex = tasks.findIndex(t => t.id === id);
    
    if (taskIndex === -1) {
      console.log(`⚠️ [Backend] Task not found for deletion: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    const deletedTask = tasks.splice(taskIndex, 1)[0];
    console.log(`✅ [Backend] Task deleted: "${deletedTask.name}"`);
    console.log(`📊 [Backend] Remaining tasks: ${tasks.length}`);
    
    return res.status(200).json({
      success: true,
      data: deletedTask,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('❌ [Backend] Error deleting task:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete task'
    });
  }
};

