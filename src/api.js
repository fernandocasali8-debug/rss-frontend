export const API_BASE = process.env.REACT_APP_API_BASE || `${window.location.protocol}//${window.location.hostname}:4000`;

export const apiFetch = (input, init = {}) => {
  const headers = init.headers || {};
  if (!headers['x-user-id']) {
    const userId = localStorage.getItem('rss-user-id');
    if (userId) {
      headers['x-user-id'] = userId;
    }
  }
  return fetch(input, {
    credentials: 'include',
    ...init,
    headers
  });
};

