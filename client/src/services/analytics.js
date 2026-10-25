import api from './api';
export const getDna = () => api.get('/analytics/dna').then((r) => r.data);
export const getCompatibility = () => api.get('/analytics/compatibility').then((r) => r.data.friends);
