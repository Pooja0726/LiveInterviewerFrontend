import React, { createContext, useContext, useState } from 'react';
import { saveAuth, clearAuth, isAuthenticated, getCurrentEmail } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [email, setEmail] = useState(getCurrentEmail());

  const login = (token, userEmail) => {
    saveAuth(token, userEmail);
    setAuthed(true);
    setEmail(userEmail);
  };

  const logout = () => {
    clearAuth();
    setAuthed(false);
    setEmail(null);
  };

  return (
    <AuthContext.Provider value={{ authed, email, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
