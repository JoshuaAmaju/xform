import {
  assign,
  Actor,
  createMachine,
  spawn,
  SpawnedActorRef,
  send,
} from 'xstate';
import createActor from './actor';
import {Config, XRecord} from './types';

type Context<T, K = unknown> = {
  data?: K;
  values: XRecord<T>;
  error?: Error | string;
  errors: Map<string, string>;
  actors?: Record<keyof T, SpawnedActorRef<any>>;
};

type Events<T> =
  | {type: 'BLUR'; name: string; value: T[keyof T]}
  | {type: 'ERROR'; name: keyof T; error: string}
  | {type: 'NO_ERROR'; name: string}
  | {type: 'SUBMIT'};

type States<T, K = unknown> =
  | {
      value: 'editing' | 'validating' | 'submitting';
      context: Context<T, K>;
    }
  | {
      value: 'submitted';
      context: Context<T, K> & {data: K};
    };

const createFormMachine = <T, K>({
  schema,
  onSubmit,
  validate,
  once = false,
}: Config<T>) => {
  return createMachine<Context<T, K>, Events<T>, States<T, K>>(
    {
      id: 'form',
      initial: 'editing',
      context: {
        errors: new Map(),
        values: {} as XRecord<T>,
        actors: {} as Context<T, K>['actors'],
      },
      entry: assign((ctx) => {
        const actors = {} as Context<T, K>['actors'];

        Object.keys(schema).forEach((key) => {
          const _key = key as keyof T;
          const value = schema[_key];
          actors[_key] = spawn(createActor(key, value), key);
        });

        return {...ctx, actors};
      }),
      states: {
        editing: {
          on: {
            ERROR: {
              actions: 'assignActorError',
            },
            NO_ERROR: {
              actions: 'clearActorError',
            },
            BLUR: {
              actions: ['sendActor', 'assignValue'],
            },
            SUBMIT: {
              target: 'validating',
              cond: 'noError',
            },
          },
        },
        validating: {
          invoke: {
            src: 'validateForm',
            onDone: 'submitting',
            onError: {
              target: 'editing',
              actions: 'assignErrors',
            },
          },
        },
        submitting: {
          invoke: {
            src: 'submitForm',
            onDone: [
              {
                target: 'submitted',
                actions: 'assignData',
                cond: () => once,
              },
              {
                target: 'editing',
                actions: 'assignData',
              },
            ],
            onError: {
              target: 'editing',
              actions: 'assignError',
            },
          },
        },
        submitted: {
          type: 'final',
          data: ({data}) => data,
        },
      },
    },
    {
      guards: {
        noError: ({errors}) => errors.size <= 0,
      },
      actions: {
        assignData: assign({data: (_, {data}: any) => data}),
        assignError: assign({error: (_, {data}: any) => data}),
        assignActorError: assign({
          errors: ({errors}, {name, error}: any) => {
            const errs = new Map(errors);
            errs.set(name, error);
            return errs;
          },
        }),
        clearActorError: assign({
          errors: ({errors}, {name}: any) => {
            const errs = new Map(errors);
            errs.delete(name);
            return errs;
          },
        }),

        sendActor: send((_, e) => e, {to: (_, {name}: any) => name}),

        assignValue: assign({
          values: ({values}, {name, value}: any) => {
            return {...values, [name]: value};
          },
        }),
      },
      services: {
        submitForm({values}) {
          return onSubmit(values);
        },
        validateForm({values}) {
          const res = validate?.(values);

          if (res) {
            const entries = Object.entries(res);
            return Promise.reject(new Map(entries));
          }

          return Promise.resolve();
        },
      },
    }
  );
};

export default createFormMachine;
