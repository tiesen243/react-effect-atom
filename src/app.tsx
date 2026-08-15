import { useAtomValue } from '@effect/atom-react'
import { Effect, Schema } from 'effect'

import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { FormBuilder } from '@/lib/form-builder'

const form = FormBuilder.empty
  .add('name', Schema.String.check(Schema.isMinLength(3)))
  .add('age', Schema.Number.check(Schema.isGreaterThan(18)))
  .make(
    Effect.fn(function* (values) {
      yield* Effect.log(`Submitted values: ${JSON.stringify(values)}`)
      yield* Effect.sleep(1000)
      if (values.name === 'error')
        return yield* Effect.fail(new Error('Simulated error'))
      return values
    }),
    {
      defaultValues: { name: '', age: 0 },
      onSuccess: console.log,
      onError: console.error,
    }
  )

export default function App() {
  return (
    <main className='container mx-auto py-4'>
      <form.Form className='bg-card rounded-md border p-4 shadow-md'>
        <FieldSet>
          <FieldLegend>Login</FieldLegend>

          <FieldGroup>
            <form.Field
              name='name'
              render={({ field, meta }) => (
                <Field data-invalid={meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.id}>Email</FieldLabel>
                  <Input
                    {...field}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder='Enter your name'
                  />
                  <FieldError id={meta.errorId} errors={meta.errors} />
                </Field>
              )}
            />

            <form.Field
              name='age'
              render={({ field, meta }) => (
                <Field data-invalid={meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.id}>Password</FieldLabel>
                  <Input
                    {...field}
                    type='number'
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    placeholder='Enter your age'
                  />
                  <FieldError id={meta.errorId} errors={meta.errors} />
                </Field>
              )}
            />

            <SubmitButton />
          </FieldGroup>
        </FieldSet>
      </form.Form>
    </main>
  )
}

const SubmitButton = () => {
  const isPending = useAtomValue(form.state(), (s) => s.isPending)
  const submit = form.useSubmit()

  return (
    <Button type='submit' onClick={() => submit()} disabled={isPending}>
      Submit
    </Button>
  )
}
