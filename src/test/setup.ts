import "@testing-library/jest-dom/vitest";

// Las pruebas del servidor corren en Node, sin window.
if (typeof window !== "undefined") {
  Object.defineProperty(window, "scrollTo", { writable: true, value: () => {} });
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => {},
    }),
  });
}
