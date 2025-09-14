## 📜 Core Coding & TypeScript Rules

### 1. ⚔️ Zero Tolerance for `any`
- **Ban `any` explicitly.** Use `unknown` for values that are truly unknown and perform type-checking before use.
- **Type Everything.** All function parameters, return values, and variable declarations must have explicit types. Infer types only when it's obvious and safe.
- **Create Specific Types/Interfaces.** Define interfaces for complex objects, API responses, and component props (e.g., `interface AnimationControllerProps`). Avoid generic types like `object` or `{}`.

### 2. 🧹 Strict Code Hygiene
- **No Dead Code.** Safely remove all unused variables, functions, and imports. Enable linter rules to auto-fix or flag them as errors.
- **Prefix Unused Vars.** If a variable is intentionally unused (e.g., in a function signature), prefix it with an underscore (e.g., `_` or `_event`).

### 3. ⚛️ Unbreakable React Hook Rules
- **Hooks are Top-Level.** Never call hooks inside loops, conditions, or nested functions.
- **Respect the Dependency Array.** Always include all reactive values used inside `useEffect`, `useCallback`, and `useMemo` in their dependency arrays. If an object is causing re-renders, wrap its creation in `useMemo`.

### 4. 🧪 Consistent Testing & Mocking
- **Configure Test Environment Types.** Ensure your `tsconfig.json` includes the testing framework's types (e.g., `"types": ["jest", "node"]`) to resolve global names like `jest`, `describe`, and `it`.
- **Use Modern Mocking.** Standardize on ES6 `import` syntax and use `jest.mock()` or `vi.mock()` at the top level of test files. Avoid `require()` for mocking.
- **Type Your Mocks.** When creating mocks, ensure they fully conform to the original module's type signature. Mock objects must have all the properties of the type they are mocking.

### 5. 📦 Modern Module & Framework Standards
- **ESM Only.** Exclusively use ES Modules (`import`/`export`). Forbid CommonJS (`require`/`module.exports`).
- **Respect Framework Conventions.** Do not assign values to reserved variables like `module` in Next.js.