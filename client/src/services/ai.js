import api from './api';
export const recommendByMood = (body) => api.post('/recommendations/mood', body).then((r) => r.data);
export const getMoodHistory = (page = 1) => api.get('/recommendations/history', { params: { page } }).then((r) => r.data);
export const deleteMoodHistory = (id) => api.delete(`/recommendations/${id}`);
