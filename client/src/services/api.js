import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api/v1', withCredentials: true });

let store;
let refreshing = null;
export const attachStore = (s) => { store = s; };

api.interceptors.request.use((config) => {
  const token = store?.getState().auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const { config, response } = error;
    if (response?.status === 401 && config && !config._retry && !config.url.includes('/auth/')) {
      config._retry = true;
      try {
        refreshing = refreshing || api.post('/auth/refresh').finally(() => { refreshing = null; });
        const { data } = await refreshing;
        store.dispatch({ type: 'auth/setSession', payload: data });
        config.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(config);
      } catch {
        store.dispatch({ type: 'auth/clearSession' });
      }
    }
    return Promise.reject(error);
  }
);

export const errMsg = (e, fallback = 'Something went wrong. Please try again.') =>
  e?.response?.data?.message || (e?.code === 'ERR_NETWORK' ? 'Cannot reach the server. Check your connection.' : fallback);

export default api;
