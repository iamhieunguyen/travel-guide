import axios from 'axios';
import { getIdToken } from './cognito';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_GATEWAY_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = getIdToken();
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

export default api;