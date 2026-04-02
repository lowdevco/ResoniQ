import { SupportedColorScheme } from "./createThemeWithVars.js";
declare const useColorScheme: () => import("@mui/system").ColorSchemeContextValue<SupportedColorScheme>, deprecatedGetInitColorSchemeScript: typeof import("@mui/system/InitColorSchemeScript").default;
declare function Experimental_CssVarsProvider(props: any): import("react/jsx-runtime").JSX.Element;
declare const getInitColorSchemeScript: typeof deprecatedGetInitColorSchemeScript;
/**
 * TODO: remove this export in v7
 * @deprecated
 * The `CssVarsProvider` component has been deprecated and ported into `ThemeProvider`.
 *
 * You should use `ThemeProvider` and `createTheme()` instead:
 *
 * ```diff
 * - import { CssVarsProvider, extendTheme } from '@mui/material/styles';
 * + import { ThemeProvider, createTheme } from '@mui/material/styles';
 *
 * - const theme = extendTheme();
 * + const theme = createTheme({
 * +   cssVariables: true,
 * +   colorSchemes: { light: true, dark: true },
 * + });
 *
 * - <CssVarsProvider theme={theme}>
 * + <ThemeProvider theme={theme}>
 * ```
 *
 * To see the full documentation, check out https://mui.com/material-ui/customization/css-theme-variables/usage/.
 */
export declare const CssVarsProvider: (props: import("react").PropsWithChildren<Partial<import("@mui/system").CssVarsProviderConfig<SupportedColorScheme>> & {
  theme?: {
    cssVariables?: false | undefined;
    cssVarPrefix?: string | undefined;
    colorSchemes: Partial<Record<SupportedColorScheme, any>>;
    colorSchemeSelector?: "media" | "class" | "data" | string | undefined;
  } | {
    $$material: {
      cssVariables?: false | undefined;
      cssVarPrefix?: string | undefined;
      colorSchemes: Partial<Record<SupportedColorScheme, any>>;
      colorSchemeSelector?: "media" | "class" | "data" | string | undefined;
    };
  } | undefined;
  defaultMode?: "light" | "dark" | "system" | undefined;
  documentNode?: Document | null | undefined;
  colorSchemeNode?: Element | null | undefined;
  storageManager?: import("@mui/system").StorageManager | null | undefined;
  storageWindow?: Window | null | undefined;
  disableNestedContext?: boolean | undefined;
  disableStyleSheetGeneration?: boolean | undefined;
}>) => React.JSX.Element;
export { useColorScheme, getInitColorSchemeScript, Experimental_CssVarsProvider };