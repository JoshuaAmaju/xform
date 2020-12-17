import {assign, createMachine, sendParent} from 'xstate';
import {Schema} from './types';
import {toLabel} from './utils';

type Context<T> = {
  value?: T;
  name: string;
  isValidateEvent?: boolean;
} & Omit<Schema<any>, 'initialValue'>;

type Events<T> = {type: 'BLUR'; value: T} | {type: 'VALIDATE'};

type States<T> = {value: 'editing' | 'validating'; context: Context<T>};

const createActor = <T>(
  name: string,
  {type, validate, required, initialValue}: Schema<T>
) => {
  return createMachine<Context<T>, Events<T>, States<T>>(
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

          let response: string;
          const label = toLabel(name);

          if (value && type && typeof value !== type) {
            response = `${label} should be a ${type}.`;
          }

          if (required && !value) {
            response = `${label} is required.`;
          }

          if (response) {
            return Promise.reject(response);
          }

          return Promise.resolve();
        },
      },
    }
  );
};

export default createActor;
