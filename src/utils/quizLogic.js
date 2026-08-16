// Onboarding quiz — 9 questions. `id` is the answer key; `key` on each option is
// what the engine reads. Every question feeds persona + tool allocation + the
// learning roadmap (see personaGenerator.js and roadmapGenerator.js):
//   domain        -> tool category + starter stack
//   role          -> career-accurate persona noun
//   career_stage  -> persona flavor + suggested plan tier
//   experience    -> lesson difficulty + level badge
//   goal          -> persona tagline + capstone week
//   budget        -> suggested plan
//   pace          -> roadmap length (steps per week)
//   learning_style-> per-week "how you learn best" tip
//   blocker       -> personalized reassurance line
export const QUESTIONS = [
  {
    id: 'domain',
    text: "You're building something new. What's your playground?",
    options: [
      { key: 'code', label: 'Code & Apps' },
      { key: 'design', label: 'Design & Media' },
      { key: 'writing', label: 'Words & Content' },
      { key: 'data', label: 'Data & Insights' },
      { key: 'automation', label: 'Automation & Workflows' },
      { key: 'learning', label: 'Learning & Teaching' },
    ],
  },
  {
    id: 'role',
    text: 'Which one sounds most like you?',
    options: [
      { key: 'student', label: 'Student / Learner' },
      { key: 'developer', label: 'Developer / Engineer' },
      { key: 'designer', label: 'Designer / Creative' },
      { key: 'creator', label: 'Writer / Marketer' },
      { key: 'founder', label: 'Founder / Entrepreneur' },
      { key: 'manager', label: 'Manager / Product' },
      { key: 'analyst', label: 'Analyst / Researcher' },
    ],
  },
  {
    id: 'career_stage',
    text: 'Where are you on your journey?',
    options: [
      { key: 'exploring', label: 'Exploring / switching' },
      { key: 'early', label: 'Early — 0 to 2 yrs' },
      { key: 'mid', label: 'Mid — 3 to 6 yrs' },
      { key: 'senior', label: 'Senior / Lead' },
      { key: 'founder', label: 'Running my own thing' },
    ],
  },
  {
    id: 'experience',
    text: 'Experience level with AI tools?',
    options: [
      { key: 'beginner', label: 'Total beginner' },
      { key: 'dabbler', label: 'Tried ChatGPT' },
      { key: 'regular', label: 'Use 2–3 tools regularly' },
      { key: 'builder', label: 'Building with AI' },
      { key: 'teacher', label: 'Teaching others' },
    ],
  },
  {
    id: 'goal',
    text: 'In 3 months, you want to...',
    options: [
      { key: 'ship', label: 'Ship a side project' },
      { key: 'job', label: 'Get a better job' },
      { key: 'time', label: 'Save time at work' },
      { key: 'freelance', label: 'Start freelancing' },
      { key: 'lead', label: 'Lead a team' },
    ],
  },
  {
    id: 'budget',
    text: 'Your current AI tool budget?',
    options: [
      { key: 'free', label: '$0 — free only' },
      { key: 'low', label: '$1–10/month' },
      { key: 'mid', label: '$10–50/month' },
      { key: 'high', label: '$50+/month' },
      { key: 'company', label: 'My company pays' },
    ],
  },
  {
    id: 'pace',
    text: 'Time you can invest each week?',
    options: [
      { key: 'micro', label: 'Under 1 hr' },
      { key: 'light', label: '1–2 hrs' },
      { key: 'steady', label: '3–5 hrs' },
      { key: 'deep', label: '5+ hrs' },
    ],
  },
  {
    id: 'learning_style',
    text: 'When you hit a wall, you usually...',
    options: [
      { key: 'search', label: 'Google it' },
      { key: 'tutorial', label: 'Watch a tutorial' },
      { key: 'ask', label: 'Ask a friend' },
      { key: 'tinker', label: 'Break it to learn it' },
      { key: 'course', label: 'Take a course' },
    ],
  },
  {
    id: 'blocker',
    text: "What's slowing you down most?",
    options: [
      { key: 'notime', label: 'Not enough time' },
      { key: 'toomany', label: 'Too many tools to pick' },
      { key: 'skills', label: 'A skills gap' },
      { key: 'cost', label: 'Cost' },
      { key: 'noplan', label: 'No clear plan' },
    ],
  },
]
