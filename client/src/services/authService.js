import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Authentication Service
 * Handles Firebase auth and JWT token exchange with backend
 */

/**
 * Sign up new user
 */
export const signUp = async (email, password, displayName) => {
  try {
    // Create Firebase user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Update display name
    await updateProfile(userCredential.user, { displayName });

    // Get Firebase ID token
    const firebaseToken = await userCredential.user.getIdToken();

    // Exchange for backend JWT
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to authenticate with backend');
    }

    const data = await response.json();

    // Store JWT in localStorage
    localStorage.setItem('chatToken', data.token);
    localStorage.setItem('chatUser', JSON.stringify(data.user));

    return data;
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
};

/**
 * Sign in existing user
 */
export const signIn = async (email, password) => {
  try {
    // Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Get Firebase ID token
    const firebaseToken = await userCredential.user.getIdToken();

    // Exchange for backend JWT
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to authenticate with backend');
    }

    const data = await response.json();

    // Store JWT in localStorage
    localStorage.setItem('chatToken', data.token);
    localStorage.setItem('chatUser', JSON.stringify(data.user));

    return data;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

/**
 * Sign out user
 */
export const logOut = async () => {
  try {
    await signOut(auth);
    localStorage.removeItem('chatToken');
    localStorage.removeItem('chatUser');
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

/**
 * Get current user from localStorage
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('chatUser');
  return userStr ? JSON.parse(userStr) : null;
};

/**
 * Get JWT token
 */
export const getToken = () => {
  return localStorage.getItem('chatToken');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!getToken();
};
