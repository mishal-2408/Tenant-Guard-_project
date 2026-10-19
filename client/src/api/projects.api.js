import apiClient from './client.js';

export const projectsApi = {
  list: (params = {}) => apiClient.get('/projects', { params }),
  getById: (id) => apiClient.get(`/projects/${id}`),
  create: (data) => apiClient.post('/projects', data),
  update: (id, data) => apiClient.patch(`/projects/${id}`, data),
  delete: (id) => apiClient.delete(`/projects/${id}`)
};

export default projectsApi;
