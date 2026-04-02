/**
 * Add keys, values of `defaultProps` that does not exist in `props`
 * @param defaultProps
 * @param props
 * @param mergeClassNameAndStyle If `true`, merges `className` and `style` props instead of overriding them.
 *   When `false` (default), props override defaultProps. When `true`, `className` values are concatenated
 *   and `style` objects are merged with props taking precedence.
 * @returns resolved props
 */
export default function resolveProps<T extends {
  components?: Record<string, unknown> | undefined;
  componentsProps?: Record<string, unknown> | undefined;
  slots?: Record<string, unknown> | undefined;
  slotProps?: Record<string, unknown> | undefined;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
} & Record<string, unknown>>(defaultProps: T, props: T, mergeClassNameAndStyle?: boolean): T;