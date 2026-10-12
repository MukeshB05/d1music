# MUSIC_HOME integration notes

## Frontend files

- `src/services/api/backendMusicEndpoints.js` defines `MUSIC_HOME` and the related `/music/*` endpoint builders.
- `src/components/MainSection.jsx` requests `MUSIC_HOME` first, passes both `lang` and `language`, and supports raw launch-data responses plus mapped arrays and `{ sections: [...] }` responses.
- Existing JioSaavn playlist/search helpers remain as fallbacks so the Home page can still populate when `/music/home` is unavailable or returns incomplete sections.

## Backend requirement

The `/music/home` URL must be served by a backend registered on the same origin, or set `VITE_API_BASE_URL` to the deployed backend origin. The Saavn route definitions in `backend/src/saavn/routes.ts` are only route declarations; they require the matching `backend/src/saavn/controller.ts` and a Fastify server that registers `saavnRoutes` before they can run. Do not assume that adding the route declaration alone deploys those endpoints.

## Build verification

A production build could not be verified in this environment because `vite` is not installed and dependency installation timed out. Run `npm ci` followed by `npm run build` in an environment with package-registry access before deploying.
