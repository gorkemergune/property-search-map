/**
 * The bundled area files are large; typing them from their contents would slow
 * the type checker for no benefit. They are typed where they are loaded
 * (src/hooks/useAreaData.ts) and validated by src/lib/areas.test.ts.
 */
declare module '*.json' {
  const value: unknown;
  export default value;
}
