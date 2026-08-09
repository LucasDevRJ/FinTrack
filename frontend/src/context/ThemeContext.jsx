import { createContext, useContext, useLayoutEffect, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "fintrack_theme";

// No stored preference yet (first visit) falls back to the OS setting,
// rather than always defaulting to light — respects a visitor who already
// has their system set to dark.
function getInitialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  // Toggling the `dark` class on <html> (not just a component root) is what
  // the Tailwind `dark:` variant is scoped to — see the @custom-variant in
  // index.css. useLayoutEffect (not useEffect) so the class lands before the
  // browser paints, avoiding a light-mode flash on a dark-preferring visitor.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme deve ser usado dentro de um ThemeProvider");
  }
  return context;
}
