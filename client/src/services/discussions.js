import api from './api';
export const getComments = (tmdbId, page = 1) => api.get(`/discussions/${tmdbId}`, { params: { page } }).then((r) => r.data);
export const postComment = (tmdbId, body) => api.post(`/discussions/${tmdbId}/comments`, body).then((r) => r.data);
export const getProgress = (tmdbId) => api.get(`/discussions/${tmdbId}/progress`).then((r) => r.data.status);
export const setProgress = (tmdbId, status) => api.put(`/discussions/${tmdbId}/progress`, { status }).then((r) => r.data.status);
export const revealComment = (id) => api.get(`/discussions/comments/${id}/reveal`).then((r) => r.data.content);
export const deleteComment = (id) => api.delete(`/discussions/comments/${id}`);
export const reportComment = (id, body) => api.post(`/discussions/comments/${id}/report`, body).then((r) => r.data);
