import clsx from 'clsx'

const toneClasses = {
  cyan: {
    button: 'border-[color-mix(in_srgb,var(--accent-primary)_58%,var(--border-default)_42%)] bg-[color-mix(in_srgb,var(--bg-tertiary)_80%,var(--accent-primary)_20%)] text-[var(--text-primary)] hover:text-[var(--text-inverse)] hover:border-[var(--accent-primary)]',
    sweep: 'bg-[var(--accent-primary)]',
  },
  violet: {
    button: 'border-[color-mix(in_srgb,var(--color-accent-purple)_62%,var(--border-default)_38%)] bg-[color-mix(in_srgb,var(--bg-tertiary)_78%,var(--color-accent-purple)_22%)] text-[var(--text-primary)] hover:text-[var(--text-inverse)] hover:border-[var(--color-accent-purple)]',
    sweep: 'bg-[var(--color-accent-purple)]',
  },
  slate: {
    button: 'border-[var(--border-strong)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:text-[var(--bg-primary)] hover:border-[var(--text-secondary)]',
    sweep: 'bg-[var(--text-secondary)]',
  },
  danger: {
    button: 'border-[color-mix(in_srgb,var(--color-error)_72%,var(--border-default)_28%)] bg-[color-mix(in_srgb,var(--bg-tertiary)_75%,var(--color-error)_25%)] text-[var(--text-primary)] hover:text-[var(--text-inverse)] hover:border-[var(--color-error)]',
    sweep: 'bg-[var(--color-error)]',
  },
  emerald: {
    button: 'border-[color-mix(in_srgb,var(--color-success)_74%,var(--border-default)_26%)] bg-[color-mix(in_srgb,var(--bg-tertiary)_72%,var(--color-success)_28%)] text-[var(--text-primary)] hover:text-[var(--text-inverse)] hover:border-[var(--color-success)]',
    sweep: 'bg-[var(--color-success)]',
  },
}

const sizeClasses = {
  sm: 'px-3 py-2 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-5 py-3 text-sm rounded-xl',
}

const baseButtonClass =
  'group/neon relative inline-flex items-center justify-center gap-2 overflow-hidden border-2 font-extrabold transition-[color,border-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-75'

export default function NeonSweepButton({
  tone = 'cyan',
  size = 'md',
  className,
  children,
  type = 'button',
  ...props
}) {
  const toneConfig = toneClasses[tone] || toneClasses.cyan
  const sizeClass = sizeClasses[size] || sizeClasses.md

  return (
    <button
      type={type}
      className={clsx(baseButtonClass, sizeClass, toneConfig.button, className)}
      {...props}
    >
      <span
        className={clsx(
          'pointer-events-none absolute inset-y-0 left-[-24%] w-[148%] -skew-x-[35deg] -translate-x-[118%] transition-transform duration-[1150ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/neon:translate-x-0',
          toneConfig.sweep,
        )}
      />
      <span className="relative z-[1] inline-flex items-center gap-2 [&_svg]:shrink-0">{children}</span>
    </button>
  )
}
