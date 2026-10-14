import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MeetingTimePicker } from "./meeting-time-picker";
afterEach(cleanup);
it("does not confirm or decline a meeting without a response channel", () => {
  render(<MeetingTimePicker status="executing" />);
  const options = screen.getAllByRole("button");
  for (const option of options) expect(option).toBeDisabled();
  fireEvent.click(options[0]);
  expect(screen.queryByText("Meeting Scheduled")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("None of these work"));
  expect(screen.queryByText("No Time Selected")).not.toBeInTheDocument();
});
it("enables selection when a response channel becomes available", () => {
  const respond = vi.fn();
  const view = render(<MeetingTimePicker status="executing" />);
  view.rerender(<MeetingTimePicker status="executing" respond={respond} meetingDuration={45} />);
  const option = screen.getByRole("button", { name: /Tomorrow/ });
  expect(option).toBeEnabled();
  fireEvent.click(option);
  expect(respond).toHaveBeenCalledExactlyOnceWith("Meeting scheduled for Tomorrow at 2:00 PM (45 min).");
  expect(screen.getByText("Meeting Scheduled")).toBeInTheDocument();
});
it("submits an available decline response once", () => {
  const respond = vi.fn();
  render(<MeetingTimePicker status="executing" respond={respond} />);
  fireEvent.click(screen.getByText("None of these work"));
  expect(respond).toHaveBeenCalledTimes(1);
  expect(screen.getByText("No Time Selected")).toBeInTheDocument();
});
