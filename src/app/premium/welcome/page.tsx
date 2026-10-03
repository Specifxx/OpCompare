import type { Metadata } from "next";
import { WelcomePoller } from "./WelcomePoller";

export const metadata: Metadata = { title: "Welcome", robots: { index: false, follow: false } };

export default function Welcome() {
  return (
    <div className="flex justify-center">
      <div className="max-w-md text-center">
        <WelcomePoller />
      </div>
    </div>
  );
}
