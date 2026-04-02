import { DefaultCssVarsTheme } from "./prepareCssVars.js";
interface Theme extends DefaultCssVarsTheme {
  cssVarPrefix?: string | undefined;
  colorSchemeSelector?: 'media' | string | undefined;
  shouldSkipGeneratingVar?: ((objectPathKeys: Array<string>, value: string | number) => boolean) | undefined;
}
declare function createCssVarsTheme<T extends Theme, ThemeVars extends Record<string, any>>({
  colorSchemeSelector,
  ...theme
}: T): T & {
  vars: ThemeVars;
  generateThemeVars: () => ThemeVars;
  generateStyleSheets: () => Record<string, any>[];
};
export default createCssVarsTheme;