import * as React from 'react';
import { OverridableComponent, OverrideProps } from '@mui/types';
import { SxProps, Breakpoint } from '@mui/system';
import { Theme } from "../styles/index.js";
import { ContainerClasses } from "../Container/containerClasses.js";
export interface PigmentContainerOwnProps {
  children?: React.ReactNode;
  /**
   * Override or extend the styles applied to the component.
   */
  classes?: Partial<ContainerClasses> | undefined;
  /**
   * If `true`, the left and right padding is removed.
   * @default false
   */
  disableGutters?: boolean | undefined;
  /**
   * Set the max-width to match the min-width of the current breakpoint.
   * This is useful if you'd prefer to design for a fixed set of sizes
   * instead of trying to accommodate a fully fluid viewport.
   * It's fluid by default.
   * @default false
   */
  fixed?: boolean | undefined;
  /**
   * Determine the max-width of the container.
   * The container width grows with the size of the screen.
   * Set to `false` to disable `maxWidth`.
   * @default 'lg'
   */
  maxWidth?: Breakpoint | false | undefined;
  /**
   * The system prop that allows defining system overrides as well as additional CSS styles.
   */
  sx?: SxProps<Theme> | undefined;
}
export interface PigmentContainerTypeMap<AdditionalProps = {}, RootComponent extends React.ElementType = 'div'> {
  props: AdditionalProps & PigmentContainerOwnProps;
  defaultComponent: RootComponent;
}
export type PigmentContainerProps<RootComponent extends React.ElementType = PigmentContainerTypeMap['defaultComponent'], AdditionalProps = {}> = OverrideProps<PigmentContainerTypeMap<AdditionalProps, RootComponent>, RootComponent> & {
  component?: React.ElementType | undefined;
};
/**
 *
 * Demos:
 *
 * - [Container](https://mui.com/material-ui/react-container/)
 *
 * API:
 *
 * - [PigmentContainer API](https://mui.com/material-ui/api/pigment-container/)
 */
declare const PigmentContainer: OverridableComponent<PigmentContainerTypeMap>;
export default PigmentContainer;