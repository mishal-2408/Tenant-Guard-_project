import apiClient from './client.js';

export const teamApi = {
  listMembers: (params = {}) => apiClient.get('/team/members', { params }),
  getMemberById: (id) => apiClient.get(`/team/members/${id}`),
  updateRole: (id, role) => apiClient.patch(`/team/members/${id}/role`, { role }),
  updateStatus: (id, status) => apiClient.patch(`/team/members/${id}/status`, { status })
};

export default teamApi;
