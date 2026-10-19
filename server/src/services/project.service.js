import mongoose from 'mongoose';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { findTenantResource } from '../middleware/tenantGuard.js';
import { logAuditEvent } from './audit.service.js';

export const listProjects = async ({ organizationId, search, status, page = 1, limit = 20 }) => {
  const query = { organizationId };

  if (status && status !== 'all') {
    query.status = status;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: searchRegex }, { key: searchRegex }];
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const [projects, total] = await Promise.all([
    Project.find(query)
      .populate('ownerId', 'firstName lastName email role')
      .populate('members', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit),
    Project.countDocuments(query)
  ]);

  return {
    projects,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit) || 1
    }
  };
};

export const getProjectById = async ({ organizationId, projectId, req }) => {
  const project = await findTenantResource(Project, projectId, req);
  if (!project) return null;

  return Project.findOne({ _id: project._id, organizationId })
    .populate('ownerId', 'firstName lastName email role')
    .populate('members', 'firstName lastName email role');
};

export const createProject = async ({ organizationId, actorId, req, data }) => {
  const formattedKey = data.key.trim().toUpperCase();

  // 1. Enforce unique key per organization
  const existingKey = await Project.findOne({
    organizationId,
    key: formattedKey
  });

  if (existingKey) {
    const error = new Error(`Project key '${formattedKey}' is already in use within this organization.`);
    error.statusCode = 409;
    error.code = 'PROJECT_KEY_EXISTS';
    throw error;
  }

  // 2. Validate all assigned members belong to this organization
  if (data.members && data.members.length > 0) {
    const memberIds = [...new Set(data.members)];
    const validCount = await User.countDocuments({
      _id: { $in: memberIds },
      organizationId,
      status: 'active'
    });

    if (validCount !== memberIds.length) {
      const error = new Error('One or more assigned members do not belong to your organization or are inactive.');
      error.statusCode = 400;
      error.code = 'INVALID_PROJECT_MEMBERS';
      throw error;
    }
  }

  // 3. Create project strictly under verified tenant
  const project = await Project.create({
    organizationId,
    name: data.name.trim(),
    key: formattedKey,
    description: data.description || '',
    status: data.status || 'planning',
    ownerId: actorId,
    members: data.members || [],
    startDate: data.startDate || null,
    targetDate: data.targetDate || null
  });

  await logAuditEvent({
    organizationId,
    actorId,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: 'PROJECT_CREATED',
    category: 'data_mutation',
    severity: 'info',
    targetResource: 'Project',
    targetResourceId: project._id.toString(),
    details: { name: project.name, key: project.key, status: project.status },
    req,
    status: 'success'
  });

  return Project.findById(project._id)
    .populate('ownerId', 'firstName lastName email role')
    .populate('members', 'firstName lastName email role');
};

export const updateProject = async ({ organizationId, projectId, req, data }) => {
  const project = await findTenantResource(Project, projectId, req);
  if (!project) return null;

  // Validate members if being updated
  if (data.members && data.members.length > 0) {
    const memberIds = [...new Set(data.members)];
    const validCount = await User.countDocuments({
      _id: { $in: memberIds },
      organizationId,
      status: 'active'
    });

    if (validCount !== memberIds.length) {
      const error = new Error('One or more assigned members do not belong to your organization or are inactive.');
      error.statusCode = 400;
      error.code = 'INVALID_PROJECT_MEMBERS';
      throw error;
    }
  }

  // Assign permitted fields (never allow changing key or organizationId)
  if (data.name !== undefined) project.name = data.name.trim();
  if (data.description !== undefined) project.description = data.description;
  if (data.status !== undefined) project.status = data.status;
  if (data.members !== undefined) project.members = data.members;
  if (data.startDate !== undefined) project.startDate = data.startDate;
  if (data.targetDate !== undefined) project.targetDate = data.targetDate;

  await project.save();

  await logAuditEvent({
    organizationId,
    actorId: req.user._id,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: 'PROJECT_UPDATED',
    category: 'data_mutation',
    severity: 'info',
    targetResource: 'Project',
    targetResourceId: project._id.toString(),
    details: { name: project.name, status: project.status },
    req,
    status: 'success'
  });

  return Project.findById(project._id)
    .populate('ownerId', 'firstName lastName email role')
    .populate('members', 'firstName lastName email role');
};

export const deleteProject = async ({ organizationId, projectId, req }) => {
  const project = await findTenantResource(Project, projectId, req);
  if (!project) return null;

  // Cascade delete tasks in this project strictly scoped to organizationId
  await Task.deleteMany({ organizationId, projectId: project._id });
  await Project.deleteOne({ _id: project._id, organizationId });

  await logAuditEvent({
    organizationId,
    actorId: req.user._id,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: 'PROJECT_DELETED',
    category: 'data_mutation',
    severity: 'warning',
    targetResource: 'Project',
    targetResourceId: project._id.toString(),
    details: { name: project.name, key: project.key },
    req,
    status: 'success'
  });

  return true;
};

export default {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
};
