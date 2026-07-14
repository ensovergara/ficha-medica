import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reservar hora",
};

/**
 * Layout for the embeddable widget route.
 * Strips default body background so the iframe blends into the modal shell.
 * X-Frame-Options / CSP frame-ancestors are set in next.config.js.
 */
export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full w-full overflow-hidden bg-white">
      {children}
    </div>
  );
}
