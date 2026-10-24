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
  /** Default calendar booking page (Google Calendar appointment schedule); Admin → Settings `booking_url` overrides it. */
  bookingUrl: 'https://calendar.app.google/oR9yeJveKiKpBqF49',
};

/** Offices shown as "local presence" (labels are translated in i18n `presence`). */
export const PUBLIC_OFFICES = [
  { id: 'us', street: '20380 Stevens Creek Blvd, Suite 205', city: 'Cupertino, CA 95014', country: 'US' },
  { id: 'pe', street: 'Calle Cuarenta 190, San Isidro', city: 'Lima', country: 'PE' },
] as const;

/**
 * Client logos shown on the home page and /get-started (files in public/images/clients/).
 * Companies and public institutions the team has delivered enterprise software for since 2011.
 * Shared so the SPA and the crawler HTML list the same names.
 */
export const CLIENT_LOGOS: ReadonlyArray<{ name: string; file: string; large?: boolean }> = [
  { name: 'Interbank', file: 'interbank.webp' },
  { name: 'BBVA', file: 'bbva.svg' },
  { name: 'BCP', file: 'bcp.webp' },
  { name: 'Scotiabank', file: 'scotiabank.svg' },
  { name: 'SUNAT', file: 'sunat.webp' },
  { name: 'Banco de la Nación', file: 'banco-de-la-nacion.webp' },
  { name: 'Mibanco', file: 'mibanco.webp', large: true },
  { name: 'Banco Falabella', file: 'banco-falabella.webp' },
  { name: 'Ripley', file: 'ripley.webp' },
  { name: 'El Comercio', file: 'el-comercio.webp' },
  { name: 'Chem Supply', file: 'chem-supply.webp', large: true },
  { name: 'MasterCook', file: 'mastercook.webp', large: true },
  { name: 'Xerox', file: 'xerox.svg' },
  { name: 'Lexmark', file: 'lexmark.svg' },
  { name: 'Caja Piura', file: 'caja-piura.webp' },
  { name: 'Financiera ProEmpresa', file: 'financiera-proempresa.webp' },
  { name: 'Financiera Efectiva', file: 'financiera-efectiva.webp' },
];
