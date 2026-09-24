# Atlys physical document emails

Seven transactional email templates: two telling a guest what originals to have ready for pickup, five requesting a supporting document from a third party on the applicant's behalf.

```
01-pickup-intimation.html        Sent on payment success
02-pickup-reminder.html          Sent 12 hours before the pickup slot
03-leave-letter-employer.html    Sent to the applicant's employer
04-leave-letter-college.html     Sent to the applicant's college
05-leave-letter-school.html      Sent to a student applicant's school
06-sponsorship-letter.html       Sent to the named sponsor
07-invitation-letter.html        Sent to the named host
VARIABLES.md                     Variable numbering, subjects, preview text, CC and attachments
preview/                         The same seven with sample values filled in, openable in a browser
```

## Variables

Numbered per template, contiguous from `{{1}}`, in order of first appearance across the subject and then the body. See [VARIABLES.md](VARIABLES.md).

## Design

Built on the Atlys production email template and design system.

```
Type        Inter for text, DM Serif Display standing in for Denton on headings
Body        14px / 22px, weight 500, tracking -0.01em, #5C6670
Accent      brand-blue-500 #5057EA, with #f1f2fd and #dcddfb tints
Gradient    #B165FD to #5057EA to #373ed0, the rule from the wordmark
Container   600px, 10px radius, on #f3f3f3
```

## Assets

Both images are already hosted and live. Nothing to upload.

```
https://media.atlys.com/b2c/apps/E-sim/esim_email_header.png        desktop header
https://media.atlys.com/b2c/apps/E-sim/esim_email_header_mweb.png   mobile header
```

## Client support

Light mode is declared explicitly through `color-scheme` and there is no dark-mode block, so no client repaints these with black panels. Outlook gets its own conditional wrapper and falls back to a solid brand-blue edge where it cannot render the gradient. Layout is table-based with inline styles throughout, and collapses to a single column below 620px.

Headings degrade to Georgia where DM Serif Display cannot load, which is the fallback the Atlys design system already specifies for Denton.
