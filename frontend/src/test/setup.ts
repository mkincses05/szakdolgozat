import "@testing-library/jest-dom/vitest";
import "../i18n";
import { stubAccountApi } from "./accountApi";

// No test reaches a real backend; tests that need an account stub the API again.
beforeEach(() => {
  stubAccountApi();
});

afterEach(() => {
  vi.unstubAllGlobals();
});
