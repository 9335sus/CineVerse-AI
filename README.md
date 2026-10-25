# CineVerse AI

MERN movie discovery and social platform. **Complete project (Phases 1-6).**

| Feature | Where |
|---|---|
| Auth, profiles, TMDB browsing, watchlist, reviews | /, /search, /movie/:id, /watchlist, /profile |
| AI Mood Matcher with rule-based fallback | /mood |
| CineSync real-time group matching and voting | /rooms |
| Smart Planner (suggest, create, edit, complete, delete) | /planner |
| AI Story Simulator (branching, saved, spoiler levels, unofficial label) | /stories |
| Spoiler-safe discussion rooms, replies, reports | /discuss/:movieId |
| Movie DNA dashboard (aggregations + Recharts) | /dashboard |
| Admin: users, reviews, reports, analytics, AI usage | /admin |

```
cineverse-ai/
├── server/   Express + MongoDB API  (/api/v1)
└── client/   React + Vite + Tailwind + Redux Toolkit
```

## 1. Setup (Windows PowerShell)

### MongoDB Atlas
1. Create a free cluster at https://cloud.mongodb.com
2. Database Access: add a user. Network Access: allow your IP (or 0.0.0.0/0 for testing).
3. Connect > Drivers > copy the connection string into `MONGO_URI`.

### TMDB
1. Create an account at https://www.themoviedb.org, then Settings > API.
2. Copy the **API Read Access Token** into `TMDB_READ_TOKEN` (or the v3 key into `TMDB_API_KEY`).

### Run the backend
```powershell
cd server
npm install
Copy-Item .env.example .env      # then edit .env with your values
npm run dev                      # http://localhost:5000/api/v1/health
```

### Run the frontend (new terminal)
```powershell
cd client
npm install
npm run dev                      # http://localhost:5173
```
Vite proxies `/api` to port 5000, so no client `.env` is needed in development.

### AI configuration (optional)
In `server/.env`:
```
AI_PROVIDER=anthropic     # anthropic | openai (any OpenAI-compatible API) | none
AI_API_KEY=your_key
AI_MODEL=claude-sonnet-5-5
# AI_BASE_URL=https://api.openai.com/v1   (only for AI_PROVIDER=openai)
```
Without a key the Mood Matcher still works: explanations come from a rule-based fallback and are labelled "Rule-based". Every AI attempt is logged in the `aiusages` collection (used by the admin panel in Phase 6).

## 2. Verify
- Register at /register, then sign out and sign in again.
- Home shows trending/popular/top-rated/upcoming rows.
- /search: combine title, genre, language, year, rating filters.
- Open a movie: trailer, cast, watchlist/watched buttons, post a review.
- /watchlist and /profile require login.
- /mood: choose mood, genres, time, intensity, then Find my movies. Watched movies never appear. Past sessions are saved and can be reopened or deleted.
- /planner: pick time/mood, "Suggest movies", "Plan it", edit the date/note, "Done" (this also marks the movie watched), delete.
- /stories (needs AI configured): search a movie, write a what-if, choose a spoiler level, make choices or write your own. The story is saved; reopen it from the list to continue. The unofficial notice is always shown.
- /discuss/:movieId (button on any movie page): post a comment tagged "Contains spoilers" from one account; from a second account it stays hidden until that user sets progress to Finished or clicks "Reveal this comment". Reply, report (3 reports auto-hide a comment), and delete.
- /dashboard: mark several movies watched and add ratings; charts fill in. Compatibility compares you with people you shared a CineSync room with.
- /admin: see "Admin" below.
- /rooms (use two browsers, or one normal + one private window, with two accounts): create a room, join with the code, submit preferences in both, click "Find movies for the group" as host, vote in both windows and watch counts update live, then "Lock in decision".

### Make yourself an admin
Register normally, then:
```powershell
cd server
npm run make-admin -- you@example.com
```
Sign out and in again; an "Admin" link appears. Admins can suspend users (which ends their session), promote/demote, hide or delete reviews, resolve reports (hide / delete / dismiss), and view platform and AI-usage analytics.

## 3. Group matching algorithm
Each member gets a satisfaction score (0-1) per movie from genre fit, mood fit, language, runtime limit and quality; disliked genres cut the score by 70%. Group score = 0.6 x mean + 0.4 x worst-off member. The shortlist is picked greedily with a coverage bonus for movies that lift whoever is least satisfied so far, so no one's taste is ignored. Movies over anyone's runtime limit are excluded.

## Movie DNA and moderation notes
- Genres, monthly activity and ratings come from MongoDB aggregation pipelines (`$unwind`, `$group`, `$dateToString`). Empty months and ratings are zero-filled for charts.
- Compatibility = 80% cosine similarity of genre-watch vectors + 20% shared watched movies.
- Spoiler redaction happens on the server. Socket.IO only tells clients that "something changed"; they refetch their own redacted view.
- Reports: one per user per item; 3 reports auto-hide content until an admin resolves it. Dismissing the last open report restores it.

## 4. Tests
```powershell
cd server; npm test     # pure-logic suites + integration suites (auth, watchlist, planner, discussions, admin RBAC, stories with mocked AI, DNA, sockets). Integration suites use mongodb-memory-server, which downloads a Mongo binary on first run.
cd client; npm test     # component tests
```

## 5. Deploy
**Render (API):** use `render.yaml` as a Blueprint, or set Root dir `server`, build `npm install`, start `npm start`. Env vars: everything in `server/.env.example`, with `NODE_ENV=production` and `CLIENT_URL=https://<your-app>.vercel.app`.

**Vercel (client):** Root dir `client`, framework Vite. Env vars `VITE_API_URL=https://<your-api>.onrender.com/api/v1` and `VITE_SOCKET_URL=https://<your-api>.onrender.com`. `vercel.json` handles SPA routing.

## 6. Postman
Import `postman/CineVerse.postman_collection.json`. Run **Register** or **Login** first; it saves the token. `node postman/generate.js` rebuilds it.

## 7. API
| Method | Path | Auth |
|---|---|---|
| POST | /auth/register, /auth/login, /auth/refresh, /auth/logout | - |
| GET | /auth/me | yes |
| PATCH | /users/me, /users/me/password | yes |
| GET | /movies/list/:category (trending, popular, upcoming, top-rated) | - |
| GET | /movies/search?query&genre&language&year&minRating&page | - |
| GET | /movies/genres, /movies/:id | - |
| GET | /watchlist?status=watchlist\|watched | yes |
| GET/PUT/DELETE | /watchlist/:tmdbId | yes |
| GET | /reviews/movie/:tmdbId, /reviews/me | - / yes |
| PUT | /reviews/movie/:tmdbId | yes |
| DELETE | /reviews/:id (owner or admin) | yes |
| POST | /recommendations/mood | yes |
| GET | /recommendations/history | yes |
| DELETE | /recommendations/:id | yes |
| GET/POST | /rooms, /rooms/join | yes |
| GET/DELETE | /rooms/:code | member / host |
| POST | /planner/suggest | yes |
| GET/POST | /planner | yes |
| PATCH/DELETE | /planner/:id | owner |
| GET/POST | /stories | yes |
| GET/DELETE | /stories/:id | owner |
| POST | /stories/:id/choose | owner |
| GET/POST | /discussions/:tmdbId, /discussions/:tmdbId/comments | yes |
| GET/PUT | /discussions/:tmdbId/progress | yes |
| GET | /discussions/comments/:id/reveal | yes |
| POST | /discussions/comments/:id/report, /reviews/:id/report | yes |
| DELETE | /discussions/comments/:id | owner / admin |
| GET | /analytics/dna, /analytics/compatibility | yes |
| GET | /admin/analytics, /admin/ai-usage, /admin/users, /admin/reviews, /admin/reports | admin |
| PATCH | /admin/users/:id, /admin/reviews/:id, /admin/reports/:id | admin |
| DELETE | /admin/reviews/:id | admin |
| PUT | /rooms/:code/preferences | member |
| POST | /rooms/:code/recommendations, /rooms/:code/decide | host |
| POST | /rooms/:code/vote | member |

Socket.IO (auth: `{ token: accessToken }`): client emits `room:join`, `room:leave`, `room:vote`, `discussion:join`, `discussion:leave`; server emits `room:updated`, `room:presence`, `room:closed`, `discussion:changed`.

## Notes
- Uses `bcryptjs` (pure JS) instead of `bcrypt` to avoid native build problems on Windows.
- Access token lives in memory; the refresh token is an HTTP-only cookie, rotated on every refresh.
- To make an admin, set `role: "admin"` on a user in Atlas (admin panel arrives in Phase 6).

## Legal and safety
- Movie data and images come from TMDB (attribution is in the footer). No movie streaming is implemented, and trailers are YouTube embeds.
- Story Simulator output is labelled as unofficial AI-generated fan fiction everywhere it appears.
- Secrets (TMDB, AI, JWT, MongoDB) live only in server environment variables.
