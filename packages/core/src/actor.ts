import {createMachine} from 'xstate';

type Context = {
  name: string;
  value?: unknown;
};

type Events = {type: 'BLUR' | 'EDIT'; value: unknown};

type States = {value: 'editing'};
