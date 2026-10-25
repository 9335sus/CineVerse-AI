import api from './api';
export const listStories = (page = 1) => api.get('/stories', { params: { page } }).then((r) => r.data);
export const createStory = (body) => api.post('/stories', body).then((r) => r.data.story);
export const getStory = (id) => api.get(`/stories/${id}`).then((r) => r.data.story);
export const chooseStory = (id, body) => api.post(`/stories/${id}/choose`, body).then((r) => r.data.story);
export const deleteStory = (id) => api.delete(`/stories/${id}`);
