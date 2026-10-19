import mongoose from 'mongoose';
import { Task } from '../models/Task.js';
import { Project } from '../models/Project.js';
import { User } from '../models/User.js';
import { findTenantResource } from '../middleware/tenantGuard.js';
import { logAuditEvent } from './audit.service.js';

export const listTasks = async ({ organizationId, projectId, status, priority, assignedTo, page = 1, limit = 50, search }) => {
  const query = { organizationId };

  if (projectId) {
    if (mongoose.Types.ObjectId.isValid(projectId)) {
      query.projectId = projectId;
    } else {
      return { tasks: [], pagination: { total: 0, page: 1, limit, totalPages: 1 } };
    }
  }

  if (status && status !== 'all') {
    query.status = status;
  }

  if (priority && priority !== 'all') {
    query.priority = priority;
  }

  if (assignedTo && assignedTo !== 'all') {
    if (mongoose.Types.ObjectId.isValid(assignedTo)) {
      query.assignedTo = assignedTo;
    }
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ title: searchRegex }, { description: searchRegex }];
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (parsedPage - 1) * parsedLimit;

  const [tasks, total] = await Promise.all([
    Task.find(query)
      .populate('projectId', 'name key status')
      .populate('assignedTo', 'firstName lastName email role')
      .populate('createdBy', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit),
    Task.countDocuments(query)
  ]);

  return {
    tasks,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit) || 1
    }
  };
};

export const getTaskById = async ({ organizationId, taskId, req }) => {
  const task = await findTenantResource(Task, taskId, req);
  if (!task) return null;

  return Task.findOne({ _id: task._id, organizationId })
    .populate('projectId', 'name key status')
    .populate('assignedTo', 'firstName lastName email role')
    .populate('createdBy', 'firstName lastName email role');
};

export const createTask = async ({ organizationId, actorId, req, data }) => {
  // 1. Verify parent project belongs strictly to this organization
  const project = await findTenantResource(Project, data.projectId, req);
  if (!project) {
    const error = new Error('Parent project was not found.');
    error.statusCode = 404;
    error.code = 'PROJECT_NOT_FOUND';
    throw error;
  }

  // 2. Validate assigned user belongs strictly to this organization if provided
  if (data.assignedTo) {
    const assignee = await User.findOne({
      _id: data.assignedTo,
      organizationId,
      status: 'active'
    });

    if (!assignee) {
      const error = new Error('Assigned user does not belong to your organization or is inactive.');
      error.statusCode = 400;
      error.code = 'INVALID_ASSIGNEE';
      throw error;
    }
  }

  // 3. Compute next sequence taskNumber for this project
  const lastTask = await Task.findOne({
    organizationId,
    projectId: project._id
  })
    .sort({ taskNumber: -1 })
    .select('taskNumber');

  const nextNumber = lastTask && typeof lastTask.taskNumber === 'number' ? lastTask.taskNumber + 1 : 1;

  // 4. Create task strictly under verified organization
  const task = await Task.create({
    organizationId,
    projectId: project._id,
    taskNumber: nextNumber,
    title: data.title.trim(),
    description: data.description || '',
    status: data.status || 'todo',
    priority: data.priority || 'medium',
    assignedTo: data.assignedTo || null,
    createdBy: actorId,
    dueDate: data.dueDate || null,
    tags: data.tags || []
  });

  await logAuditEvent({
    organizationId,
    actorId,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: 'TASK_CREATED',
    category: 'data_mutation',
    severity: 'info',
    targetResource: 'Task',
    targetResourceId: task._id.toString(),
    details: {
      title: task.title,
      taskNumber: task.taskNumber,
      projectId: project._id.toString(),
      status: task.status
    },
    req,
    status: 'success'
  });

  return Task.findById(task._id)
    .populate('projectId', 'name key status')
    .populate('assignedTo', 'firstName lastName email role')
    .populate('createdBy', 'firstName lastName email role');
};

export const updateTask = async ({ organizationId, taskId, req, data }) => {
  const task = await findTenantResource(Task, taskId, req);
  if (!task) return null;

  // 1. If moving to another project, verify new project belongs to this organization
  if (data.projectId && data.projectId.toString() !== task.projectId.toString()) {
    const newProject = await findTenantResource(Project, data.projectId, req);
    if (!newProject) {
      const error = new Error('Target parent project was not found.');
      error.statusCode = 404;
      error.code = 'PROJECT_NOT_FOUND';
      throw error;
    }
    task.projectId = newProject._id;
  }

  // 2. Validate assignee belongs to this organization
  if (data.assignedTo !== undefined) {
    if (data.assignedTo === null) {
      task.assignedTo = null;
    } else {
      const assignee = await User.findOne({
        _id: data.assignedTo,
        organizationId,
        status: 'active'
      });

      if (!assignee) {
        const error = new Error('Assigned user does not belong to your organization or is inactive.');
        error.statusCode = 400;
        error.code = 'INVALID_ASSIGNEE';
        throw error;
      }
      task.assignedTo = assignee._id;
    }
  }

  if (data.title !== undefined) task.title = data.title.trim();
  if (data.description !== undefined) task.description = data.description;
  if (data.status !== undefined) task.status = data.status;
  if (data.priority !== undefined) task.priority = data.priority;
  if (data.dueDate !== undefined) task.dueDate = data.dueDate;
  if (data.tags !== undefined) task.tags = data.tags;

  await task.save();

  await logAuditEvent({
    organizationId,
    actorId: req.user._id,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: 'TASK_UPDATED',
    category: 'data_mutation',
    severity: 'info',
    targetResource: 'Task',
    targetResourceId: task._id.toString(),
    details: { title: task.title, status: task.status, priority: task.priority },
    req,
    status: 'success'
  });

  return Task.findById(task._id)
    .populate('projectId', 'name key status')
    .populate('assignedTo', 'firstName lastName email role')
    .populate('createdBy', 'firstName lastName email role');
};

export const deleteTask = async ({ organizationId, taskId, req }) => {
  const task = await findTenantResource(Task, taskId, req);
  if (!task) return null;

  await Task.deleteOne({ _id: task._id, organizationId });

  await logAuditEvent({
    organizationId,
    actorId: req.user._id,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: 'TASK_DELETED',
    category: 'data_mutation',
    severity: 'warning',
    targetResource: 'Task',
    targetResourceId: task._id.toString(),
    details: { title: task.title, taskNumber: task.taskNumber },
    req,
    status: 'success'
  });

  return true;
};

export default {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask
};
