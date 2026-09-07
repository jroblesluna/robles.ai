// Known temporary/disposable email domains, blocked on the quiz lead form.
// Corporate and major provider domains are NOT in this list — only throwaway inbox services.
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.info", "guerrillamail.biz",
  "guerrillamail.de", "guerrillamail.net", "guerrillamail.org", "sharklasers.com",
  "10minutemail.com", "10minutemail.net", "10minutemail.co.za", "20minutemail.com",
  "temp-mail.org", "tempmail.com", "tempmail.net", "tempmail.de", "temp-mail.io",
  "tempmailo.com", "tempinbox.com", "throwawaymail.com", "trashmail.com", "trashmail.net",
  "trash-mail.com", "yopmail.com", "yopmail.net", "yopmail.fr", "getnada.com",
  "mailnesia.com", "mailnull.com", "maildrop.cc", "mailcatch.com", "mail-temporaire.fr",
  "moakt.com", "mohmal.com", "dispostable.com", "fakeinbox.com", "fakemailgenerator.com",
  "spamgourmet.com", "spam4.me", "mytemp.email", "emailondeck.com", "mintemail.com",
  "mailinator.net", "mailinator.org", "mailinator2.com", "sogetthis.com", "thankyou2010.com",
  "burnermail.io", "emailfake.com", "inboxbear.com", "tempr.email", "discard.email",
  "discardmail.com", "getairmail.com", "harakirimail.com", "jetable.org", "kasmail.com",
  "mailexpire.com", "mailforspam.com", "mailtemporaire.fr", "nowmymail.com", "objectmail.com",
  "onewaymail.com", "pookmail.com", "rcpt.at", "spambog.com", "spamex.com", "spamfree24.org",
  "spamobox.com", "tempemail.co", "tempemail.net", "tempmail2.com", "tmail.ws", "tmpmail.org",
  "tmpmail.net", "tmpeml.com", "wegwerfmail.de", "wegwerfmail.net", "wegwerfmail.org",
  "einrot.com", "fleckens.hu", "trbvm.com", "guerrillamailblock.com", "0-mail.com",
  "e4ward.com", "emailtemporario.com.br", "fakemail.net", "meltmail.com", "mytrashmail.com",
  "no-spam.ws", "nospam.ze.tc", "nowhere.org", "putthisinyourspamdatabase.com",
  "safe-mail.net", "sneakemail.com", "spamavert.com", "spambob.com", "spamcannon.com",
  "spamcorptastic.com", "spamday.com", "spamherelots.com", "spamhereplease.com",
  "spamhole.com", "spamify.com", "spaml.de", "spamslicer.com", "spamstack.net",
  "supergreatmail.com", "tempalias.com", "tempe-mail.com", "tempomail.fr", "tempymail.com",
  "veryrealemail.com", "yeahwhatever.com", "shitmail.me", "luxusmail.org", "correotemporal.org",
  "correo-temporal.com", "usa.cc", "bccto.me", "chacuo.net", "crazymailing.com",
  "deadaddress.com", "letthemeatspam.com", "mt2015.com", "owlpic.com", "tempinbox.co.uk",
  "armyspy.com", "cuvox.de", "dayrep.com", "einrot.de", "gustr.com", "jourrapide.com",
  "rhyta.com", "superrito.com", "teleworm.us",
]);

export function isDisposableEmailDomain(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}
