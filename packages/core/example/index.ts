import {useForm, Types} from '../src';

const form = document.querySelector('form');
const saveForm = document.querySelector('#save');
const formState = document.querySelector('#state');
const submitForm = document.querySelector('#submit');

const email = document.querySelector('#email') as HTMLInputElement;
const password = document.querySelector('#password') as HTMLInputElement;

type Form = {
  email: string;
  password: number;
};

const {save, submit, handlers, subscribe, restore} = useForm<Form>({
  schema: {
    email: {
      type: Types.ARRAY,
    },
    password: {
      required: true,
    },
  },
  onSubmit: () => Promise.resolve('Form submitted'),
  onSave: (state) => localStorage.setItem('form', JSON.stringify(state)),
});

document.addEventListener('DOMContentLoaded', () => {
  const res = localStorage.getItem('form');
  restore(JSON.parse(res));
});

// @ts-ignore
email.addEventListener('blur', ({target: {value}}) =>
  handlers.email.onBlur(value)
);

// @ts-ignore
password.addEventListener('blur', ({target: {value}}) =>
  handlers.password.onBlur(value)
);

saveForm.addEventListener('click', (_) => {
  save();
});

form.addEventListener('submit', (e: any) => {
  e.preventDefault();
  submit();
});

subscribe(
  ({
    data,
    saved,
    values,
    errors,
    hasError,
    isSaving,
    hasErrors,
    submitted,
    isSubmitting,
    attemptedSubmit,
  }) => {
    formState.innerHTML = isSaving
      ? 'saving'
      : isSubmitting
      ? 'submitting'
      : submitted
      ? 'submitted'
      : saved
      ? 'saved'
      : 'idle';

    console.log(errors);

    if (attemptedSubmit) {
      alert('Please fill all fields');
    }

    // button.disabled = hasErrors;

    if (hasError('email')) {
      email.classList.add('error');
    } else {
      email.classList.remove('error');
    }

    if (hasError('password')) {
      password.classList.add('error');
    } else {
      password.classList.remove('error');
    }
  }
);
