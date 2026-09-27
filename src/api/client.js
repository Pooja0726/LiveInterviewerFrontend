const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8081';
const USER_URL = import.meta.env.VITE_USER_URL || 'http://localhost:8082';
const SESSION_URL = import.meta.env.VITE_SESSION_URL || 'http://localhost:8083';
const SCORECARD_URL = import.meta.env.VITE_SCORECARD_URL || 'http://localhost:8084';
const AI_GATEWAY_URL = import.meta.env.VITE_AI_GATEWAY_URL || 'http://localhost:8085';

function getToken() {
  return localStorage.getItem('token');
}

async function request(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const isMultipart = options.body instanceof FormData;
  if (!isMultipart && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    // Only force a logout/redirect when the token is genuinely missing or expired (401).
    // 403 means "forbidden / not found" which can happen for legitimate reasons
    // (e.g. wrong owner) and should NOT kick the user out.
    // Also never auto-redirect on DELETE — dashboard shows the error inline.
    const isDeleteRequest = (options.method || 'GET').toUpperCase() === 'DELETE';
    if ((response.status === 401 || response.status === 403) && !isDeleteRequest) {
      const isAuthEndpoint = url.includes('/api/auth/');
      if (!isAuthEndpoint) {
        // If 403 happens with no token, it's definitely an auth error.
        // If it happens with a token, it might be an expired token (Spring Security default).
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        window.location.href = '/login';
        return;
      }
    }

    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.error || Object.values(body)[0] || message;
    } catch {
      // response had no JSON body; keep the default message
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}


export const api = {
  // Auth — clear any stale token before logging in / registering so the
  // Authorization header is never sent with an expired JWT on these routes.
  register: (email, password) => {
    localStorage.removeItem('token');
    return request(`${AUTH_URL}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  login: (email, password) => {
    localStorage.removeItem('token');
    return request(`${AUTH_URL}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // User profile
  getMyProfile: () => request(`${USER_URL}/api/users/me`),
  upsertMyProfile: (payload) =>
    request(`${USER_URL}/api/users/me`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Sessions
  createSession: (interviewerStyle) =>
    request(`${SESSION_URL}/api/sessions`, {
      method: 'POST',
      body: JSON.stringify({ interviewerStyle }),
    }),

  getMySessions: () => request(`${SESSION_URL}/api/sessions/me`),

  getSession: (id) => request(`${SESSION_URL}/api/sessions/${id}`),

  setupSession: (id, role, company) =>
    request(`${SESSION_URL}/api/sessions/${id}/setup`, {
      method: 'PUT',
      body: JSON.stringify({ role, company }),
    }),

  uploadResume: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return request(`${SESSION_URL}/api/sessions/${id}/resume`, {
      method: 'POST',
      body: form,
    });
  },

  uploadJobDescription: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return request(`${SESSION_URL}/api/sessions/${id}/job-description`, {
      method: 'POST',
      body: form,
    });
  },

  getTurns: (id) => request(`${SESSION_URL}/api/sessions/${id}/turns`),

  deleteSession: (id) =>
    request(`${SESSION_URL}/api/sessions/${id}`, { method: 'DELETE' }),

  // Scorecards
  getMyScorecards: () => request(`${SCORECARD_URL}/api/scorecards/me`),
  getScorecardBySession: (sessionId) =>
    request(`${SCORECARD_URL}/api/scorecards/session/${sessionId}`),

  // Speech-to-text (spoken answer -> text, via Groq Whisper)
  transcribeAudio: (blob) => {
    const form = new FormData();
    form.append('audio', blob, 'answer.webm');
    return request(`${AI_GATEWAY_URL}/api/ai/transcribe`, {
      method: 'POST',
      body: form,
    });
  },

  // WebSocket URL builder (session service, not routed through fetch)
  buildWebSocketUrl: (sessionId) => {
    const base = SESSION_URL.replace('http', 'ws');
    return `${base}/ws/interview?token=${getToken()}&sessionId=${sessionId}`;
  },
};

export function saveAuth(token, email) {
  localStorage.setItem('token', token);
  localStorage.setItem('email', email);
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('email');
}

export function isAuthenticated() {
  return !!getToken();
}

export function getCurrentEmail() {
  return localStorage.getItem('email');
}
