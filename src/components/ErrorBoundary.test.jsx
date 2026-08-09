import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "../i18n/index.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { reportError } from "../lib/reportError.js";
import en from "../i18n/en.json";

vi.mock("../lib/reportError.js", () => ({ reportError: vi.fn() }));

function Boom() {
  throw new Error("render exploded");
}

function renderIn(children) {
  return render(
    <I18nProvider>
      <ErrorBoundary>{children}</ErrorBoundary>
    </I18nProvider>
  );
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    localStorage.setItem("app-language", "en");
    // React logs the caught error itself; keep the test output readable.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("renders its children when nothing throws", () => {
    renderIn(<p>all good</p>);
    expect(screen.getByText("all good")).toBeInTheDocument();
  });

  it("renders the translated fallback when a child throws", () => {
    renderIn(<Boom />);
    expect(screen.getByText(en["error.boundaryTitle"])).toBeInTheDocument();
    expect(screen.getByText(en["error.boundaryBody"])).toBeInTheDocument();
  });

  it("offers a working reload action", async () => {
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload },
    });
    renderIn(<Boom />);
    screen.getByRole("button", { name: en["error.reload"] }).click();
    expect(reload).toHaveBeenCalledOnce();
  });

  it("routes the error through the single reporting hook", () => {
    renderIn(<Boom />);
    expect(reportError).toHaveBeenCalled();
    expect(reportError.mock.calls[0][0].message).toBe("render exploded");
  });
});
