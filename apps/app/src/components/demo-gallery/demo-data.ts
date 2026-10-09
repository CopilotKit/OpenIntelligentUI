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
    id: "demo-pitch-roll-yaw",
    title: "Pitch, Roll & Yaw",
    category: "Understand",
    emoji: "✈",
    description: "Rotate a 3D airplane and explore its three axes of motion.",
    prompt:
      "Create an interactive 3D airplane in Three.js that explains pitch, roll, and yaw. Make the airplane recognizable with a fuselage, wings, tail and cockpit, on a clean light background. Start with a three-quarter view. Give each axis a labeled slider with its angle and a button that smoothly demonstrates that motion, plus a Reset button. Show color-coded labeled axes through the plane: pitch raises or lowers the nose about the lateral axis, roll banks the wings about the longitudinal axis, and yaw turns the nose left or right about the vertical axis. Match each label, control and rotation correctly. Animate demonstrations over about 1.5 seconds, keep the camera stable during demonstrations, and let me drag to orbit the camera. Include one short explanation per axis. Keep the canvas compact enough that the controls are visible in chat. Respect reduced motion and show a readable error if WebGL cannot initialize. This is a conceptual rotation model, not a flight simulator.",
  },
  {
    id: "map",
    title: "Animate a coastal trip",
    category: "Understand",
    emoji: "⌖",
    description: "Select a landmark and explore its surroundings.",
    prompt:
      "Plan an illustrative four-day coastal trip from San Francisco to Los Angeles, stopping at Half Moon Bay, Santa Cruz, Monterey, and Santa Barbara. Show a real map with numbered pins and photo cards. Pin the numbered dots onto the map one by one over 6 seconds: each dot drops gently into place with a small spring settle, then stays. Reveal connecting segments behind the pins and highlight the corresponding card. Keep the map camera still; do not animate a traveler along the route. Include pause, replay and clickable stop cards. Use live USGS tiles and sourced photos; label the connecting line as an itinerary sketch, not verified driving directions.",
  },
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
