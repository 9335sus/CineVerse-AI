import api from './api';
export const suggestMovies = (body) => api.post('/planner/suggest', body).then((r) => r.data);
export const listPlans = (status, page = 1) => api.get('/planner', { params: { status, page } }).then((r) => r.data);
export const createPlan = (body) => api.post('/planner', body).then((r) => r.data.plan);
export const updatePlan = (id, body) => api.patch(`/planner/${id}`, body).then((r) => r.data.plan);
export const deletePlan = (id) => api.delete(`/planner/${id}`);
