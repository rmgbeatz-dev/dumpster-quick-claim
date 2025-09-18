import React, { useMemo, useState } from "react";

/** -------------------------------------------------------
 *  Dumpster Quick-Claim — Vite + React + TypeScript
 *  - Eastern Time timestamps (America/Detroit)
 *  - Pick child (Sarah/Noah), amount, reason, payment method
 *  - Receipt upload (grace window if missing)
 *  - Auto EOB + CSV ledger line
 *  - Provider approve/deny demo buttons
 *  ----------------------------------------------------- */

type Claim = {
  id: string;
  dateET: string;
  child: "Sarah" | "Noah";
  amount: number;
  reason: string;
  classification: "Essential" | "Extra" | "Discretionary";
  receiptStatus: "Attached" | "Receipt Pending – Grace Period";
  paymentMethod:
    | "Cash"
    | "Venmo"
    | "PayPal"
    | "Apple Pay"
    | "Facebook Messenger Pay"
    | "Other";
  status: string;
  providerDecisionDateET?: string;
  confirmation?: string;
  eob: {
    billed: string;
    allowed: string;
    providerResp: string;
    proxyResp: string;
    impact: string;
  };
  receiptPreviewUrl?: string;
  notes?: string;
};

export default function App() {
  // ---------- form state ----------
  const [child, setChild] = useState<"Sarah" | "Noah">("Sarah");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("School clothing");
  const [customReason, setCustomReason] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<Claim["paymentMethod"]>("Venmo");
  const [notes, setNotes] = useState<string>("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [claims, setClaims] = useState<Claim[]>([]);

  // ---------- helpers ----------
  const nowET = () => {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Detroit",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(new Date());
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value?.padStart(2, "0") ?? "";
    return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get(
      "minute"
    )} ET`;
  };

  const makeDumpsterId = () =>
    `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;

  const effectiveReason = useMemo(
    () => (reason === "Other" ? (customReason.trim() || "Other") : reason),
    [reason, customReason]
  );

  const classify = (r: string): Claim["classification"] => {
    const lower = r.toLowerCase();
    const essentialKeywords = [
      "med", "medication", "insulin", "dexcom", "omnipod",
      "lunch", "food", "clothing", "school", "supplies",
      "field trip", "transport", "doctor", "copay"
    ];
    const extraKeywords = ["birthday", "gift", "sport", "club", "event", "snack"];
    if (essentialKeywords.some((k) => lower.includes(k))) return "Essential";
    if (extraKeywords.some((k) => lower.includes(k))) return "Extra";
    return "Discretionary";
  };

  const classification = useMemo(
    () => classify(effectiveReason),
    [effectiveReason]
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReceiptFile(e.target.files?.[0] ?? null);
  };

  const buildEOB = (amt: number, who: "Sarah" | "Noah", why: string): Claim["eob"] => ({
    billed: amt.toFixed(2),
    allowed: amt.toFixed(2),
    providerResp: amt.toFixed(2),
    proxyResp: (0).toFixed(2),
    impact: `${who}'s ${why}`,
  });

  const toCsvLine = (c: Claim) => {
    // DumpsterID,DateSubmitted(ET),Child,Amount,Reason,Classification,ReceiptStatus,PaymentMethod,Status,ProviderDecisionDate(ET),Confirmation,AgreementClause
    const fields = [
      c.id,
      c.dateET,
      c.child,
      c.amount.toFixed(2),
      c.reason,
      c.classification,
      c.receiptStatus,
      c.paymentMethod,
      c.status,
      c.providerDecisionDateET ?? "",
      c.confirmation ?? "",
      "Core Rule 1;3;6(ET);7(Informal);8(Grace);9(Deductible)",
    ];
    return fields.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",");
  };

  // ---------- submit ----------
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      alert("Enter a valid amount (e.g., 20).");
      return;
    }
    const id = makeDumpsterId();
    const dateET = nowET();
    const receiptStatus: Claim["receiptStatus"] = receiptFile
      ? "Attached"
      : "Receipt Pending – Grace Period";

    const claim: Claim = {
      id,
      dateET,
      child,
      amount: amt,
      reason: effectiveReason,
      classification,
      receiptStatus,
      paymentMethod,
      status: "Pending Provider Review",
      eob: buildEOB(amt, child, effectiveReason),
      receiptPreviewUrl: receiptFile ? URL.createObjectURL(receiptFile) : undefined,
      notes: notes.trim() || undefined,
    };

    setClaims((prev) => [claim, ...prev]);

    // reset light
    setAmount("");
    setCustomReason("");
    setNotes("");
    setReceiptFile(null);
  };

  // ---------- simple styles (no external libs) ----------
  const ui = {
    page: {
      fontFamily:
        "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      background: "#f6f7fb",
      color: "#0f172a",
      minHeight: "100vh" as const,
    },
    shell: {
      maxWidth: 960,
      margin: "0 auto",
      padding: "28px 20px",
    },
    h1: { fontSize: 24, fontWeight: 800 as const, marginBottom: 6 },
    sub: { fontSize: 13, color: "#475569", marginBottom: 18 },
    card: {
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 8px 24px rgba(2,6,23,0.06)",
      padding: 18,
      marginBottom: 18,
    },
    grid2: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
    },
    label: { fontSize: 12, color: "#475569", marginBottom: 6 },
    input: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid #e2e8f0",
      outline: "none",
    },
    select: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid #e2e8f0",
      outline: "none",
      background: "#fff",
    },
    textarea: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid #e2e8f0",
      outline: "none",
      resize: "vertical" as const,
    },
    row: { display: "flex", justifyContent: "space-between", alignItems: "center" },
    buttonPrimary: {
      background: "#111827",
      color: "#fff",
      border: 0,
      borderRadius: 14,
      padding: "10px 16px",
      fontWeight: 600,
      cursor: "pointer",
    },
    pill: {
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 999,
      background: "#eef2ff",
      color: "#3730a3",
      fontSize: 12,
      fontWeight: 600,
    },
    mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace" },
    tiny: { fontSize: 12, color: "#64748b" },
    divider: { height: 1, background: "#e2e8f0", margin: "12px 0" },
  };

  return (
    <div style={ui.page}>
      <div style={ui.shell}>
        <h1 style={ui.h1}>Dumpster Quick-Claim</h1>
        <div style={ui.sub}>
          Simple for Proxy, strict for the system. All times in <b>Eastern Time</b>.
          Missing receipt → <b>3-day grace</b> → if reimbursed and no receipt is provided,
          the amount becomes a <b>deductible balance</b> that offsets future reimbursements.
        </div>

        {/* Form Card */}
        <div style={ui.card}>
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
            <div style={ui.grid2}>
              <div>
                <div style={ui.label}>Child</div>
                <select
                  style={ui.select}
                  value={child}
                  onChange={(e) => setChild(e.target.value as "Sarah" | "Noah")}
                >
                  <option>Sarah</option>
                  <option>Noah</option>
                </select>
              </div>

              <div>
                <div style={ui.label}>Amount (USD)</div>
                <input
                  style={ui.input}
                  inputMode="decimal"
                  placeholder="e.g., 20"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div style={ui.grid2}>
              <div>
                <div style={ui.label}>Reason</div>
                <select
                  style={ui.select}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  <option>School clothing</option>
                  <option>Medication</option>
                  <option>School lunches</option>
                  <option>Supplies</option>
                  <option>Field trip</option>
                  <option>Other</option>
                </select>
              </div>

              {reason === "Other" && (
                <div>
                  <div style={ui.label}>Custom reason</div>
                  <input
                    style={ui.input}
                    placeholder="Type reason"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div style={ui.grid2}>
              <div>
                <div style={ui.label}>Payment method</div>
                <select
                  style={ui.select}
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as Claim["paymentMethod"])
                  }
                >
                  <option>Cash</option>
                  <option>Venmo</option>
                  <option>PayPal</option>
                  <option>Apple Pay</option>
                  <option>Facebook Messenger Pay</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <div style={ui.label}>Receipt (photo/PDF)</div>
                <input
                  style={ui.input}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFile}
                />
                <div style={ui.tiny}>No file? It enters 3-day grace.</div>
              </div>
            </div>

            <div>
              <div style={ui.label}>Notes (optional)</div>
              <textarea
                style={ui.textarea}
                rows={2}
                placeholder="Any quick context…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div style={ui.row}>
              <div style={ui.tiny}>
                <div>
                  <b>ET now:</b> {nowET()}
                </div>
                <div>
                  <b>Auto-classification:</b>{" "}
                  <span style={ui.pill}>{classification}</span>
                </div>
              </div>
              <button type="submit" style={ui.buttonPrimary}>
                Create Claim
              </button>
            </div>
          </form>
        </div>

        {/* Claims List */}
        {claims.length === 0 ? (
          <div style={{ ...ui.card, color: "#475569" }}>
            No claims yet. Submit the form above to generate a timestamped entry
            and CSV ledger line.
          </div>
        ) : (
          claims.map((c) => (
            <div key={c.id} style={ui.card}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={ui.grid2}>
                  <div>
                    <div style={ui.tiny}>DumpsterID</div>
                    <div style={ui.mono}>{c.id}</div>
                  </div>
                  <div>
                    <div style={ui.tiny}>Submitted</div>
                    <div style={ui.mono}>{c.dateET}</div>
                  </div>
                </div>

                <div style={ui.grid2}>
                  <div>
                    <div style={ui.tiny}>Child</div>
                    <div><b>{c.child}</b></div>
                  </div>
                  <div>
                    <div style={ui.tiny}>Amount</div>
                    <div><b>${c.amount.toFixed(2)}</b></div>
                  </div>
                </div>

                <div style={ui.grid2}>
                  <div>
                    <div style={ui.tiny}>Reason</div>
                    <div>{c.reason}</div>
                  </div>
                  <div>
                    <div style={ui.tiny}>Classification</div>
                    <div><span style={ui.pill}>{c.classification}</span></div>
                  </div>
                </div>

                <div style={ui.grid2}>
                  <div>
                    <div style={ui.tiny}>Payment Method</div>
                    <div>{c.paymentMethod}</div>
                  </div>
                  <div>
                    <div style={ui.tiny}>Receipt</div>
                    <div>{c.receiptStatus}</div>
                  </div>
                </div>

                {c.receiptPreviewUrl && (
                  <>
                    <div style={ui.divider} />
                    <div>
                      <div style={ui.tiny}>Receipt preview</div>
                      <img
                        src={c.receiptPreviewUrl}
                        alt="receipt preview"
                        style={{
                          maxHeight: 220,
                          borderRadius: 10,
                          border: "1px solid #e2e8f0",
                        }}
                      />
                    </div>
                  </>
                )}

                <div style={ui.divider} />

                {/* EOB */}
                <div>
                  <div style={{ ...ui.tiny, marginBottom: 6 }}>EOB</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, auto)", gap: 10 }}>
                    <div><b>Billed:</b> ${c.eob.billed}</div>
                    <div><b>Allowed:</b> ${c.eob.allowed}</div>
                    <div><b>Provider Resp:</b> ${c.eob.providerResp}</div>
                    <div><b>Proxy Resp:</b> ${c.eob.proxyResp}</div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <b>Impact:</b> {c.eob.impact}
                    </div>
                  </div>
                </div>

                {/* CSV line */}
                <div>
                  <div style={{ ...ui.tiny, margin: "10px 0 6px" }}>
                    CSV Ledger Line (copy into your sheet)
                  </div>
                  <textarea
                    readOnly
                    style={{ ...ui.textarea, fontSize: 12, fontFamily: ui.mono.fontFamily }}
                    rows={3}
                    value={toCsvLine(c)}
                  />
                  <div style={ui.tiny}>
                    Header: DumpsterID,DateSubmitted(ET),Child,Amount,Reason,Classification,
                    ReceiptStatus,PaymentMethod,Status,ProviderDecisionDate(ET),Confirmation,AgreementClause
                  </div>
                </div>

                {/* Provider action demo */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    style={{ ...ui.buttonPrimary, background: "#16a34a" }}
                    onClick={() => {
                      setClaims((prev) =>
                        prev.map((x) =>
                          x.id === c.id
                            ? { ...x, status: "Approved", providerDecisionDateET: nowET() }
                            : x
                        )
                      );
                    }}
                  >
                    Provider: Approve
                  </button>
                  <button
                    style={{ ...ui.buttonPrimary, background: "#dc2626" }}
                    onClick={() => {
                      setClaims((prev) =>
                        prev.map((x) =>
                          x.id === c.id
                            ? {
                                ...x,
                                status: "Denied — Missing info (Core Rule 3)",
                                providerDecisionDateET: nowET(),
                              }
                            : x
                        )
                      );
                    }}
                  >
                    Provider: Deny (missing)
                  </button>
                </div>

                <div style={ui.tiny}>
                  Policy: If reimbursed during grace but no valid receipt is uploaded within
                  3 days, the amount becomes a <b>deductible balance</b> against Proxy and
                  will automatically offset future reimbursements until cleared.
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
