"use client";

import { useState, useTransition } from "react";
import {
  ADMIN_OPERATIONS,
  type AdminOperationId,
} from "@/lib/admin-operations";
import {
  runAdminOperation,
  type RunAdminOperationResult,
} from "@/lib/admin-actions";

type ResultMap = Partial<Record<AdminOperationId, RunAdminOperationResult>>;

function resultText(result: RunAdminOperationResult): string {
  if (result.ok) return `OK ${result.status}`;
  if (result.error === "notConfigured") return "Missing JOBS_ADMIN_URL or JOBS_ADMIN_SECRET";
  if (result.error === "audit") return "Audit log write failed";
  if (result.error === "invalid") return "Invalid operation";
  return result.status ? `Failed ${result.status}` : "Failed";
}

export function OperationsPanel() {
  const [pendingOperation, setPendingOperation] = useState<AdminOperationId | null>(null);
  const [results, setResults] = useState<ResultMap>({});
  const [isPending, startTransition] = useTransition();

  function run(operationId: AdminOperationId) {
    const operation = ADMIN_OPERATIONS.find((item) => item.id === operationId);
    if (!operation) return;
    if (operation.danger && !window.confirm(`Run ${operation.label}?`)) return;

    setPendingOperation(operationId);
    startTransition(() => {
      void (async () => {
        try {
          const result = await runAdminOperation(operationId);
          setResults((current) => ({ ...current, [operationId]: result }));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          setResults((current) => ({
            ...current,
            [operationId]: {
              ok: false,
              operation: operationId,
              error: "upstream",
              response: message,
            },
          }));
        } finally {
          setPendingOperation(null);
        }
      })();
    });
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {ADMIN_OPERATIONS.map((operation) => {
        const result = results[operation.id];
        const running = pendingOperation !== null;
        const pending = pendingOperation === operation.id;
        return (
          <section
            key={operation.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <div className="flex min-h-24 flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <h2 className="text-base font-semibold">{operation.label}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{operation.description}</p>
              </div>
              <button
                type="button"
                disabled={running || isPending}
                onClick={() => run(operation.id)}
                className={
                  operation.danger
                    ? "rounded-lg border border-red-500 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-500 hover:text-white disabled:opacity-60"
                    : "rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
                }
              >
                {pending ? "Running" : "Run"}
              </button>
            </div>
            {result && (
              <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                <div
                  className={
                    result.ok
                      ? "text-sm font-semibold text-[var(--brand)]"
                      : "text-sm font-semibold text-red-600"
                  }
                >
                  {resultText(result)}
                </div>
                {result.response && (
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-[var(--muted)]">
                    {result.response}
                  </pre>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
