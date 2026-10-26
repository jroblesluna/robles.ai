/** Stable public course identifiers and estimated workload, shared with mail validation. */
export const COURSE_IDS = ['pytorch-deep-learning', 'tensorflow-production', 'hugging-face-transformers', 'langchain-development', 'openai-generative-ai', 'pytorch-computer-vision'] as const;
export type CourseId = typeof COURSE_IDS[number];
export const COURSE_CATALOG: Record<CourseId, { title: string; weeks: number; liveHoursPerWeek: number; practiceHoursPerWeek: number }> = {
  'pytorch-deep-learning': { title: 'PyTorch Deep Learning', weeks: 10, liveHoursPerWeek: 4, practiceHoursPerWeek: 3 },
  'tensorflow-production': { title: 'TensorFlow for Production', weeks: 12, liveHoursPerWeek: 4, practiceHoursPerWeek: 4 },
  'hugging-face-transformers': { title: 'Hugging Face Transformers', weeks: 8, liveHoursPerWeek: 4, practiceHoursPerWeek: 3 },
  'langchain-development': { title: 'LangChain Development', weeks: 6, liveHoursPerWeek: 4, practiceHoursPerWeek: 4 },
  'openai-generative-ai': { title: 'Generative AI with OpenAI', weeks: 8, liveHoursPerWeek: 3, practiceHoursPerWeek: 3 },
  'pytorch-computer-vision': { title: 'Computer Vision with PyTorch', weeks: 12, liveHoursPerWeek: 4, practiceHoursPerWeek: 4 },
};
export const COURSE_TIME_ZONE = 'America/Los_Angeles';
export function courseWorkload(id: CourseId) {
  const course = COURSE_CATALOG[id];
  const weeklyHours = course.liveHoursPerWeek + course.practiceHoursPerWeek;
  return { ...course, weeklyHours, totalHours: course.weeks * weeklyHours, totalLiveHours: course.weeks * course.liveHoursPerWeek };
}
/** Calendar dates, not timestamps: at least 14 whole calendar days of notice. */
export function nextCourseStart(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: COURSE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value);
  const year = value('year');
  const today = Date.UTC(year, value('month') - 1, value('day'));
  for (let y = year; y <= year + 2; y++) for (const month of [0, 3, 6, 9]) {
    const first = new Date(Date.UTC(y, month, 1));
    const offset = (8 - first.getUTCDay()) % 7;
    const monday = first.getTime() + offset * 86400000;
    if ((monday - today) / 86400000 >= 14) return new Date(monday).toISOString().slice(0, 10);
  }
  throw new Error('Unable to calculate next course start');
}
