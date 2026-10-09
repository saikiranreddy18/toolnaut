// Activation checklist: the fixed set of "are you actually using this" steps,
// computed from stores that already exist — no new persistence beyond the
// dismiss flag the component itself owns.
import { loadQuiz } from '../state/quizStore'
import { loadStack } from '../state/stackStore'
import { loadRoadmapProgress, isStepDone } from '../state/roadmapStore'
import { hasPostedThread } from '../state/communityStore'
import { generateRoadmap } from './roadmapGenerator'

function anyRoadmapStepDone(progress) {
  const roadmap = generateRoadmap()
  return (roadmap?.milestones || []).some((m) =>
    (m.steps || []).some((_, i) => isStepDone(progress, m.id, i))
  )
}

export function getOnboardingSteps() {
  const roadmapProgress = loadRoadmapProgress()
  return [
    {
      id: 'quiz',
      label: 'Take the quiz',
      done: Boolean(loadQuiz().completed),
      href: '/goal',
    },
    {
      id: 'first_tool',
      label: 'Add a tool in Find',
      done: loadStack().length > 0,
      href: '/app/discover',
    },
    {
      id: 'roadmap_step',
      label: 'Check off a roadmap step',
      done: anyRoadmapStepDone(roadmapProgress),
      href: '/app/learning',
    },
    {
      id: 'community',
      label: 'Post in Community',
      done: hasPostedThread(),
      href: '/app/community',
    },
  ]
}
