export function FormField({
  label,
  name,
  type = "text",
  error,
  required,
  min,
  autoComplete,
  helpText,
  value,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
  required?: boolean;
  min?: number;
  autoComplete?: string;
  helpText?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-brand-900">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        min={min}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : helpText ? `${name}-help` : undefined}
        className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {helpText && !error && (
        <p id={`${name}-help`} className="mt-1 text-xs text-brand-900/60">
          {helpText}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
