Copy and paste the following prompt directly to your coding agent (e.g. Cursor, Claude Code, Aider or Copilot Workspace):

# TASK: Internationalisation (i18n) refactoring of the Design System

## 1. ARCHITECTURAL GOAL

We need to migrate our design system to a **scalable i18n architecture with a composable Context and Type Colocation**.

The goal is to let consumers of the package import a root `UIProvider`, pass a typed translations file (without risking forgotten keys) and have every component inherit the translations automatically, without having to pass props everywhere.

### Golden rules:

1. **Zero external dependencies:** No runtime library such as `i18next` or `react-intl`. Vanilla React only (`createContext`, `useContext`).
2. **Type Colocation:** Every component defines its i18n interface and its English default object in the same file as the component. The global `UILocale` type and the `itIT` fallback must be composed by importing these single types/objects.
3. **Cascade precedence:** `Explicit prop on the component > Value in the UIProvider > English default of the component`.
4. **Backward compatibility:** All the existing text props on the components must keep working (becoming optional if they were not already).
5. **RSC Safety:** Add the `'use client'` directive only to the components that consume the Context (the interactive baseui components already have it).

---

## 2. IMPLEMENTATION STEPS

### STEP 1: Create the i18n Core module (`src/i18n/`)

Create the files for the internationalisation engine:

1. **`src/i18n/utils.ts`**: Implement a helper function for safe deep merge with no dependencies:
   ```typescript
   export type DeepPartial<T> = {
     [P in keyof T]?: T[P] extends (infer U)[]
       ? DeepPartial<U>[]
       : T[P] extends object | undefined
       ? DeepPartial<T[P]>
       : T[P];
   };

   export function deepMerge<T Record<string, any extends>>(target: T, source?: DeepPartial<T>): T {
     if (!source) return target;
     const output = { ...target };
     for (const key of Object.keys(source) as (keyof T)[]) {
       const sourceVal = source[key];
       const targetVal = target[key];
       if (
         sourceVal &&
         typeof sourceVal === "object" &&
         !Array.isArray(sourceVal) &&
         targetVal &&
         typeof targetVal === "object"
       ) {
         output[key] = deepMerge(targetVal, sourceVal as any);
       } else if (sourceVal !== undefined) {
         output[key] = sourceVal as any;
       }
     }
     return output;
   }
   ```

````

2. **`src/i18n/types.ts`**:
* Import the types and the English dictionaries from each refactored component (see Step 2).
* Compose the `UILocale` interface and the `itIT` object.
* Export the utilities for consumers:
* `defineStrictLocale(locale: UILocale): UILocale`: strictly checks that 100% of the keys are present.
* `defineLocale(overrides: DeepPartial<UILocale>): UILocale`: lets you translate only partial parts, falling back to `itIT`.




3. **`src/i18n/provider.tsx`**:
* Add `'use client'`.
* Create `UIContext` initialised with `itIT`.
* Create `UIProvider({ children, locale }: { children: React.ReactNode; locale?: UILocale })`.
* Export the internal hook: `export function useI18n<K extends keyof UILocale>(section: K): UILocale[K]`.



---

### STEP 2: Refactoring the Components

For every component that contains visible labels, screen-reader texts or `aria-label` (e.g. `dialog`, `pagination`, `select`, `alert`, `table`, etc.):

1. In the same file as the component, define and export the dedicated i18n interface (e.g. `PaginationI18n`) and the English default value (e.g. `paginationEn`). Use functions for texts with dynamic parameters (e.g. `summary: (curr, tot) => ReactNode`).
2. Consume the context through the hook: `const i18n = useI18n("<componentKey>");`.
3. Resolve the final value, giving priority to explicit props:
`const resolvedLabel = propLabel ?? i18n.someLabel;`

Standard example for every component:

```tsx
// src/components/ui/dialog.tsx
"use client";

import * as React from "react";
import * as DialogPrimitive from "@base-ui/dialog";
import { X } from "lucide-react";
import { useI18n } from "../../i18n/provider";

export interface DialogI18n {
  closeAriaLabel: string;
}

export const dialogEn: DialogI18n = {
  closeAriaLabel: "Close",
};

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  closeAriaLabel?: string;
}

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, closeAriaLabel, ...props }, ref) => {
  const i18n = useI18n("dialog");
  const finalCloseLabel = closeAriaLabel ?? i18n.closeAriaLabel;

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="..."/>
      <DialogPrimitive.Content className="..." ref="{ref}" {...props}>
        {children}
        <DialogPrimitive.Close aria-label="{finalCloseLabel}" className="...">
          <X className="h-4 w-4"/>
          <span className="sr-only">{finalCloseLabel}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

````

---

### STEP 3: Exports in the Barrel file (`src/index.ts`)

Export publicly:

- `UIProvider`, `UIProviderProps`
- `defineLocale`, `defineStrictLocale`
- The types: `UILocale`, `DeepPartial`
- The default locale: `itIT`

---

### STEP 4: Documentation (`docs/i18n.md`)

Create clear documentation for the developers who consume the package, with the following sections:

1. **Quickstart:** Zero-config usage (English default) vs usage with `UIProvider`.
2. **Defining a Custom Dictionary:**

- How to use `defineLocale` (flexible, safe against breaking changes in future package updates).
- How to use `defineStrictLocale` (100% strict, TypeScript throws an error if even a single string is missing).

You can do this in a Storybook section dedicated to localisation (always written in English).

3. **Integration with existing i18n frameworks:**

- Example of integration with **`next-intl`** (dynamic creation of the locale through the `t` function).
- Example of integration with **`react-i18next`**.

4. **Override at the single-component level:** How to keep overriding specific strings via prop where needed (`<Dialog closeAriaLabel="Chiudi pannello" />`).
5. **React Server Components (RSC) support:** Explanation of how to wrap the Next.js root layout without turning the child Server Components into Client Components.

---

## 3. VERIFICATION CHECKLIST

Before concluding the task, make sure that:

- [ ] The project compiles with no TypeScript errors (`tsc --noEmit` or build script).
- [ ] No external dependency has been added to `package.json`.
- [ ] There are no regressions on the existing props of the components.
- [ ] There are no circular dependencies between `src/i18n/types.ts` and the components (if needed, move only the `*En` types/objects into dedicated files or handle the type imports carefully).

```

```
