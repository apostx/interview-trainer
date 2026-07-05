// Minimal typing for the bundler-provided require.context used to
// auto-discover content packs. Available in webpack and Turbopack builds;
// absent in plain Node (tests), where the loader falls back to no packs.
interface RequireContext {
  keys(): string[];
  (id: string): unknown;
}

declare namespace NodeJS {
  interface Require {
    context(
      directory: string,
      useSubdirectories?: boolean,
      regExp?: RegExp,
    ): RequireContext;
  }
}
