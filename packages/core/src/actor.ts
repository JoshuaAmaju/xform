import {assign, createMachine, sendParent} from 'xstate';
import {Schema} from './types';

type Context = {
  name: string;
  value?: unknown;
} & Omit<Schema, 'initialValue'>;

type Events = {type: 'BLUR'; value: unknown};

type States = {value: 'editing' | 'validating'; context: Context};

const createActor = (name: string, {initialValue, ...config}: Schema) => {
  return createMachine<Context, Events, States>(
    {
      id: `${name}-actor`,
      initial: 'editing',
      context: {
        name,
        value: initialValue,
        ...config,
      },
      states: {
        editing: {
          on: {
            BLUR: {
              target: 'validating',
              actions: 'assignValue',
            },
          },
        },
        validating: {
          invoke: {
            src: 'validate',
            onDone: 'editing',
            onError: {
              target: 'editing',
              actions: 'notifyError',
            },
          },
        },
      },
    },
    {
      actions: {
        assignValue: assign({value: (_, {value}) => value}),
        notifyError: sendParent((_, {data}: any) => ({
          type: 'ERROR',
          error: data,
        })),
      },
      services: {
        validate({value, validate}) {
          const res = validate?.(value);

          if (res) {
            return Promise.reject(res);
          }

          return Promise.resolve();
        },
      },
    }
  );
};

export default createActor;
