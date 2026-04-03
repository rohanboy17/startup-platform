export function mergeMetricMaximums<T extends Record<string, number>>(current: T, incoming: T) {
  const merged = { ...incoming } as T;
  (Object.keys(incoming) as Array<keyof T>).forEach((key) => {
    merged[key] = Math.max(current[key], incoming[key]) as T[keyof T];
  });
  return merged;
}
