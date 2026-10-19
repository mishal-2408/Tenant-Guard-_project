import taskService from '../services/task.service.js';
import asyncHandler from '../utils/asyncHandler.js';

export const listTasks = asyncHandler(async (req, res) => {
  const { projectId, status, priority, assignedTo, page, limit, search } = req.query;

  const result = await taskService.listTasks({
    organizationId: req.organizationId,
    projectId,
    status,
    priority,
    assignedTo,
    page,
    limit,
    search
  });

  res.status(200).json({
    success: true,
    data: result.tasks,
    pagination: result.pagination
  });
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await taskService.getTaskById({
    organizationId: req.organizationId,
    taskId: req.params.id,
    req
  });

  if (!task) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'TASK_NOT_FOUND',
        message: 'The requested task was not found.'
      }
    });
  }

  res.status(200).json({
    success: true,
    data: task
  });
});

export const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask({
    organizationId: req.organizationId,
    actorId: req.user._id,
    req,
    data: req.body
  });

  res.status(201).json({
    success: true,
    data: task
  });
});

export const updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask({
    organizationId: req.organizationId,
    taskId: req.params.id,
    req,
    data: req.body
  });

  if (!task) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'TASK_NOT_FOUND',
        message: 'The requested task was not found.'
      }
    });
  }

  res.status(200).json({
    success: true,
    data: task
  });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const deleted = await taskService.deleteTask({
    organizationId: req.organizationId,
    taskId: req.params.id,
    req
  });

  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'TASK_NOT_FOUND',
        message: 'The requested task was not found.'
      }
    });
  }

  res.status(200).json({
    success: true,
    message: 'Task deleted successfully.'
  });
});

export default {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask
};
