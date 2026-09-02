export type OpenArvaMode = 'design' | 'edu' | 'dev';

const modeAliases: Record<string, OpenArvaMode> = {
  design: 'design',
  graphics: 'design',
  edu: 'edu',
  education: 'edu',
  academic: 'edu',
  dev: 'dev',
  developer: 'dev',
  enterprise: 'dev',
};

const modeProfiles: Record<OpenArvaMode, { label: string; capabilities: string[]; instruction: string }> = {
  design: {
    label: 'Design & Graphics',
    capabilities: ['UI/UX wireframes', 'image and graphic prompts', 'SVG assets', 'CSS/Tailwind layouts', 'design system specifications'],
    instruction: 'Act as a senior product designer. Produce accessible UI/UX wireframes, visual prompts, SVG or CSS assets, and a concise design system when relevant.',
  },
  edu: {
    label: 'Education & Academics',
    capabilities: ['lesson plans', 'interactive quizzes', 'research summaries', 'step-by-step problem solving', 'essay feedback'],
    instruction: 'Act as a patient educator and academic coach. Explain reasoning step by step, adapt to the learner level, and produce lesson plans, quizzes, research summaries, or constructive essay feedback as requested.',
  },
  dev: {
    label: 'Developer & Enterprise',
    capabilities: ['code generation', 'automated refactoring', 'git commit creation', 'vulnerability scanning', 'API documentation'],
    instruction: 'Act as a principal software engineer. Return production-ready code, precise refactoring plans, security findings, commit messages, and API documentation with validation steps.',
  },
};

export function resolveMode(value = '') {
  return modeAliases[value.trim().toLowerCase()];
}

export function renderMode(mode: OpenArvaMode) {
  const profile = modeProfiles[mode];
  console.log(`OpenArva mode: ${profile.label}`);
  console.log(`Capabilities: ${profile.capabilities.join(' | ')}`);
}

export function getModeInstruction(mode: OpenArvaMode, instruction: string) {
  return `${modeProfiles[mode].instruction}\n\nUser request:\n${instruction}`;
}
