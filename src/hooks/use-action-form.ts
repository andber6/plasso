'use client';

import { startTransition, useActionState, type FormEvent } from 'react';

/**
 * useActionState, but submitted through onSubmit instead of <form action>.
 * React 19 resets a <form action> after every submission, even when the action
 * returns a validation error, which would wipe what the user typed.
 */
export function useActionForm<S>(action: (state: Awaited<S>, form: FormData) => S | Promise<S>, initial: Awaited<S>) {
  const [state, dispatch, pending] = useActionState(action, initial);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => dispatch(data));
  };
  return [state, onSubmit, pending] as const;
}
