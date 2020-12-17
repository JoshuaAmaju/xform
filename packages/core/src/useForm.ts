import {interpret, State} from 'xstate';
import createFormMachine, {Context} from './machine';
import {Config} from './types';

type SubscriberHelpers<T> = {
  hasErrors: boolean;
  isSubmitting: boolean;
  attemptedSubmit?: boolean;
  hasError(name: keyof T): boolean;
};

type Subscriber<T> = (
  config: Omit<Context<T>, 'actors' | 'validatedActors'> & SubscriberHelpers<T>
) => void;

type Handlers<T> = {
  [K in keyof T]: {
    onBlur(value: T[K]): void;
    onChange(value: T[K]): void;
  };
};

type SaveCallback = (state: State<any>) => void;

export default function useForm<T = any, K = unknown>(config: Config<T, K>) {
  const service = interpret(createFormMachine(config));

  const subscribe = (callback: Subscriber<T>) => {
    service.onTransition((state) => {
      const {
        context: {data, values, error, errors},
      } = state;

      const hasErrors = errors.size > 0;

      const isSubmitting = state.matches('submitting');

      const hasError = (name: keyof T) => errors.has(name);

      let attemptedSubmit =
        state.matches('editing') &&
        (state.history?.matches('validatingActors') ||
          state.history?.matches('validating'));

      callback({
        data,
        error,
        errors,
        values,
        hasError,
        hasErrors,
        isSubmitting,
        attemptedSubmit,
      });
    });
  };

  const save = (callback: SaveCallback) => {
    callback(service.state);
  };

  const onBlur = <K extends keyof T>(name: K, value: T[K]) => {
    service.send({type: 'BLUR', name, value});
  };

  const onChange = <K extends keyof T>(name: K, value: T[K]) => {
    service.send({type: 'EDIT', name, value});
  };

  const submit = () => service.send('SUBMIT');

  const handlers = {} as Handlers<T>;

  Object.keys(config.schema).forEach((key) => {
    handlers[key as keyof T] = {
      onBlur: onBlur.bind(null, key),
      onChange: onChange.bind(null, key),
    };
  });

  service.start();

  return {
    submit,
    onBlur,
    service,
    onChange,
    handlers,
    subscribe,
  };
}
