import { createSlice } from '@reduxjs/toolkit';
const initial = () => { try { return localStorage.getItem('cv-theme') || 'dark'; } catch { return 'dark'; } };
const apply = (mode) => {
  document.documentElement.classList.toggle('dark', mode === 'dark');
  try { localStorage.setItem('cv-theme', mode); } catch { /* ignore */ }
};
const slice = createSlice({
  name: 'theme',
  initialState: { mode: initial() },
  reducers: { toggleTheme: (s) => { s.mode = s.mode === 'dark' ? 'light' : 'dark'; apply(s.mode); } },
});
export const { toggleTheme } = slice.actions;
export default slice.reducer;
