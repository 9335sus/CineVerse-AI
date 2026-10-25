import { configureStore } from '@reduxjs/toolkit';
import auth from '../features/auth/authSlice';
import theme from '../features/theme/themeSlice';
import { attachStore } from '../services/api';

export const store = configureStore({ reducer: { auth, theme } });
attachStore(store);
