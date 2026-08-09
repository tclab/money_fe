import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, waitForElementToBeRemoved } from "@testing-library/react";
import { I18nProvider, useI18n } from "../i18n/index.jsx";
import { ToastProvider, useToast } from "./Toast.jsx";
import { ApiError } from "../lib/apiError.js";
import en from "../i18n/en.json";
import es from "../i18n/es.json";

vi.mock("../lib/reportError.js", () => ({ reportError: vi.fn() }));

let toast;
let lang;
function Probe() {
  toast = useToast();
  lang = useI18n();
  return null;
}

function setup(dismissMs) {
  render(
    <I18nProvider>
      <ToastProvider dismissMs={dismissMs}>
        <Probe />
      </ToastProvider>
    </I18nProvider>
  );
}

describe("ToastProvider", () => {
  beforeEach(() => {
    localStorage.setItem("app-language", "en");
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("translates a known error code", () => {
    setup();
    act(() => toast.showError(new ApiError({ code: "BALANCE_EXCEEDED", message: "server prose" })));
    expect(screen.getByRole("alert")).toHaveTextContent(en["error.balanceExceeded"]);
    expect(screen.queryByText(/server prose/)).not.toBeInTheDocument();
  });

  it("falls back for an unmapped failure", () => {
    setup();
    act(() => toast.showError(new TypeError("Failed to fetch")));
    expect(screen.getByRole("alert")).toHaveTextContent(en["error.generic"]);
  });

  it("retranslates an open error toast when the language changes", () => {
    setup();
    act(() => toast.showError(new ApiError({ code: "NOT_FOUND" })));
    expect(screen.getByRole("alert")).toHaveTextContent(en["error.notFound"]);
    act(() => lang.setLang("es"));
    expect(screen.getByRole("alert")).toHaveTextContent(es["error.notFound"]);
  });

  it("keeps showError stable across a language change", () => {
    setup();
    const before = toast.showError;
    act(() => lang.setLang("es"));
    expect(toast.showError).toBe(before);
  });

  it("stacks multiple toasts", () => {
    setup();
    act(() => {
      toast.showToast({ message: "one" });
      toast.showToast({ message: "two" });
    });
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });

  // Removal is asynchronous: framer-motion holds the node through its exit
  // animation, so both dismiss paths need waitForElementToBeRemoved.
  it("dismisses manually", async () => {
    setup();
    let id;
    act(() => { id = toast.showToast({ message: "bye" }); });
    act(() => toast.dismiss(id));
    await waitForElementToBeRemoved(() => screen.queryByText("bye"));
  });

  // Real timers with a short delay: fake timers stall framer-motion's exit
  // animation, so the node never actually leaves the DOM.
  it("auto-dismisses on the timer", async () => {
    setup(20);
    act(() => toast.showToast({ message: "fleeting" }));
    expect(screen.getByText("fleeting")).toBeInTheDocument();
    await waitForElementToBeRemoved(() => screen.queryByText("fleeting"));
  });
});
