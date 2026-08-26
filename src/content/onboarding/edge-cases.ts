import type { MockScenario } from "./types";

/**
 * Day 3 · The four situations that break the normal flow (lesson 3.8).
 *
 * Same shape as `MOCK_SCENARIOS`, because it is the same interaction: read the
 * situation, pick the reply, hear what the guest says back. What differs is
 * what is being tested. The Day 2 scenarios test whether you can answer well.
 * These test whether you can tell that answering is the wrong move.
 *
 * 3.8's own framing: "these are the moments where the standard playbook
 * produces the wrong answer, so the instruction is to escalate early and commit
 * only to what you control." Every foil below is the standard playbook run at
 * the wrong moment - ownership, diagnosis, a considered reply - which is why
 * the lesson names the failure as "Trying to solve the emergency yourself
 * because ownership has been drilled into you."
 *
 * The airport case is first because the lesson says it is the one to have
 * rehearsed.
 */
export const EDGE_CASE_SCENARIOS: readonly MockScenario[] = [
  {
    id: "edge.airport_denied",
    label: "Denied check-in at the airport",
    context:
      "Inbound call. Background noise, an announcement, someone else talking over them. Their flight is in two hours.",
    customerMessage:
      "They won't let me check in. They're saying something about my visa. I'm at the counter right now, what do I do?",
    replies: [
      {
        id: "edge.airport.a",
        text: "Let me pull up your case in Cadence and see exactly what's on file — bear with me one moment.",
        outcome: "deepens",
        customerResponse:
          "They're telling me to step aside, the queue's behind me. How long is this going to take?",
        feedback:
          "Everything about this case fights the habits you have built. Look it up in Cadence is the right instinct on every other call and the wrong one here: this is a genuine emergency and not a process flow, and you have just spent the first of sixty seconds on research that the Emergency team will redo.",
      },
      {
        id: "edge.airport.b",
        text: "I'm putting you through to our Emergency Helpline right now — they own exactly this and they're faster than I am. I'm staying on the line with you until they pick up. Don't hang up.",
        outcome: "closes",
        customerResponse:
          "Okay. Okay. I'm still here — someone just came on the line.",
        feedback:
          "Correct on all four counts: no hold, under sixty seconds, the fastest possible handover to the team whose job it is, and you stay on the call until the handover is confirmed. Ownership here means making sure the guest is covered, not being the one who fixes it. Afterwards: document what they said, what the denial reason was and what you did, then follow up with both the guest and the Emergency team within two hours.",
      },
      {
        id: "edge.airport.c",
        text: "I'm so sorry this is happening. Let me take the details and I'll call you back within two hours with a fix.",
        outcome: "deepens",
        customerResponse: "Two hours? My flight leaves in two hours.",
        feedback:
          "Warm, specific, time-bound — and useless. A commitment that carries a time is the standard everywhere else; here it leaves a distressed person with no live contact for the only two hours that matter.",
      },
    ],
  },
  {
    id: "edge.overstay",
    label: "A prior overstay comes up",
    context:
      "Inbound chat. A Schengen enquiry that has been going well for ten minutes.",
    customerMessage:
      "Oh — one thing. I overstayed in Dubai by two days back in 2019. Family emergency. That won't matter for this, right?",
    replies: [
      {
        id: "edge.overstay.a",
        text: "Different country, different authority — a UAE overstay from 2019 won't affect a Schengen application. You're fine.",
        outcome: "deepens",
        customerResponse:
          "Great, that's a relief. So I don't need to mention it anywhere on the form?",
        feedback:
          "Two failures in one sentence. You guessed on the one thing the lesson says not to guess on, and you have now walked the guest towards not declaring it — it will surface in the application, so it has to be declared.",
      },
      {
        id: "edge.overstay.b",
        text: "I'm glad you mentioned it — it's the kind of thing that has to be declared, because it will surface anyway. Can you tell me what happened? And I want to check this properly with my PM before I advise you either way, so let me come back to you by 4 PM today.",
        outcome: "closes",
        customerResponse:
          "It was my father's surgery, we had to change the flights. I've got the hospital paperwork if that helps.",
        feedback:
          "Right on every count. Even a single day's overstay makes someone high-risk for that country, and the hard rule is to escalate to your PM before advising anyone with a ban or an overstay. You understood the context, committed to a specific time, and did not build false hope. What mitigates it — a strong cover letter, evidence of ties to home country, a clear explanation — is the PM's call to confirm, not yours to promise.",
      },
      {
        id: "edge.overstay.c",
        text: "It will count against you, I won't pretend otherwise. Two days is still an overstay and consulates take it seriously, so I'd expect this to be difficult.",
        outcome: "deepens",
        customerResponse:
          "So there's no point applying at all? Should I just cancel the trip?",
        feedback:
          "Honest in tone and still a guess. Be honest about the effect on approval probability rather than building false hope — that cuts both ways, and talking someone out of a filable application is as much an invented outcome as promising them one.",
      },
    ],
  },
  {
    id: "edge.mmt_partner",
    label: "A partner-platform lead who did not ask for this",
    context:
      "Outbound call to an MMT lead. They booked flights to Bali last week.",
    customerMessage:
      "Sorry, who is this? I didn't sign up for any visa service. I just booked flights.",
    replies: [
      {
        id: "edge.mmt.a",
        text: "You did opt in during the booking — it's on the confirmation. Since we've started, shall I just walk you through what's included? Most people find it worth it.",
        outcome: "deepens",
        customerResponse:
          "I definitely didn't tick anything. Can you just take me off this?",
        feedback:
          "Do not pressure an MMT guest who does not want the service. It produces complaints and negative reviews, which is worse than the lost conversion — and this call is now one of them.",
      },
      {
        id: "edge.mmt.b",
        text: "That happens — sometimes a visa service gets added during a flight booking without it being clear. No problem at all: I'll cancel the application on our side right now and stop everything. You don't need to do anything.",
        outcome: "closes",
        customerResponse:
          "Oh, thank you. Yes, please cancel it. That was confusing.",
        feedback:
          "Establish first whether they actually wanted it — and when they did not, and cannot opt out themselves, cancel on their behalf immediately and stop processing. Then log it in Cadence as an MMT lead with the opt-out requested and the application cancelled, so nobody calls them again next week.",
      },
      {
        id: "edge.mmt.c",
        text: "No problem — you'll need to raise the opt-out through MakeMyTrip since that's where the booking was made. Their support team can sort it.",
        outcome: "deepens",
        customerResponse:
          "So I have to chase someone else for something I never asked for?",
        feedback:
          "Deflecting ownership, and to a guest who is already annoyed. If they cannot opt out themselves, you cancel it on their behalf. Sending them elsewhere is the thing the first operating principle exists to prevent.",
      },
    ],
  },
  {
    id: "edge.uae_active_visa",
    label: "The UAE active-visa error",
    context:
      "Inbound chat. They have tried three times on their own before messaging.",
    customerMessage:
      "Your site keeps saying I already have an active visa. I don't. I've never been to Dubai. Why is it blocking me?",
    replies: [
      {
        id: "edge.uae.a",
        text: "That usually means there's a record against your passport already. Have you applied through another agent, or could a family member have applied on your behalf?",
        outcome: "deepens",
        customerResponse:
          "No. Nobody. Are you saying I've done something wrong here?",
        feedback:
          "This is a known issue and may be a system fault, so do not tell the guest it is their problem or their fault. You have just made a system error sound like something they need to account for.",
      },
      {
        id: "edge.uae.b",
        text: "Thanks for flagging it — that's a known issue on our side and nothing to do with your passport. It needs our technical team, so I'm raising it with them right now, and I'll update you by 5 PM today either way.",
        outcome: "closes",
        customerResponse:
          "Okay, that's a relief. So I don't need to do anything my end?",
        feedback:
          "Escalate to the operations team immediately, because it needs backend resolution — and note what was committed to. Promise the follow-up, never the resolution: a specific time you will come back, not a time it will be fixed. The distinction is the whole lesson.",
      },
      {
        id: "edge.uae.c",
        text: "I've escalated it to our technical team and they'll have it resolved for you by tomorrow morning so you can apply.",
        outcome: "deepens",
        customerResponse:
          "Perfect, I'll apply tomorrow then and book the hotel tonight.",
        feedback:
          "You promised the resolution rather than the follow-up, and a guest has just booked a hotel on it. The fix is not yours to schedule, which is exactly why the lesson gives you the sentence that commits only to the update.",
      },
    ],
  },
];
