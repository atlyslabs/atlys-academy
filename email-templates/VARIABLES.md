# Email variable convention

Each template numbers its own variables from `{{1}}`, in order of first appearance across the subject and then the body. Numbering restarts at 1 for every email, so `{{1}}` in one template is unrelated to `{{1}}` in another.

Within a template, a subject and body variable with the same number carry the same value.

---

## 1. Pickup intimation
`01-pickup-intimation.html`

Subject: Documents to keep ready for pickup on {{1}}
Preview text: More than just your passport - here's the full list.

```
{{1}}   Pickup date             Human-readable, no year. Never ISO.
{{2}}   First name              Guest's first name. Plain text, title case.
{{3}}   Country                 Destination country, display name. Use South Korea, never
                                Korea or KR.
{{4}}   Pickup documents list   One document per line. Must render as <li> elements.
```

## 2. Pickup reminder
`02-pickup-reminder.html`

Subject: Your document pickup - final checklist
Preview text: Everything to have in hand when our agent arrives.

```
{{1}}   First name              Guest's first name. Plain text, title case.
{{2}}   Pickup date             Human-readable, no year. Never ISO.
{{3}}   Pickup time phrase      Renders with a leading comma and space. Resolves to an empty
                                string when no slot exists.
{{4}}   Pickup documents list   One document per line. Must render as <li> elements.
```

## 3. Leave letter, employer
`03-leave-letter-employer.html`

Subject: Leave letter request for {{1}}'s {{2}} visa application
Preview text: A sample letter is attached for reference.

```
{{1}}   Applicant name          Full name as on the passport, title case. Never first name only.
{{2}}   Country                 Destination country, display name. Use South Korea, never
                                Korea or KR.
{{3}}   Recipient name          HR contact or reporting manager. Honorific and surname where
                                known. Falls back to HR Team.
{{4}}   Travel start date       Human-readable, no year. Never ISO.
{{5}}   Travel end date         Same format as the start date.
```

## 4. Leave letter, college
`04-leave-letter-college.html`

Subject: Leave letter request for {{1}}'s {{2}} visa application
Preview text: A sample letter is attached for reference.

```
{{1}}   Applicant name          Full name as on the passport, title case. Never first name only.
{{2}}   Country                 Destination country, display name. Use South Korea, never
                                Korea or KR.
{{3}}   Recipient name          Head of department, dean, or registrar. Honorific and surname
                                where known. Falls back to Sir or Madam.
{{4}}   Institution name        College name, as the institution writes it.
{{5}}   Travel start date       Human-readable, no year. Never ISO.
{{6}}   Travel end date         Same format as the start date.
```

## 5. Leave letter, school
`05-leave-letter-school.html`

Subject: Leave letter request for {{1}}'s {{2}} visa application
Preview text: A sample letter is attached for reference.

```
{{1}}   Applicant name          Student's full name as on the passport, title case.
{{2}}   Country                 Destination country, display name. Use South Korea, never
                                Korea or KR.
{{3}}   Recipient name          School office, class teacher, or principal. Honorific and
                                surname where known. Falls back to School Office.
{{4}}   Guardian name           Parent or guardian on the account. Full name, title case.
{{5}}   Institution name        School name, as the school writes it.
{{6}}   Travel start date       Human-readable, no year. Never ISO.
{{7}}   Travel end date         Same format as the start date.
```

The letter is sent on the guardian's behalf, so the sign-off reads `On behalf of {{4}}`, not the student.

## 6. Sponsorship letter
`06-sponsorship-letter.html`

Subject: Sponsorship letter request for {{1}}'s {{2}} visa application
Preview text: A sample letter is attached for reference.

```
{{1}}   Applicant name          Full name as on the passport, title case. Never first name only.
{{2}}   Country                 Destination country, display name. Use South Korea, never
                                Korea or KR.
{{3}}   Recipient name          The named sponsor. Honorific and surname where known.
                                Falls back to Sir or Madam.
{{4}}   Travel start date       Human-readable, no year. Never ISO.
{{5}}   Travel end date         Same format as the start date.
```

## 7. Invitation letter
`07-invitation-letter.html`

Subject: Invitation letter request for {{1}}'s {{2}} visa application
Preview text: A sample letter is attached for reference.

```
{{1}}   Applicant name          Full name as on the passport, title case. Never first name only.
{{2}}   Country                 Destination country, display name. Use South Korea, never
                                Korea or KR.
{{3}}   Recipient name          The named host in the destination country. Honorific and
                                surname where known. Falls back to Sir or Madam.
{{4}}   Travel start date       Human-readable, no year. Never ISO.
{{5}}   Travel end date         Same format as the start date.
```

---

## Attachments and CC

```
Email 3   Employer leave letter sample     CC the applicant
Email 4   College leave letter sample      CC the applicant
Email 5   School leave letter sample       CC the guardian, not the student
Email 6   Sponsorship letter sample        CC the applicant
Email 7   Invitation letter sample         CC the applicant
```

Every sample must be an editable file, not a flat image or a locked PDF.
Emails 1 and 2 carry no attachment.
