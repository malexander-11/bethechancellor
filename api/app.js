// The server's app function on Vercel (ADR-0044): the bundle `npm run build` writes beside the
// site. Vercel builds functions after the site, so the bundle is there when this is packed.
export { default } from '../apps/server/dist/app.mjs';
