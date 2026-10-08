import { useEffect } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  A2UIProvider,
  A2UIRenderer,
  useA2UIActions,
} from "@copilotkit/a2ui-renderer";
import { DataTable, tableCatalog } from "./table-catalog";

afterEach(cleanup);
const props = {
  title: "Quarterly sales",
  columns: ["Quarter", "Sales"],
  rows: [
    ["Q1", "$100"],
    ["Q2", "$200"],
  ],
  source: "User-provided data",
};
function Surface() {
  const { processMessages } = useA2UIActions();
  useEffect(() => {
    processMessages([
      {
        createSurface: {
          surfaceId: "test",
          catalogId: "copilotkit://open-generative-ui-tables",
        },
      },
      {
        updateComponents: {
          surfaceId: "test",
          components: [{ id: "root", component: "Table", ...props }],
        },
      },
    ]);
  }, [processMessages]);
  return <A2UIRenderer surfaceId="test" />;
}
describe("A2UI table catalog", () => {
  it("renders real A2UI operations through the catalog", async () => {
    render(
      <A2UIProvider catalog={tableCatalog}>
        <Surface />
      </A2UIProvider>,
    );
    expect(
      await screen.findByRole("table", { name: "Quarterly sales" }),
    ).toBeTruthy();
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getByText("$200")).toBeTruthy();
    expect(screen.getByText("User-provided data")).toBeTruthy();
  });
  it("rejects mismatched rows instead of mislabeling data", () => {
    render(<DataTable props={{ ...props, rows: [["Q1"]] }} />);
    expect(screen.getByRole("alert").textContent).toContain("invalid rows");
  });
  it("renders untrusted values as text", () => {
    const { container } = render(
      <DataTable
        props={{ ...props, rows: [["<script>alert(1)</script>", "100"]] }}
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("<script>alert(1)</script>")).toBeTruthy();
  });
});
