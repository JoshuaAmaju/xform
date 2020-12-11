import {assign, createMachine, sendParent} from 'xstate';
import {Schema} from './types';
import {toLabel} from './utils';

type Context = {
  name: string;
  value?: unknown;
  isValidateEvent?: boolean;
} & Omit<Schema<any>, 'initialValue'>;

type Events = {type: 'BLUR'; value: unknown} | {type: 'VALIDATE'};

type States = {value: 'editing' | 'validating'; context: Context};

const createActor = (
  name: string,
  {initialValue, validate, required}: Schema<any>
) => {
  return createMachine<Context, Events, States>(
    {
      id: `${name}-actor`,
      initial: 'editing',
      context: {
        name,
        value: initialValue,
      },
      states: {
        editing: {
          on: {
            VALIDATE: 'validating',
            BLUR: {
              target: 'validating',
              actions: 'assignValue',
            },
          },
        },
        validating: {
          invoke: {
            src: 'validate',
            onDone: {
              target: 'editing',
              actions: 'notifySuccess',
            },
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
        assignValue: assign({value: (_, {value}: any) => value}),
        notifyError: sendParent(({name}, {data}: any) => ({
          name,
          error: data,
          type: 'ERROR',
        })),
        notifySuccess: sendParent(({name}) => ({
          name,
          type: 'NO_ERROR',
        })),
      },
      services: {
        validate({value}) {
          const res = validate?.(value);

          if (res) {
            return Promise.reject(res);
          }

          if (required && !value) {
            return Promise.reject(`${toLabel(name)} is required.`);
          }

          return Promise.resolve();
        },
      },
    }
  );
};

export default createActor;
