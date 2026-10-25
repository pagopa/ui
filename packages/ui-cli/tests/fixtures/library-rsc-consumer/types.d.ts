// TypeScript 6 checks side-effect imports; Next declares only the *.module.css
// ones, so the consumer declares the global stylesheet it imports in the layout.
declare module "*.css"
