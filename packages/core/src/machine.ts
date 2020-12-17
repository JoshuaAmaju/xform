import {assign, createMachine, send, spawn, SpawnedActorRef} from 'xstate';
import {choose, pure} from 'xstate/lib/actions';
import createActor from './actor';
import {Config, XRecord} from './types';
import {toSchema} from './utils';

export type Context<T, K = unknown> = {
  data?: K;
  error?: Error;
  values: XRecord<T>;
  validatedActors: string[];
  errors: Map<keyof T, string>;
  actors?: Record<keyof T, SpawnedActorRef<any>>;
};

type Events<T> =
  | {type: 'BLUR'; name: keyof T; value: T[keyof T]}
  | {type: 'EDIT'; name: keyof T; value: T[keyof T]}
  | {type: 'ERROR'; name: keyof T; error: string}
  | {type: 'NO_ERROR'; name: string}
  | {type: 'SUBMIT'};

type States<T, K = unknown> =
  | {
      value: 'editing' | 'validating' | 'submitting' | 'validatingActors';
      context: Context<T, K>;
    }
  | {
      value: 'submitted';
      context: Context<T, K> & {data: K};
    };

const allActorsValidated = ({actors, validatedActors}: any) => {
  return validatedActors.length === Object.keys(actors).length;
};

const createFormMachine = <T, K>({
  schema,
  onSubmit,
  validate,
  once = false,
}: Config<T, K>) => {
  const values = {} as Context<T, K>['values'];

  Object.keys(schema).forEach((k) => {
    const key = k as keyof T;
    const {initialValue} = toSchema(schema[key]);
    values[key] = initialValue;
  });

  return createMachine<Context<T, K>, Events<T>, States<T, K>>(
    {
      id: 'form',
      initial: 'editing',
      context: {
        values,
        errors: new Map(),
        validatedActors: [],
        actors: {} as Context<T, K>['actors'],
      },
      entry: assign((ctx) => {
        const actors = {} as Context<T, K>['actors'];

        Object.keys(schema).forEach((key) => {
          const _key = key as keyof T;
          const value = toSchema(schema[_key]);
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
            EDIT: {
              actions: 'assignValue',
            },
            SUBMIT: 'validatingActors',
          },
        },
        validatingActors: {
          exit: 'clearMarkedActors',
          entry: 'sendValidateToActors',
          always: [
            {
              target: 'editing',
              cond: 'allActorsValidatedAndHasErrors',
            },
            {
              target: 'validating',
              cond: 'allActorsValidated',
            },
          ],
          on: {
            '*': {
              actions: [
                'markActor',
                choose([
                  {
                    actions: 'assignActorError',
                    cond: 'isErrorEvent',
                  },
                ]),
              ],
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
          entry: 'clearError',
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
        allActorsValidated,
        isErrorEvent: (_, {type}) => type === 'ERROR',
        allActorsValidatedAndHasErrors: ({errors, ...ctx}) => {
          return allActorsValidated(ctx) && errors.size > 0;
        },
      },
      actions: {
        assignData: assign({data: (_, {data}: any) => data}),
        assignError: assign({error: (_, {data}: any) => data}),
        clearError: assign((ctx) => ({...ctx, error: undefined})),
        sendActor: send((_, e) => e, {to: (_, {name}: any) => name}),

        assignValue: assign({
          values: ({values}, {name, value}: any) => {
            return {...values, [name]: value};
          },
        }),

        assignErrors: assign({
          errors: (_, {data}: any) => data,
        }),

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

        sendValidateToActors: pure(({actors}) => {
          return Object.keys(actors).map((key) => {
            return send('VALIDATE', {to: key});
          });
        }),

        markActor: assign({
          validatedActors: ({validatedActors}, {type, name}: any) => {
            return [...validatedActors, name];
          },
        }),

        clearMarkedActors: assign({validatedActors: () => []}),
      },
      services: {
        submitForm({values}) {
          return onSubmit(values);
        },
        validateForm({values}) {
          let errors = validate?.(values);

          if (errors && Object.values(errors).some((e) => e)) {
            const entries = Object.entries(errors);
            return Promise.reject(new Map(entries));
          }

          return Promise.resolve();
        },
      },
    }
  );
};

export default createFormMachine;
