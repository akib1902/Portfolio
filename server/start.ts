// Cross-platform production entry: NODE_ENV must be set before server/index.ts
// evaluates its module-level configuration.
process.env.NODE_ENV = 'production';
await import('./index');

export {};
