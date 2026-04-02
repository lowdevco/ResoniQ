declare const _default: <T extends {
  rootSelector?: string | undefined;
  colorSchemeSelector?: "media" | "class" | "data" | string | undefined;
  colorSchemes?: Record<string, any> | undefined;
  defaultColorScheme?: string | undefined;
  cssVarPrefix?: string | undefined;
}>(theme: T) => (colorScheme: keyof T["colorSchemes"] | undefined, css: Record<string, any>) => string | {
  [x: string]: Record<string, any>;
  "@media (prefers-color-scheme: dark)": {
    [x: string]: Record<string, any>;
  };
} | {
  [x: string]: Record<string, any>;
  "@media (prefers-color-scheme: dark)"?: undefined;
};
export default _default;