import Link from "next/link";

/**
 * The previous / next arrow shared by all three calendar spans.
 *
 * Disabled renders a span rather than a dead link: an anchor with no href is
 * still focusable and still announced, so keyboard users tab onto a control
 * that does nothing and get no explanation.
 */
export function NavLink({
  href,
  label,
  disabled,
  children,
}: {
  href: string;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-control text-fg-faint opacity-30"
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      scroll={false}
      aria-label={label}
      className="fx-press grid h-8 w-8 place-items-center rounded-control text-fg-muted transition-colors duration-200 ease-out hover:bg-sunken hover:text-fg"
    >
      {children}
    </Link>
  );
}
