import * as React from "react";

export function useClientValue<T>(factory: () => T, fallback: T): T {
  const [value, setValue] = React.useState(() => fallback);

  React.useEffect(() => {
    setValue(factory());
    // factory intentionally excluded to avoid re-running when dependencies inside change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}
