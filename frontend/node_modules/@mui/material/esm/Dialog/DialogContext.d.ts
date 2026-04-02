import * as React from 'react';
interface DialogContextValue {
  titleId?: string | undefined;
}
declare const DialogContext: React.Context<DialogContextValue>;
export default DialogContext;