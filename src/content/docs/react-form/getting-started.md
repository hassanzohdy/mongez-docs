---
title: "Get started"
name: mongez-react-form-getting-started
description: |
  @mongez/react-form — headless React form primitives. useFormControl, validation rules, form events, submit-button state. Web + React Native compatible. This page covers install, locale registration for validation messages, and the minimal first form.
sidebar:
  order: 50
---

Headless React form primitives. `useFormControl` wires any custom input into a typed form context; `<Form>` (Web) or `<NativeForm>` (React Native) collects values; validation rules emit localized error messages. No `Formik` ceremony, no `react-hook-form` ref management — just hooks that read and write to a shared form context.

## Highlighted features

<div class="mongez-highlights">

<div class="mongez-highlight" data-accent="ice">
  <svg class="mongez-highlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  <h3>Headless controls via <code>useFormControl</code></h3>
  <p>Build any input shape — text, checkbox, radio, multi-value — by reading <code>value</code>, <code>changeValue</code>, <code>error</code> from the hook. Your component stays in charge of rendering.</p>
</div>

<div class="mongez-highlight" data-accent="ice">
  <svg class="mongez-highlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  <h3>Composable validation rules</h3>
  <p><code>rules: [requiredRule, emailRule]</code> — combine built-ins or write your own. Error messages render through <code>@mongez/localization</code> (six locales ship: en, ar, fr, es, it, de).</p>
</div>

<div class="mongez-highlight" data-accent="fire">
  <svg class="mongez-highlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
  <h3>Dot-notation names</h3>
  <p><code>name="user.firstName"</code> auto-nests into <code>values.user.firstName</code> on submit. No flat-key gymnastics for nested forms.</p>
</div>

<div class="mongez-highlight" data-accent="fire">
  <svg class="mongez-highlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
  <h3>Smart submit-button state</h3>
  <p><code>useSubmitButton</code> exposes <code>isSubmitting</code>, <code>isValid</code>, <code>hasChanges</code> — drop into your button without prop-drilling form state.</p>
</div>

<div class="mongez-highlight" data-accent="bolt">
  <svg class="mongez-highlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
  <h3>Web + React Native</h3>
  <p><code>&lt;Form&gt;</code> renders a real HTML form; <code>&lt;NativeForm&gt;</code> renders a fragment and submits programmatically. Same hooks, same validation, same API.</p>
</div>

<div class="mongez-highlight" data-accent="bolt">
  <svg class="mongez-highlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
  <h3>Form lifecycle events</h3>
  <p><code>onChange</code>, <code>onSubmit</code>, <code>onValid</code>, <code>onInvalid</code> — wire side effects without rebuilding a context provider.</p>
</div>

</div>

## Install

```sh
npm install @mongez/react-form
# or: yarn add @mongez/react-form
# or: pnpm add @mongez/react-form
```

Peer dep: `react >= 18`. Runtime deps install transitively: `@mongez/events`, `@mongez/localization`, `@mongez/supportive-is`, `@mongez/reinforcements`.

## Quick peek

```tsx
import { Form, useFormControl, requiredRule, emailRule } from "@mongez/react-form";

function TextInput(props) {
  const { value, changeValue, error, otherProps } =
    useFormControl({ ...props, rules: [requiredRule, emailRule] });
  return (
    <>
      <input value={value} onChange={(e) => changeValue(e.target.value)} {...otherProps} />
      {error && <span>{error}</span>}
    </>
  );
}

<Form onSubmit={({ values }) => api.signup(values)}>
  <TextInput name="email" type="email" required />
  <button type="submit">Sign up</button>
</Form>
```

Wrap your own input around `useFormControl`, drop it inside `<Form>`, get typed values on submit.

## Full setup steps

### 1. Register validation translations (one-time, at app entry)

Validation rules emit error messages through `@mongez/localization`. The translation bundles must be registered under the `validation` namespace before any form mounts. Do this once at the root of the app (typically `src/main.tsx` or `App.tsx`):

```ts
import { extend } from "@mongez/localization";
import {
  enValidationTranslation,
  arValidationTranslation,
} from "@mongez/react-form";

extend("en", { validation: enValidationTranslation });
extend("ar", { validation: arValidationTranslation });
```

Six locales ship: `en`, `ar`, `fr`, `es`, `it`, `de`. Register only those you need.

If this step is skipped, validation still runs but errors appear as raw translation keys (e.g. `validation.required`) instead of human-readable text.

### 2. Pick the right form component

- **Web** → import `Form` from `@mongez/react-form`. Renders an HTML `<form>` element. Submits via the standard browser submit event.
- **React Native** → import `NativeForm` from `@mongez/react-form`. Renders a Fragment by default (no host element). Submission is always programmatic.

Both expose the **same API** — the only differences are the rendered output and how submit is triggered.

### 3. Minimal first form (Web)

```tsx
import { Form, useFormControl, requiredRule, type FormControlProps } from "@mongez/react-form";

function TextInput(props: FormControlProps) {
  const { value, changeValue, id, error } = useFormControl({
    rules: [requiredRule],
    ...props,
  });

  return (
    <>
      <input id={id} value={value} onChange={(e) => changeValue(e.target.value)} />
      {error && <span style={{ color: "red" }}>{error}</span>}
    </>
  );
}

export default function App() {
  return (
    <Form onSubmit={({ values }) => console.log(values)}>
      <TextInput name="firstName" required />
      <TextInput name="lastName" />
      <button>Submit</button>
    </Form>
  );
}
```

The `name` prop on each `TextInput` becomes the key in the submitted `values` object. Dot notation (`user.firstName`) is supported and produces nested objects.

### 4. Verify the baseline

After completing steps 1–3, you should be able to:

- Mount the form, type into both inputs, click Submit.
- See the `values` object logged with both names.
- Submit with an empty first name and see the localized "This input is required" error rendered inline.

If any of those fail, the likely cause is one of:

- Validation translations not registered → errors show as `validation.required` text.
- `name` prop missing on an input → it won't be collected into `values`.
- `<button>` placed outside the `<Form>` → click won't trigger form submission.

## Where to go next

- **[Create form control](../create-form-control/)** — patterns for text inputs, checkboxes, radios, multi-value controls, custom validation
- **[Form events](../form-events/)** — `onChange`, `onSubmit`, `onValid`, `onInvalid` lifecycle hooks
- **[Submit button](../submit-button/)** — `useSubmitButton`, smart submit state
- **[Validation rules](../validation-rules/)** — built-in rules, writing custom ones
- **[React Native usage](../react-native-usage/)** — switching from `Form` to `NativeForm`
- **[Recipes](../recipes/)** — common patterns
