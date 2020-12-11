import {useForm} from '../src';

const form = document.querySelector('form');
const name = document.querySelector('#name');
const button = document.querySelector('button');
const password = document.querySelector('#password');

type Form = {
  name: string;
  password: number;
};

const {submit, handlers, subscribe} = useForm<Form>({
  schema: {
    name: {
      required: true,
    },
    password: {
      validate: (val) => !val && 'Password is required',
    },
  },
  onSubmit: () => Promise.resolve('Form submitted'),
});

// @ts-ignore
name.addEventListener('blur', ({target: {value}}) =>
  handlers.name.onBlur(value)
);

// @ts-ignore
password.addEventListener('blur', ({target: {value}}) =>
  handlers.password.onBlur(value)
);

form.addEventListener('submit', (e: any) => {
  e.preventDefault();
  submit();
});

subscribe(({errors, data, values, hasError, hasErrors, isSubmitting}) => {
  console.log(values, errors, isSubmitting, data);

  button.disabled = hasErrors;

  if (hasError('name')) {
    name.classList.add('error');
  } else {
    name.classList.remove('error');
  }

  if (hasError('password')) {
    password.classList.add('error');
  } else {
    password.classList.remove('error');
  }
});
