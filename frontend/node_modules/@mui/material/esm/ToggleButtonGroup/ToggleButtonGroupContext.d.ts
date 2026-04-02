import * as React from 'react';
import type { ToggleButtonGroupProps } from "./ToggleButtonGroup.js";
interface ToggleButtonGroupContextType {
  className?: string | undefined;
  onChange?: ToggleButtonGroupProps['onChange'] | undefined;
  value?: ToggleButtonGroupProps['value'] | undefined;
  size?: ToggleButtonGroupProps['size'] | undefined;
  fullWidth?: ToggleButtonGroupProps['fullWidth'] | undefined;
  color?: ToggleButtonGroupProps['color'] | undefined;
  disabled?: ToggleButtonGroupProps['disabled'] | undefined;
}
/**
 * @ignore - internal component.
 */
declare const ToggleButtonGroupContext: React.Context<ToggleButtonGroupContextType>;
export default ToggleButtonGroupContext;