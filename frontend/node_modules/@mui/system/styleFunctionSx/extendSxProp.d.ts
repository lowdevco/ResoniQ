import { SxProps } from "./styleFunctionSx.js";
export default function extendSxProp<Props extends {
  sx?: SxProps<any> | undefined;
} = {}>(props: Props): Props;