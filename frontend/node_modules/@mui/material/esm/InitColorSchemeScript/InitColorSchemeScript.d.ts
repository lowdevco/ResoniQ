export declare const defaultConfig: {
  readonly attribute: "data-mui-color-scheme";
  readonly colorSchemeStorageKey: "mui-color-scheme";
  readonly defaultLightColorScheme: "light";
  readonly defaultDarkColorScheme: "dark";
  readonly modeStorageKey: "mui-mode";
};
export interface InitColorSchemeScriptProps {
  /**
   * The default mode when the storage is empty (user's first visit).
   * @default 'system'
   */
  defaultMode?: 'system' | 'light' | 'dark' | undefined;
  /**
   * The default color scheme to be used in light mode.
   * @default 'light'
   */
  defaultLightColorScheme?: string | undefined;
  /**
   * The default color scheme to be used in dark mode.
   * @default 'dark'
   */
  defaultDarkColorScheme?: string | undefined;
  /**
   * The node (provided as string) used to attach the color-scheme attribute.
   * @default 'document.documentElement'
   */
  colorSchemeNode?: string | undefined;
  /**
   * localStorage key used to store `mode`.
   * @default 'mui-mode'
   */
  modeStorageKey?: string | undefined;
  /**
   * localStorage key used to store `colorScheme`.
   * @default 'mui-color-scheme'
   */
  colorSchemeStorageKey?: string | undefined;
  /**
   * DOM attribute for applying a color scheme.
   * @default 'data-mui-color-scheme'
   * @example '.mode-%s' // for class based color scheme
   * @example '[data-mode-%s]' // for data-attribute without '='
   */
  attribute?: 'class' | 'data' | string | undefined;
  /**
   * Nonce string to pass to the inline script for CSP headers.
   */
  nonce?: string | undefined;
}
/**
 *
 * Demos:
 *
 * - [InitColorSchemeScript](https://mui.com/material-ui/react-init-color-scheme-script/)
 *
 * API:
 *
 * - [InitColorSchemeScript API](https://mui.com/material-ui/api/init-color-scheme-script/)
 */
declare function InitColorSchemeScript(props: InitColorSchemeScriptProps): import("react/jsx-runtime").JSX.Element;
declare namespace InitColorSchemeScript {
  var propTypes: any;
}
export default InitColorSchemeScript;