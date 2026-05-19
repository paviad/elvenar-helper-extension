import { useEffect, useRef } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router';

export function UnsavedChangesGuard({ isDirty }: { isDirty: boolean }) {
  const blocker = useBlocker(isDirty);
  const handlingBlockRef = useRef(false);

  useEffect(() => {
    if (blocker.state !== 'blocked' || handlingBlockRef.current) return;

    handlingBlockRef.current = true;

    const okToLeave = window.confirm('You have unsaved changes. Leave this page and discard them?');

    if (okToLeave) {
      blocker.proceed();
    } else {
      blocker.reset();
    }

    handlingBlockRef.current = false;
  }, [blocker]);

  useBeforeUnload((event) => {
    if (!isDirty) return;
    event.preventDefault();
  });

  return null;
}
