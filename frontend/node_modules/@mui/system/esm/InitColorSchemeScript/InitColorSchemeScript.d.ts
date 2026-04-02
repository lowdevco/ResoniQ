export declare const DEFAULT_MODE_STORAGE_KEY = "mode";
export declare const DEFAULT_COLOR_SCHEME_STORAGE_KEY = "color-scheme";
export declare const DEFAULT_ATTRIBUTE = "data-color-scheme";
export interface InitColorSchemeScriptProps {
  /**
   * The default mode when the storage is empty (user's first visit).
   * @default 'system'
   */
  defaultMode?: 'system' | 'light' | 'dark' | undefined;
  /**
   * The default color scheme to be used on the light mode.
   * @default 'light'
   */
  defaultLightColorScheme?: string | undefined;
  /**
   * The default color scheme to be used on the dark mode.
   * * @default 'dark'
   */
  defaultDarkColorScheme?: string | undefined;
  /**
   * The node (provided as string) used to attach the color-scheme attribute.
   * @default 'document.documentElement'
   */
  colorSchemeNode?: string | undefined;
  /**
   * localStorage key used to store `mode`.
   * @default 'mode'
   */
  modeStorageKey?: string | undefined;
  /**
   * localStorage key used to store `colorScheme`.
   * @default 'color-scheme'
   */
  colorSchemeStorageKey?: string | undefined;
  /**
   * DOM attribute for applying color scheme.
   * @default 'data-color-scheme'
   * @example '.mode-%s' // for class based color scheme
   * @example '[data-mode-%s]' // for data-attribute without '='
   */
  attribute?: 'class' | 'data' | string | undefined;
  /**
   * Nonce string to pass to the inline script for CSP headers.
   */
  nonce?: string | undefined;
}
export default function InitColorSchemeScript(options?: InitColorSchemeScriptProps): import("react/jsx-runtime").JSX.Element;