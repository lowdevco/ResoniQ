import { Breakpoint } from '@mui/system';
import { TypographyVariants } from "./createTypography.js";
export interface ResponsiveFontSizesOptions {
  breakpoints?: Breakpoint[] | undefined;
  disableAlign?: boolean | undefined;
  factor?: number | undefined;
  variants?: Array<keyof TypographyVariants> | undefined;
}
export default function responsiveFontSizes<T extends {
  typography: TypographyVariants;
}>(theme: T, options?: ResponsiveFontSizesOptions): T;