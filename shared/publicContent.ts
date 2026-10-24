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

/**
 * Client logos shown on the home page and /get-started (files in public/images/clients/).
 * Clients of the team's enterprise software work (Inversiones On Line · Sistemas Perú) since 2011.
 * Shared so the SPA and the crawler HTML list the same names.
 */
export const CLIENT_LOGOS: ReadonlyArray<{ name: string; file: string }> = [
  { name: 'Interbank', file: 'interbank.webp' },
  { name: 'BBVA', file: 'bbva.webp' },
  { name: 'Scotiabank', file: 'scotiabank.svg' },
  { name: 'Xerox', file: 'xerox.svg' },
  { name: 'Lexmark', file: 'lexmark.svg' },
  { name: 'BCP', file: 'bcp.webp' },
  { name: 'El Comercio', file: 'el-comercio.webp' },
  { name: 'Banco Falabella', file: 'banco-falabella.webp' },
  { name: 'Ripley', file: 'ripley.webp' },
  { name: 'Caja Piura', file: 'caja-piura.webp' },
  { name: 'Financiera ProEmpresa', file: 'financiera-proempresa.webp' },
  { name: 'Financiera Edyficar', file: 'financiera-edyficar.webp' },
  { name: 'Financiera Efectiva', file: 'financiera-efectiva.webp' },
];
