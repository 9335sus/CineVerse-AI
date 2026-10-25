const axios = require('axios');
const { tmdb } = require('../config/env');
const ApiError = require('../utils/ApiError');

const http = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  timeout: 8000,
  headers: tmdb.readToken ? { Authorization: `Bearer ${tmdb.readToken}` } : {},
  params: tmdb.readToken ? {} : { api_key: tmdb.apiKey },
});

const cache = new Map();
const TTL = 5 * 60 * 1000;

exports.get = async (path, params = {}) => {
  if (!tmdb.readToken && !tmdb.apiKey) throw new ApiError(503, 'TMDB is not configured on the server');
  const key = path + JSON.stringify(params);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return hit.data;
  try {
    const { data } = await http.get(path, { params });
    if (cache.size > 500) cache.clear();
    cache.set(key, { t: Date.now(), data });
    return data;
  } catch (e) {
    if (e.response?.status === 404) throw new ApiError(404, 'Movie not found');
    throw new ApiError(502, 'Movie service is temporarily unavailable');
  }
};
