"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchResult, HistoryEvent } from "@/server/services/search/entitySearch";
import { IconRadio } from "@/components/icons";

const KIND_LABEL: Record<SearchResult["kind"], string> = {
  employee: "Employee",
  accessory: "Accessory",
  material: "Material",
  vehicle: "Vehicle",
};

/** §7.9 task 5 — search by name/code/plate, resolve to EPC/plate, then show history, all behind one box. */
export function EntitySearch() {
  const [query, setQuery] = useState("");
  const [fetchedResults, setFetchedResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [history, setHistory] = useState<HistoryEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived, not stored: avoids a synchronous setState-in-effect for the
  // "query too short" case — the effect below only ever sets state from
  // inside its debounced fetch callback, not its own body.
  const results = query.trim().length < 2 ? [] : fetchedResults;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) return;

    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const { data } = await res.json();
        setFetchedResults(data);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function selectResult(result: SearchResult) {
    setSelected(result);
    setFetchedResults([]);
    setQuery(result.label);
    setLoading(true);
    const params =
      result.kind === "vehicle"
        ? `kind=vehicle&plateNumber=${encodeURIComponent(result.plateNumber)}`
        : `kind=${result.kind}&epc=${encodeURIComponent(result.epc)}`;
    const res = await fetch(`/api/search/history?${params}`);
    setLoading(false);
    if (res.ok) {
      const { data } = await res.json();
      setHistory(data);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <div className="searchbar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4-4" />
        </svg>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setHistory(null);
          }}
          placeholder="Search by employee name/code, asset name, or vehicle plate…"
        />
      </div>

      {results.length > 0 && (
        <div className="card" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 20, maxHeight: 280, overflow: "auto" }}>
          {results.map((r) => (
            <button
              key={`${r.kind}-${r.id}`}
              onClick={() => selectResult(r)}
              style={{
                display: "flex",
                width: "100%",
                textAlign: "left",
                gap: 10,
                alignItems: "center",
                padding: "10px 14px",
                border: 0,
                borderBottom: "1px solid var(--color-border)",
                background: "transparent",
                cursor: "pointer",
                font: "inherit",
                color: "var(--color-text)",
              }}
            >
              <span className="pill pill-blue">{KIND_LABEL[r.kind]}</span>
              <span style={{ fontWeight: 600 }}>{r.label}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="sect-title">
            <h3>
              <IconRadio /> History — {selected.label}
            </h3>
          </div>
          {loading ? (
            <div className="empty">
              <p className="sub" style={{ margin: 0 }}>
                Loading…
              </p>
            </div>
          ) : !history || history.length === 0 ? (
            <div className="empty">
              <p className="sub" style={{ margin: 0 }}>
                No detection history yet for this {KIND_LABEL[selected.kind].toLowerCase()}.
              </p>
            </div>
          ) : (
            <div className="rowlist">
              {history.map((h, i) => (
                <div className="row" key={i}>
                  <div className="rmain">
                    <div className="rname">{h.detail}</div>
                  </div>
                  <div className="rtime">
                    <b>{new Date(h.at).toLocaleTimeString()}</b>
                    {new Date(h.at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
