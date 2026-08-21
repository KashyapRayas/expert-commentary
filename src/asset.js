/**
 * Resolve a file in `public/` against the deployed base path.
 *
 * GitHub Pages serves a project site from /<repo>/, not /, so a bare "/front.jpg"
 * would 404 there. Vite rewrites asset URLs it can see — imports, CSS url() —
 * but not paths written as plain strings in JSX, which is how these are used.
 * BASE_URL is "/" in dev and "/expert-commentary/" in a production build.
 */
export const asset = (path) => import.meta.env.BASE_URL + path
