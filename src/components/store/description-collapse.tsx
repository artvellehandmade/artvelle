"use client";

import { useState } from "react";

/**
 * Collapsible description — shows the first `limit` characters with a
 * "Read more" link for longer texts.  Short descriptions render as-is.
 */
export function DescriptionCollapse({
  text,
  limit = 200,
  className = "",
}: {
  text: string;
  limit?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const isLong = text.length > limit;

  return (
    <p className={`leading-relaxed text-muted-foreground ${className}`}>
      {isLong && !open ? (
        <>
          {text.slice(0, limit).trimEnd()}
          {"… "}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline text-accent underline-offset-2 hover:underline text-sm font-medium cursor-pointer"
          >
            Read more
          </button>
        </>
      ) : (
        <>
          {text}
          {isLong && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline text-accent underline-offset-2 hover:underline text-sm font-medium cursor-pointer"
              >
                Read less
              </button>
            </>
          )}
        </>
      )}
    </p>
  );
}
