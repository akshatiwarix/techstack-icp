import { Suspense } from "react";
import { Console } from "./components/Console";

export default function Page() {
  return (
    <>
      <Suspense fallback={null}>
        <Console />
      </Suspense>
      <footer className="mx-auto w-full max-w-[1600px] border-t border-rule px-4 py-6 text-sm leading-relaxed text-slate lg:px-6">
        <p className="max-w-3xl">
          The corpus in this repo is authored and synthetic. Every domain ends in{" "}
          <span className="receipt">.example</span>, no real company is
          described, and the fourteen accounts exist to carry fourteen specific
          traps. To watch the same engine run on real data, inspect a live URL —
          and note how little of a stack one fetch can see.
        </p>
        <p className="mt-3 max-w-3xl">
          Day 008 of a 100-day building challenge.
        </p>
      </footer>
    </>
  );
}
