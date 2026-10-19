import apiClient from './client.js';

export const invitationsApi = {
  create: (data) => apiClient.post('/invitations', data),
  list: (params = {}) => apiClient.get('/invitations', { params }),
  revoke: (id) => apiClient.patch(`/invitations/${id}/revoke`),
  verify: (token) => apiClient.get(`/invitations/verify/${token}`),
  accept: (data) => apiClient.post('/invitations/accept', data)
};

export default invitationsApi;
