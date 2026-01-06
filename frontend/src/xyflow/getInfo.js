import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api';

const normalizePayload = (payload) => ({
  widget_id: payload.widgetId,
  user_id: payload.userId,
  role: payload.role,
  config: payload.config || {},
  board: payload.board || {},
});

export const getInfo = async (payload) => {
  const normalized = normalizePayload(payload);

  try {
    await axios.post(`${API_BASE}/widget-info/`, normalized);
  } catch (error) {
    console.error('Failed to persist widget info', error);
  }

  return normalized;
};

export default getInfo;
