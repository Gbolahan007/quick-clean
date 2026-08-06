import type { Metadata } from "next";
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Book a Clean ",
};
export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
