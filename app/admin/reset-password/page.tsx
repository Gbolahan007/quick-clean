import { Suspense } from "react";
import { ResetPasswordClient } from "./ResetPasswordClient";

export default function AdminResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordClient />
    </Suspense>
  );
}
