// The single call site for error reporting.
//
// A logging stub for now. MON-RDS-013 wires Sentry in here and nowhere else, so
// every reporter in the app keeps pointing at one function.
export function reportError(error, context = {}) {
  console.error("[reportError]", error, context);
}
