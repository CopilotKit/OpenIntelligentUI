export type DemoCategory = "Understand" | "Compare" | "Make a tool";

export interface DemoItem {
  id: string;
  title: string;
  description: string;
  category: DemoCategory;
  emoji: string;
  prompt: string;
}

export const DEMO_EXAMPLES: DemoItem[] = [
  {
    id: "bicycle",
    title: "A bicycle, explained",
    category: "Understand",
    emoji: "↗",
    description: "Explore the small mechanics behind a big idea.",
    prompt:
      "Explain how a bicycle's gears work with an interactive diagram. Let me change the gear ratio and see how pedal turns relate to wheel turns. Label the simplified assumptions and keep the controls usable on mobile.",
  },
  {
    id: "probability",
    title: "Make probability click",
    category: "Understand",
    emoji: "◌",
    description: "Run the experiment. See the pattern emerge.",
    prompt:
      "Help me understand the Monty Hall problem with a simulation. Let me compare always staying versus always switching over repeated trials, explain the host's rules, and label simulated results separately from theoretical probabilities.",
  },
  {
    id: "trip",
    title: "Find your kind of weekend",
    category: "Compare",
    emoji: "⌁",
    description: "Balance time, budget, and a little adventure.",
    prompt:
      "Help me compare a coastal, city, and mountain weekend for two. Build an interactive comparison with adjustable budget and travel-time preferences. Use clearly labeled illustrative estimates, not live prices, and explain how the recommendation changes.",
  },
  {
    id: "meal",
    title: "Dinner, minus the guesswork",
    category: "Make a tool",
    emoji: "✳",
    description: "A menu and shopping list that scale with you.",
    prompt:
      "Make a vegetarian dinner planner for friends. Let me change the guest count from 2 to 12 and recalculate ingredient quantities. Include a preparation checklist, flag allergens, and explain any quantities that do not scale linearly.",
  },
  {
    id: "split",
    title: "Split the bill fairly",
    category: "Make a tool",
    emoji: "÷",
    description: "Change the numbers. Settle it in seconds.",
    prompt:
      "Build a bill splitter with editable subtotal, tip percentage, and number of people. Show the total and each person's share, validate inputs, and allocate rounding cents so all shares sum to the exact total. Do not imply that any payment is sent.",
  },
];

export const DEMO_CATEGORIES: DemoCategory[] = [
  "Understand",
  "Compare",
  "Make a tool",
];
