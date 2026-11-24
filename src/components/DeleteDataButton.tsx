"use client";

import { useState } from "react";

export function DeleteDataButton() {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function wipe() {
    if (!window.confirm("Delete this browser's Colony data and clear the guest session?")) return;
    setState("working");
    setMessage("");
    let serverOk = false;
    try {
      const res = await fetch("/api/me/delete", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
      });
      serverOk = res.ok;
    } catch {
      serverOk = false;
    }

    try {
      window.localStorage.removeItem("colony:nickname");
      window.localStorage.removeItem("colony:sound");
      window.localStorage.removeItem("colony:age-ok");
      document.cookie = "colony_guest=; Max-Age=0; path=/; SameSite=Lax";
    } catch {
      /* local storage can be unavailable */
    }

    if (serverOk) {
      setState("done");
      setMessage("This browser is clear and the guest session was deleted.");
    } else {
      setState("error");
      setMessage(
        "This browser is clear, but the server session could not be confirmed. Email he.aison@charterschool.org for a manual deletion.",
      );
    }
  }

  return (
    <div className="delete-box">
      <button type="button" className="btn btn-danger" onClick={wipe} disabled={state === "working"}>
        {state === "working" ? "Deleting…" : "Delete my data"}
      </button>
      {message ? (
        <p className={state === "error" ? "error-text" : "small"} role="status">
          {message}
        </p>
      ) : (
        <p className="hint">
          This clears local preferences and the server guest session. If you are in an active match,
          finish or leave it first.
        </p>
      )}
    </div>
  );
}
