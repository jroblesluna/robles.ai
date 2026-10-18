/** Keep the public team selection identical in the SPA and initial HTML. */
export function visibleTeamMembers<T extends { name: string }>(members: T[]): T[] {
  return members.filter(member => member.name !== 'Sophia Martinez');
}

/** Existing public contact details, shared to avoid a separate no-JS copy. */
export const PUBLIC_CONTACT = {
  email: 'info@robles.ai',
  phone: '+1 (408) 590-0153',
  phoneHref: 'tel:+14085900153',
  street: '20380 Stevens Creek Blvd, Suite 205',
  city: 'Cupertino, CA 95014',
};

/** The same first hero image is discoverable in initial HTML and reused by React. */
export const HOME_HERO_IMAGE = '/robly-avatar/robly-hero-static.svg';
