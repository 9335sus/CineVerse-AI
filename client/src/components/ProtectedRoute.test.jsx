import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import auth from '../features/auth/authSlice';
import ProtectedRoute from './ProtectedRoute';

const renderAt = (user, ready = true) => {
  const store = configureStore({ reducer: { auth }, preloadedState: { auth: { user, accessToken: 't', ready, loading: false, error: null } } });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<ProtectedRoute role="admin"><p>Secret admin page</p></ProtectedRoute>} />
          <Route path="/login" element={<p>Login page</p>} />
          <Route path="/" element={<p>Home page</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

describe('ProtectedRoute', () => {
  it('sends signed-out visitors to login', () => { renderAt(null); expect(screen.getByText('Login page')).toBeInTheDocument(); });
  it('keeps normal users out of admin pages', () => { renderAt({ id: '1', role: 'user' }); expect(screen.getByText('Home page')).toBeInTheDocument(); });
  it('lets admins in', () => { renderAt({ id: '1', role: 'admin' }); expect(screen.getByText('Secret admin page')).toBeInTheDocument(); });
  it('renders nothing while the session is still loading', () => { renderAt(null, false); expect(screen.queryByText('Login page')).not.toBeInTheDocument(); });
});
