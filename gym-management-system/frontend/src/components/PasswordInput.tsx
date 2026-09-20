import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "id"
> & {
  id: string;
};

export default function PasswordInput({
  id,
  className = "",
  disabled,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  const buttonLabel = visible
    ? "Ocultar contraseña"
    : "Mostrar contraseña";

  return (
    <div className="relative">
      <input
        {...props}
        id={id}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={`input-field pr-12 ${className}`}
      />

      <button
        type="button"
        onClick={() => setVisible((previous) => !previous)}
        disabled={disabled}
        aria-label={buttonLabel}
        aria-controls={id}
        title={buttonLabel}
        className="absolute inset-y-0 right-0 flex items-center justify-center rounded-r-lg px-3 text-white/50 hover:text-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {visible ? (
          <EyeOff size={20} aria-hidden="true" />
        ) : (
          <Eye size={20} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}