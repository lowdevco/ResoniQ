import * as React from 'react';
import type { ButtonGroupProps } from "./ButtonGroup.js";
interface ButtonGroupContextType {
  className?: string | undefined;
  color?: ButtonGroupProps['color'] | undefined;
  disabled?: boolean | undefined;
  disableElevation?: boolean | undefined;
  disableFocusRipple?: boolean | undefined;
  disableRipple?: boolean | undefined;
  fullWidth?: boolean | undefined;
  size?: ButtonGroupProps['size'] | undefined;
  variant?: ButtonGroupProps['variant'] | undefined;
}
/**
 * @ignore - internal component.
 */
declare const ButtonGroupContext: React.Context<ButtonGroupContextType>;
export default ButtonGroupContext;