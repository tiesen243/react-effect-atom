import {
  make,
  useAtom,
  useAtomSet,
  useAtomSubscribe,
  useAtomValue,
} from '@effect/atom-react'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'
import * as SchemaIssue from 'effect/SchemaIssue'
import * as Atom from 'effect/unstable/reactivity/Atom'
import * as React from 'react'

type Issues = Array<{
  path?: ReadonlyArray<unknown>
  message: string
}>

interface FormState<TValues> {
  values: TValues
  errors: Record<keyof TValues, Issues>
  isPending: boolean
}

const formatter = SchemaIssue.makeFormatterStandardSchemaV1()

export class FormBuilder<TFields extends Schema.Struct.Fields> {
  constructor(private fields: TFields) {}

  public static get empty() {
    return new FormBuilder({})
  }

  public add<TFieldName extends string, TFieldSchema extends Schema.Constraint>(
    name: TFieldName,
    schema: TFieldSchema
  ): FormBuilder<TFields & Record<TFieldName, TFieldSchema>> {
    this.fields = { ...this.fields, [name]: schema }
    return this as unknown as FormBuilder<
      TFields & Record<TFieldName, TFieldSchema>
    >
  }

  public make<TValues extends Schema.Struct<TFields>['Type'], A, E>(
    onSubmit: (values: NoInfer<TValues>) => Effect.Effect<A, E>,
    options: {
      defaultValues: TValues
      onSuccess?: (data: NoInfer<A>) => void
      onError?: (error: NoInfer<E>) => void
    }
  ) {
    const keys = Object.keys(options.defaultValues) as Array<keyof TValues>

    const valuesAtoms = Atom.family((fieldName: keyof TValues) =>
      Atom.make(options.defaultValues[fieldName])
    )

    const errorsAtoms = Atom.family((fieldName: keyof TValues) =>
      Atom.make({} as Record<keyof TValues, Issues>[typeof fieldName])
    )

    const pendingAtom = Atom.make(false)

    const formAtom = make(() =>
      Atom.writable(
        (get) => {
          const values = {} as TValues,
            errors = {} as Record<keyof TValues, Issues>,
            isPending = get(pendingAtom)

          for (const key of keys) {
            values[key] = get(valuesAtoms(key))
            errors[key] = get(errorsAtoms(key))
          }

          return { values, errors, isPending }
        },
        (ctx, newState: FormState<TValues>) => {
          for (const key of keys) {
            ctx.set(valuesAtoms(key), newState.values[key])
            ctx.set(errorsAtoms(key), newState.errors[key])
          }
          ctx.set(pendingAtom, newState.isPending)
        }
      )
    )

    const FormContext = React.createContext<{
      formId: string
    } | null>(null)

    const useSubmit = () => {
      const form = formAtom.use()

      const valuesRef = React.useRef<TValues>(options.defaultValues)
      useAtomSubscribe(
        form,
        (latestValues) => (valuesRef.current = latestValues.values),
        { immediate: true }
      )

      const isPending = useAtomValue(formAtom.use(), (s) => s.isPending)

      const setState = useAtomSet(form)

      const handleSubmit = React.useCallback(
        async (event?: React.SubmitEvent<HTMLFormElement>) => {
          event?.preventDefault()
          event?.stopPropagation()

          if (isPending) return
          setState((prev) => ({ ...prev, isPending: true }))

          const result = Schema.decodeUnknownResult(
            Schema.Struct(this.fields) as never
          )(valuesRef.current, { errors: 'all' })

          if (result._tag === 'Failure') {
            const { issues } = formatter(result.failure.issue)
            const errors = issues.reduce(
              (acc, issue) => {
                const path = issue.path?.[0] as keyof TValues
                if (!acc[path]) acc[path] = []
                acc[path].push(issue)
                return acc
              },
              {} as Record<keyof TValues, Issues>
            )
            return setState((prev) => ({ ...prev, errors, isPending: false }))
          } else
            setState((prev) => ({
              ...prev,
              errors: {} as Record<keyof TValues, Issues>,
            }))

          await onSubmit(result.success).pipe(
            Effect.tap((a) => Effect.sync(() => options.onSuccess?.(a))),
            Effect.catch((e) => Effect.sync(() => options.onError?.(e))),
            Effect.runPromise
          )
          setState((prev) => ({ ...prev, isPending: false }))
        },
        [setState, isPending]
      )

      return handleSubmit
    }

    const FormInner = (props: React.ComponentProps<'form'>) => {
      const handleSubmit = useSubmit()
      return <form {...props} onSubmit={handleSubmit} />
    }

    const Form = (props: React.ComponentProps<'form'>) => {
      const id = React.useId()
      const formId = `form-${id}`

      return (
        <FormContext value={{ formId }}>
          <formAtom.Provider>
            <FormInner data-slot='form' id={formId} {...props} />
          </formAtom.Provider>
        </FormContext>
      )
    }

    const Field = <TFieldName extends keyof TValues>(props: {
      name: TFieldName
      render: (args: {
        field: {
          id: string
          name: TFieldName
          value: TValues[TFieldName]
          onChange: (value: TValues[TFieldName]) => void
          onBlur: () => void
        }
        meta: {
          descriptionId: string
          errorId: string
          errors: Issues

          add: TValues[TFieldName] extends Array<infer U>
            ? (value: U) => void
            : never
          update: TValues[TFieldName] extends Array<infer U>
            ? (index: number, value: U) => void
            : never
          remove: TValues[TFieldName] extends Array<infer _U>
            ? (index: number) => void
            : never
        }
      }) => React.ReactNode
    }) => {
      const ctx = React.use(FormContext)
      if (!ctx) throw new Error('Field must be used within a Form')

      const prevValueRef = React.useRef<TValues[TFieldName]>(
        options.defaultValues[props.name]
      )

      const [value, setValue] = useAtom(valuesAtoms(props.name))
      const errors = useAtomValue(errorsAtoms(props.name), (s) => s ?? [])
      const setState = useAtomSet(formAtom.use())

      const handleChange = React.useCallback(
        (newValue: TValues[TFieldName]) => {
          setValue(newValue)
        },
        [setValue]
      )

      const handleBlur = React.useCallback(() => {
        if (prevValueRef.current === value) return
        prevValueRef.current = value as TValues[TFieldName]

        const result = Schema.decodeUnknownResult(
          this.fields[props.name] as never
        )(value)

        if (result._tag === 'Failure') {
          const { issues } = formatter(result.failure.issue)
          setState((prev) => ({
            ...prev,
            errors: { ...prev.errors, [props.name]: issues },
          }))
        } else {
          setState((prev) => ({
            ...prev,
            errors: { ...prev.errors, [props.name]: [] },
          }))
        }
      }, [props.name, setState, value])

      const add = React.useCallback(
        (newValue: TValues[TFieldName] extends Array<infer U> ? U : never) => {
          if (!Array.isArray(value)) return
          setValue((prev) => [...(prev as unknown[]), newValue] as never)
        },
        [setValue, value]
      )

      const update = React.useCallback(
        (
          index: number,
          newValue: TValues[TFieldName] extends Array<infer U> ? U : never
        ) => {
          if (!Array.isArray(value)) return
          setValue(
            (prev) =>
              (prev as unknown[]).map((v, i) =>
                i === index ? newValue : v
              ) as TValues[TFieldName]
          )
        },
        [setValue, value]
      )

      const remove = React.useCallback(
        (index: number) => {
          if (!Array.isArray(value)) return
          setValue(
            (prev) =>
              (prev as unknown[]).filter(
                (_, i) => i !== index
              ) as TValues[TFieldName]
          )
        },
        [setValue, value]
      )

      const id = React.useId()
      const fieldId = `${ctx.formId}-field-${id}`
      const descriptionId = `${fieldId}-description`
      const errorId = `${fieldId}-error`

      const a11yProps = {
        form: ctx.formId,
        id: fieldId,
        'aria-describedby':
          errors.length > 0 ? `${errorId} ${descriptionId}` : descriptionId,
        'aria-invalid': errors.length > 0,
        'data-slot': 'form-field',
      }

      return props.render({
        field: {
          name: props.name,
          value: value as TValues[TFieldName],
          onChange: handleChange,
          onBlur: handleBlur,
          ...a11yProps,
        },
        meta: {
          descriptionId,
          errorId,
          errors,

          add: add as never,
          update: update as never,
          remove: remove as never,
        },
      })
    }

    const Submit = (props: {
      render: (args: {
        submit: () => void
        meta: { formId: string; isPending: boolean }
      }) => React.ReactNode
    }) => {
      const ctx = React.use(FormContext)
      if (!ctx) throw new Error('Submit must be used within a Form')

      const isPending = useAtomValue(formAtom.use(), (s) => s.isPending)
      const submit = useSubmit()

      return props.render({
        submit: () => submit(),
        meta: { formId: ctx.formId, isPending },
      })
    }

    return {
      Form,
      Field,
      Submit,

      useSubmit,

      state: formAtom.use,
    }
  }
}
