import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { errMsg } from '../../services/api';

const call = (name, fn) => createAsyncThunk(`auth/${name}`, async (arg, { rejectWithValue }) => {
  try { return await fn(arg); } catch (e) { return rejectWithValue(errMsg(e)); }
});

export const bootstrap = createAsyncThunk('auth/bootstrap', async (_, { rejectWithValue }) => {
  try { return (await api.post('/auth/refresh')).data; } catch { return rejectWithValue(null); }
});
export const login = call('login', async (b) => (await api.post('/auth/login', b)).data);
export const register = call('register', async (b) => (await api.post('/auth/register', b)).data);
export const logout = createAsyncThunk('auth/logout', async () => { try { await api.post('/auth/logout'); } catch { /* ignore */ } });
export const updateProfile = call('updateProfile', async (b) => (await api.patch('/users/me', b)).data.user);

const slice = createSlice({
  name: 'auth',
  initialState: { user: null, accessToken: null, ready: false, loading: false, error: null },
  reducers: {
    setSession: (s, { payload }) => { s.user = payload.user; s.accessToken = payload.accessToken; },
    clearSession: (s) => { s.user = null; s.accessToken = null; },
    clearError: (s) => { s.error = null; },
  },
  extraReducers: (b) => {
    const ok = (s, { payload }) => { s.user = payload.user; s.accessToken = payload.accessToken; s.loading = false; s.error = null; };
    const pending = (s) => { s.loading = true; s.error = null; };
    const fail = (s, { payload }) => { s.loading = false; s.error = payload; };
    b.addCase(bootstrap.fulfilled, (s, a) => { ok(s, a); s.ready = true; })
      .addCase(bootstrap.rejected, (s) => { s.ready = true; })
      .addCase(login.pending, pending).addCase(login.fulfilled, ok).addCase(login.rejected, fail)
      .addCase(register.pending, pending).addCase(register.fulfilled, ok).addCase(register.rejected, fail)
      .addCase(logout.fulfilled, (s) => { s.user = null; s.accessToken = null; })
      .addCase(updateProfile.pending, pending)
      .addCase(updateProfile.fulfilled, (s, { payload }) => { s.user = payload; s.loading = false; })
      .addCase(updateProfile.rejected, fail);
  },
});
export const { clearError } = slice.actions;
export default slice.reducer;
