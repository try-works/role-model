/**
 * Minimal type declarations for `@deepseek-ai/schemastery`.
 *
 * schemastery is supplied by the Harness at runtime, not by this repo, so it is
 * intentionally not installed here. This file declares only the surface the
 * plugin actually uses, which keeps `tsc --noEmit` honest without pinning the
 * build to one machine's checkout path. The runtime behaviour is what the specs
 * exercise; these declarations exist so the code type-checks.
 *
 * @module @try-works/dsh-role-model/schemastery
 */

declare module "@deepseek-ai/schemastery" {
  /** A schema that validates and transforms a value of type `T`. */
  export interface Schema<T> {
    (value: unknown): T;
    default(value: T): Schema<T>;
    required(): Schema<T>;
    description(text: string): Schema<T>;
    min(value: number): Schema<T>;
    max(value: number): Schema<T>;
    /** Schema projection used by the Harness loader's config surface. */
    toJSON(): unknown;
  }

  export interface StringSchema extends Schema<string> {}
  export interface NumberSchema extends Schema<number> {}
  export interface BooleanSchema extends Schema<boolean> {}
  export interface ConstSchema<T> extends Schema<T> {}
  export interface ObjectSchema<T> extends Schema<T> {}

  interface Schemastery {
    string(): StringSchema;
    number(): NumberSchema;
    boolean(): BooleanSchema;
    const<T>(value: T): ConstSchema<T>;
    union<T>(schemas: readonly Schema<T>[]): Schema<T>;
    object<T extends Record<string, unknown>>(
      shape: {
        [K in keyof T]: Schema<T[K]>;
      },
    ): ObjectSchema<T>;
    /**
     * Extract the validated value type of a schema. `infer` is a keyword, so it is
     * expressed as a callable generic rather than a type-valued property.
     */
    infer<S>(): S extends Schema<infer T> ? T : never;
  }

  const z: Schemastery;
  export default z;
}
