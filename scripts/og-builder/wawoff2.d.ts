/**
 * Types for `wawoff2`, which ships none.
 *
 * The package is an Emscripten build of Google's woff2 reference tool and its
 * `index.js` is untyped, so TypeScript widens the import to `any` and the
 * project's `no-unsafe-*` rules fail the build — correctly, because an untyped
 * import is exactly the hole those rules exist to close.
 *
 * Only `decompress` is declared, because it is the only thing this repository
 * calls. `compress` exists too; the fonts README records it being used once,
 * outside the repository, to convert JetBrains Mono from TTF.
 */
declare module 'wawoff2' {
  /** WOFF2 in, TTF/OTF out. */
  export function decompress(input: Uint8Array): Promise<Uint8Array>;
  /** TTF/OTF in, WOFF2 out. Declared for completeness; unused here. */
  export function compress(input: Uint8Array): Promise<Uint8Array>;
}
