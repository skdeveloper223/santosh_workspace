import "@testing-library/jest-dom";

declare module "vitest" {
  interface Assertion<T = unknown> extends Record<string, unknown> {
    toBeInTheDocument(): T;
  }
}
