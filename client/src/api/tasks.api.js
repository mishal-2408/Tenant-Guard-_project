import apiClient from './client.js';

export const tasksApi = {
  list: (params = {}) => apiClient.get('/tasks', { params }),
  getById: (id) => apiClient.get(`/tasks/${id}`),
  create: (data) => apiClient.post('/tasks', data),
  update: (id, data) => apiClient.patch(`/tasks/${id}`, data),
  delete: (id) => apiClient.delete(`/tasks/${id}`)
};

export default tasksApi;
