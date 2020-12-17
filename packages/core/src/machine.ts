import {
  assign,
  createMachine,
  send,
  spawn,
  SpawnedActorRef,
  State,
} from 'xstate';
import {choose, pure} from 'xstate/lib/actions';
import createActor from './actor';
import {Config, XRecord} from './types';
import {toSchema} from './utils';

export type Context<T, K = unknown> = {
  data?: K;
  error?: Error;
  values: XRecord<T>;
  type: 'save' | 'submit';
  validatedActors: string[];
  errors: Map<keyof T, string>;
  actors?: Record<keyof T, SpawnedActorRef<any>>;
};

export type Events<T, K> =
  | {type: 'BLUR'; name: keyof T; value: T[keyof T]}
  | {type: 'EDIT'; name: keyof T; value: T[keyof T]}
  | {type: 'ERROR'; name: keyof T; error: string}
  | {type: 'NO_ERROR'; name: string}
  | {type: 'SET_BULK'; values: XRecord<T>}
  | {type: 'SAVE'; validate?: boolean; state: State<Context<T, K>>}
  | {type: 'SUBMIT'};

export type States<T, K = unknown> =
  | {
      value:
        | 'editing'
        | 'validating'
        | 'submitting'
        | 'validatingActors'
        | 'saving';
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
  onSave,
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

  return createMachine<Context<T, K>, Events<T, K>, States<T, K>>(
    {
      id: 'form',
      initial: 'editing',
      context: {
        values,
        type: 'submit',
        errors: new Map(),
        validatedActors: [],
        actors: {} as Context<T, K>['actors'],
      },
      entry: 'spawnActors',
      on: {
        SET_BULK: {
          actions: 'assignBulk',
        },
      },
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
            SAVE: [
              {
                target: 'validatingActors',
                cond: (_, {validate}) => validate,
                actions: assign({type: (_) => 'save'}),
              },
              {target: 'saving'},
            ],
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
            onDone: [
              {
                target: 'submitting',
                cond: ({type}) => type === 'submit',
              },
              {target: 'saving'},
            ],
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
        saving: {
          invoke: {
            src: 'saveForm',
            onDone: 'editing',
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

        assignBulk: assign({values: (_, {values}: any) => values}),

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

        spawnActors: assign((ctx) => {
          const actors = {} as Context<T, K>['actors'];

          Object.keys(schema).forEach((key) => {
            const _key = key as keyof T;
            const value = toSchema(schema[_key]);
            actors[_key] = spawn(createActor(key, value), key);
          });

          return {...ctx, actors};
        }),
      },
      services: {
        submitForm({values}) {
          return onSubmit(values);
        },
        async saveForm({values}) {
          return await onSave(values);
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
