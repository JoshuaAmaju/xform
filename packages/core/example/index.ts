import {useForm} from '../src';

const form = document.querySelector('form');
const button = document.querySelector('button');

const name = document.querySelector('#name') as HTMLInputElement;
const password = document.querySelector('#password') as HTMLInputElement;

type Form = {
  name: string;
  password: number;
};

const {submit, handlers, subscribe} = useForm<Form>({
  schema: {
    name: 'string',
    password: {
      required: true,
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

subscribe(
  ({
    errors,
    data,
    values,
    hasError,
    hasErrors,
    isSubmitting,
    attemptedSubmit,
  }) => {
    console.log(values);

    if (attemptedSubmit) {
      alert('Please fill all fields');
    }

    // button.disabled = hasErrors;

    if (hasError('name')) {
      name.classList.add('error');
    } else {
      name.classList.remove('error');
    }

    console.log(name.validationMessage);

    if (hasError('password')) {
      password.classList.add('error');
    } else {
      password.classList.remove('error');
    }
  }
);
