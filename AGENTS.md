# Odivon frontend rules

- Angular 22, standalone components and strict TypeScript are mandatory.
- Prefer Signals, computed state, Signal Forms and lazy feature routes.
- Do not add `ChangeDetectionStrategy.OnPush`; Angular 22 supplies the intended default behavior.
- Do not import `CommonModule`; use built-in control flow and focused standalone imports.
- Do not use `ngClass` or `ngStyle`.
- Use logical direction utilities (`start`, `end`, `ms`, `me`, `ps`, `pe`) so Arabic RTL remains correct.
- Business data must use MainAPI. Firebase is limited to Authentication and App Check.
- Never commit secrets, service-account files or production credentials.
- Preserve WCAG AA keyboard behavior and keep AXE critical/serious findings at zero.
