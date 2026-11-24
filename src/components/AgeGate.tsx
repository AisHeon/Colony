"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const AGE_KEY = "colony:age-ok";
const LEGAL_PATHS = [
  "/privacy",
  "/terms",
  "/cookies",
  "/refunds",
  "/contact",
  "/credits",
  "/delete-data",
];

export function AgeGate() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const [underage, setUnderage] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      setAllowed(window.localStorage.getItem(AGE_KEY) === "1");
    } catch {
      setAllowed(false);
    }
    setReady(true);
  }, []);

  const isLegalPage = LEGAL_PATHS.some((path) => pathname === path);
  const open = ready && !allowed && !isLegalPage;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cardRef.current?.querySelector<HTMLElement>("button, a[href]")?.focus();

    function keepFocusInside(event: KeyboardEvent) {
      if (event.key !== "Tab" || !cardRef.current) return;
      const focusable = Array.from(
        cardRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", keepFocusInside);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keepFocusInside);
    };
  }, [open]);

  if (!open) return null;

  function accept() {
    try {
      window.localStorage.setItem(AGE_KEY, "1");
    } catch {
      /* A blocked storage area still lets this session continue. */
    }
    setAllowed(true);
  }

  return (
    <div className="age-gate" role="dialog" aria-modal="true" aria-labelledby="age-title">
      <div className="age-card" ref={cardRef}>
        <p className="eyebrow">Before you play</p>
        <h2 id="age-title">{underage ? "Not available for under-13 players yet" : "Are you 13 or older?"}</h2>
        {underage ? (
          <div className="stack-sm">
            <p>
              Colony does not currently collect data from children under 13. A parent or guardian can
              read the notes below, but the game is closed to this browser for now.
            </p>
            <div className="row">
              <Link className="btn btn-secondary btn-sm" href="/privacy#children">
                Read the children&apos;s note
              </Link>
              <Link className="btn btn-ghost btn-sm" href="/contact">
                Ask a question
              </Link>
            </div>
          </div>
        ) : (
          <div className="stack-sm">
            <p>
              Colony is a nickname-only party game. It stores a guest session, your nickname and your
              game answers. There are no accounts, ads or third-party analytics. Under-13 players are
              not permitted while we finish a parental-consent flow.
            </p>
            <div className="age-actions">
              <button type="button" className="btn btn-primary btn-lg" onClick={accept}>
                I&apos;m 13 or older
              </button>
              <button type="button" className="btn btn-lg" onClick={() => setUnderage(true)}>
                I&apos;m under 13
              </button>
            </div>
            <p className="hint">
              We ask once per browser. Read the{" "}
              <Link href="/privacy#children">privacy note</Link> or the{" "}
              <Link href="/contact">contact page</Link>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
