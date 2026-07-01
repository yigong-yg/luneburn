import { useEffect, useState } from "react";

// Defer expensive derived work (the seed sweep) until a value stops changing.
export const useDebouncedValue = <T,>(value: T, ms: number): T => {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);

  return debounced;
};
