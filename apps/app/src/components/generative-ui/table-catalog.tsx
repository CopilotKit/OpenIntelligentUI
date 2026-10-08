"use client";

import { createCatalog } from "@copilotkit/a2ui-renderer";
import { z } from "zod";

export const TableProps = z.object({
  title: z.string().max(300),
  columns: z.array(z.string().max(200)).min(1).max(12),
  rows: z.array(z.array(z.string().max(2000)).max(12)).max(200),
  source: z
    .string()
    .max(1000)
    .describe(
      "Data provenance: user-provided, calculated, sourced, or explicitly illustrative.",
    ),
});

export function DataTable({ props }: { props: z.infer<typeof TableProps> }) {
  const parsed = TableProps.safeParse(props);
  if (
    !parsed.success ||
    parsed.data.rows.some((row) => row.length !== parsed.data.columns.length)
  ) {
    return (
      <p role="alert">
        This table has invalid rows or columns. Ask the assistant to regenerate
        it.
      </p>
    );
  }
  const { title, columns, rows, source } = parsed.data;
  return (
    <section className="answer-table" aria-label={title}>
      <div
        className="answer-table-scroll"
        role="region"
        aria-label={`${title} table`}
        tabIndex={0}
      >
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th key={index} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, column) => (
                  <td key={column}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p>No rows to display.</p>}
      </div>
      <p className="answer-table-source">{source}</p>
    </section>
  );
}

export const tableCatalog = createCatalog(
  {
    Table: {
      props: TableProps,
      description:
        "An accessible basic data table. Every row must match the columns. Use exact values and label data provenance.",
    },
  },
  { Table: DataTable },
  { catalogId: "copilotkit://open-generative-ui-tables" },
);
