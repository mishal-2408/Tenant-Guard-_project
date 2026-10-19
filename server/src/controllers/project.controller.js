import projectService from '../services/project.service.js';
import asyncHandler from '../utils/asyncHandler.js';

export const listProjects = asyncHandler(async (req, res) => {
  const { search, status, page, limit } = req.query;
  const result = await projectService.listProjects({
    organizationId: req.organizationId,
    search,
    status,
    page,
    limit
  });

  res.status(200).json({
    success: true,
    data: result.projects,
    pagination: result.pagination
  });
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById({
    organizationId: req.organizationId,
    projectId: req.params.id,
    req
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'PROJECT_NOT_FOUND',
        message: 'The requested project was not found.'
      }
    });
  }

  res.status(200).json({
    success: true,
    data: project
  });
});

export const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.createProject({
    organizationId: req.organizationId,
    actorId: req.user._id,
    req,
    data: req.body
  });

  res.status(201).json({
    success: true,
    data: project
  });
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await projectService.updateProject({
    organizationId: req.organizationId,
    projectId: req.params.id,
    req,
    data: req.body
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'PROJECT_NOT_FOUND',
        message: 'The requested project was not found.'
      }
    });
  }

  res.status(200).json({
    success: true,
    data: project
  });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const deleted = await projectService.deleteProject({
    organizationId: req.organizationId,
    projectId: req.params.id,
    req
  });

  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'PROJECT_NOT_FOUND',
        message: 'The requested project was not found.'
      }
    });
  }

  res.status(200).json({
    success: true,
    message: 'Project and associated tasks deleted successfully.'
  });
});

export default {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject
};
