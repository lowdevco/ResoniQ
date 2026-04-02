export interface DefaultCssVarsTheme {
  colorSchemes?: Record<string, any> | undefined;
  defaultColorScheme?: string | undefined;
}
declare function prepareCssVars<T extends DefaultCssVarsTheme, ThemeVars extends Record<string, any>>(theme: T, parserConfig?: {
  prefix?: string | undefined;
  colorSchemeSelector?: 'media' | 'class' | 'data' | string | undefined;
  disableCssColorScheme?: boolean | undefined;
  enableContrastVars?: boolean | undefined;
  shouldSkipGeneratingVar?: ((objectPathKeys: Array<string>, value: string | number) => boolean) | undefined;
  getSelector?: ((colorScheme: keyof T['colorSchemes'] | undefined, css: Record<string, any>) => string | Record<string, any>) | undefined;
}): {
  vars: ThemeVars;
  generateThemeVars: () => ThemeVars;
  generateStyleSheets: () => Record<string, any>[];
};
export default prepareCssVars;