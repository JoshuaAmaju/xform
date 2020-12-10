import {assign, Actor, createMachine, spawn, SpawnedActorRef} from 'xstate';
import createActor from './actor';
import {Config} from './types';

type XRecord<T> = {[K in keyof T]: T[K]};

type Context<T, K = unknown> = {
  data?: K;
  values: XRecord<T>;
  errors: Map<string, string>;
  actors?: Record<keyof T, SpawnedActorRef<any>>;
};

type Events<T> =
  | {type: 'BLUR'; name: keyof T; value: T[keyof T]}
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

const createFormMachine = <T, K>({schema, onSubmit}: Config<T>) => {
  return createMachine<Context<T, K>, Events<T>, States<T, K>>({
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
      editing: {},
      validating: {},
      submitting: {},
      submitted: {
        type: 'final',
        data: ({data}) => data,
      },
    },
  });
};

export default createFormMachine;
