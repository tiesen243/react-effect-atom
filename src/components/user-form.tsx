import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Schema from 'effect/Schema'
import { XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { FormBuilder } from '@/lib/form-builder'

class FormError extends Schema.TaggedError<FormError>()('FormError', {
  reason: Schema.String,
}) {}

class SubmissionError extends Schema.TaggedError<SubmissionError>()(
  'SubmissionError',
  { error: Schema.String }
) {}

const userForm = FormBuilder.empty
  .add('name', Schema.String.check(Schema.isMinLength(3)))
  .add('age', Schema.Number.check(Schema.isGreaterThan(18)))
  .add(
    'images',
    Schema.Array(Schema.String.check(Schema.isMinLength(1))).check(
      Schema.isMinLength(1)
    )
  )
  .make(
    Effect.fn(function* (values) {
      if (values.name === 'error')
        return yield* Effect.fail(
          new FormError({ reason: 'The name cannot be "error"' })
        )

      if (values.age === 99)
        return yield* Effect.fail(
          new SubmissionError({ error: 'The age cannot be 99' })
        )

      yield* Effect.sleep(1000)
      return values
    }),
    {
      defaultValues: { name: '', age: 0, images: [''] },
      onSuccess: (data) =>
        toast.add({
          type: 'success',
          title: 'Form submitted',
          description: <pre>{JSON.stringify(data, null, 2)}</pre>,
        }),
      onError: (error) =>
        Match.valueTags(error, {
          FormError: (e) =>
            toast.add({
              type: 'error',
              title: 'Form error',
              description: e.reason,
            }),
          SubmissionError: (e) =>
            toast.add({
              type: 'error',
              title: 'Submission error',
              description: e.error,
            }),
        }),
    }
  )

export const UserForm = () => (
  <userForm.Root
    render={({ handleSubmit }) => (
      <form
        className='bg-card text-card-foreground rounded-md border p-4 shadow-sm'
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
      />
    )}
  >
    <FieldSet>
      <FieldLegend>Form Example</FieldLegend>
      <FieldDescription>
        This is an example of a form built with the FormBuilder library. It
        includes validation, error handling, and submission logic.
      </FieldDescription>

      <FieldGroup>
        <userForm.Field
          name='name'
          render={({ field, meta }) => (
            <Field data-invalid={meta.errors.length > 0}>
              <FieldLabel htmlFor={field.id}>Name</FieldLabel>
              <Input
                {...field}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder='Enter your name'
              />
              <FieldError id={meta.errorId} errors={meta.errors} />
            </Field>
          )}
        />

        <userForm.Field
          name='age'
          render={({ field, meta }) => (
            <Field data-invalid={meta.errors.length > 0}>
              <FieldLabel htmlFor={field.id}>Age</FieldLabel>
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

        <userForm.Field
          name='images'
          render={({ field, meta }) => (
            <Field data-invalid={meta.errors.length > 0}>
              <FieldLabel htmlFor={field.id}>Images</FieldLabel>
              {field.value.map((image, index) => (
                <Field key={index} orientation='horizontal'>
                  <Input
                    {...field}
                    value={image}
                    onChange={(e) => meta.update(index, e.target.value)}
                    placeholder='Enter image URL'
                  />
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    onClick={() => meta.remove(index)}
                  >
                    <XIcon />
                  </Button>
                </Field>
              ))}
              <FieldDescription id={meta.descriptionId}>
                Add image URLs. You can add multiple images by clicking the "Add
                Image" button.
              </FieldDescription>
              <Button
                type='button'
                variant='secondary'
                onClick={() => meta.add('')}
              >
                Add Image
              </Button>
              <FieldError id={meta.errorId} errors={meta.errors} />
            </Field>
          )}
        />

        <userForm.Submit
          render={({ meta }) => (
            <Field>
              <Button
                type='submit'
                form={meta.formId}
                disabled={meta.isPending}
              >
                {meta.isPending ? 'Submitting...' : 'Submit'}
              </Button>
            </Field>
          )}
        />
      </FieldGroup>
    </FieldSet>
  </userForm.Root>
)
