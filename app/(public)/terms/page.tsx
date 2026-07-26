import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Conditions · Aval Agam",
  description:
    "Terms & Conditions governing the use of Aval Agam's website, programs, workshops, group circles, 1:1 sessions, community experiences and corporate wellness offerings.",
};

const LAST_UPDATED = "25/07/2026";

/** Each block is rendered in order. `p` = paragraph, `ul` = bullet list, `sub` = small bold sub-heading. */
type Block =
  | { p: string }
  | { ul: string[] }
  | { sub: string };

type Section = { n: number; title: string; blocks: Block[] };

const INTRO: Block[] = [
  { p: "Welcome to Aval Agam. These Terms & Conditions govern your use of our website, programs, workshops, group circles, 1:1 sessions, community experiences, corporate wellness offerings, and related services." },
  { p: "By accessing our website, registering for a program, making a payment, attending a session, or communicating with Aval Agam, you agree to these Terms & Conditions." },
];

const SECTIONS: Section[] = [
  {
    n: 1,
    title: "Business Information",
    blocks: [
      { p: "Aval Agam is a women-centered and family-inclusive emotional wellness space based in Coimbatore, Tamil Nadu, India." },
      {
        ul: [
          "Business Name: Aval Agam",
          "Founder / Proprietor: Brindha Thiyagarajan",
          "Location: Coimbatore, Tamil Nadu, India",
          "Email: info@avalagam.com",
          "Website: www.avalagam.com",
          "GSTIN: 33BPSPT8407A1ZQ",
        ],
      },
      { p: "Aval Agam offers emotional wellness programs, breathwork sessions, mindfulness practices, gentle movement, journaling, reflective dialogue, group circles, workshops, Inner Clarity sessions, community experiences, and corporate wellness programs." },
    ],
  },
  {
    n: 2,
    title: "Nature of Services",
    blocks: [
      { p: "Aval Agam is a non-clinical emotional wellness space." },
      { p: "Our work may include breathwork, mindfulness, gentle movement, journaling, reflection, guided practices, group circles, psychology-informed inner work, psychodynamic-informed reflection, experiential reflective practices, and community-based wellness." },
      { p: "Aval Agam does not provide medical treatment, psychiatric care, diagnosis, clinical psychotherapy, crisis intervention, or emergency mental-health support." },
      { p: "Our services are designed to support self-awareness, emotional reflection, mindful living, body-mind connection, and inner clarity. They are not a substitute for therapy, medical care, psychiatric care, counselling, medication, or professional crisis support." },
    ],
  },
  {
    n: 3,
    title: "Program Offerings",
    blocks: [
      { p: "Aval Agam currently offers the following:" },
      { sub: "Mindful Reset Workshop" },
      { p: "A live introductory workshop that may include breathwork, mindfulness, gentle movement, journaling, emotional awareness, and reflection." },
      { sub: "Mindful Reset Circle" },
      { p: "A regular group emotional wellness practice. Each session primarily begins with breathwork and may include mindfulness, gentle movement, breath-led reflection, journaling, and closing intention." },
      { p: "Each session may range from 45 minutes to 1 hour." },
      { sub: "Inner Clarity Program" },
      { p: "A deeper 1:1 emotional wellness program for adults who want to explore recurring emotional patterns through live reflective work." },
      { p: "The program includes:" },
      {
        ul: [
          "1:1 Inner Clarity sessions per month — online or offline, based on availability.",
          "Mindful Reset group circles per month — included as an optional support. Clients may attend group circles if they are comfortable. If they prefer private work only, they may skip the group circles.",
        ],
      },
      { p: "The 1:1 sessions are the core and mandatory part of the Inner Clarity Program." },
      { sub: "Corporate Wellness" },
      { p: "Corporate programs are customised for workplaces, teams, founders, HR teams, and organisations. Corporate pricing, structure, duration, deliverables, and scope will be shared separately through a proposal, invoice, email confirmation, or agreement." },
      { sub: "Community Events" },
      { p: "Aval Agam may conduct future community events, family and parenting workshops, guest facilitator sessions, retreats, mindful gatherings, and special events. These may have separate pricing, eligibility, terms, and participation guidelines." },
    ],
  },
  {
    n: 4,
    title: "Eligibility",
    blocks: [
      { p: "Aval Agam is primarily designed for adults." },
      { p: "Adult women may participate in women-centered sessions, group circles, workshops, and Inner Clarity programs based on suitability." },
      { p: "Aval Agam may also offer family-inclusive, corporate, and community programs where participation may be open to other audiences based on the specific program format." },
      { p: "At present, adolescents or minors below 18 years are not included in adult women's sessions. If Aval Agam introduces adolescent-specific or family-specific programs in the future, parent or guardian consent may be required." },
      { p: "Aval Agam reserves the right to accept, refuse, pause, or discontinue participation if a program is not suitable for a participant's needs, safety, conduct, or scope of support required." },
    ],
  },
  {
    n: 5,
    title: "Booking and Payment",
    blocks: [
      { p: "A booking is confirmed only after successful payment and confirmation from Aval Agam." },
      { p: "Payments may be collected through website payment gateway, Razorpay, Stripe, UPI, bank transfer, or other approved methods shared by Aval Agam." },
      { p: "All prices mentioned on the website are subject to change. The applicable price will be the price displayed or communicated at the time of booking." },
      { p: "GST, payment gateway charges, bank charges, international transaction charges, currency conversion charges, or other applicable fees may apply depending on the payment method and participant location." },
      { p: "Aval Agam may issue payment receipts or invoices based on the business process and applicable tax requirements." },
      { p: "Participants must enter correct details such as name, phone number, email address, and WhatsApp number during registration. Aval Agam is not responsible for missed communication due to incorrect details." },
    ],
  },
  {
    n: 6,
    title: "Payment Notice",
    blocks: [
      { p: "At present, some payments may be collected into the founder/proprietor's account while Aval Agam transitions its payment operations." },
      { p: "All payments made for Aval Agam services must be made only through payment details officially shared by Aval Agam." },
      { p: "Participants are requested not to make payments to any unauthorised account, third party, or unverified payment link." },
    ],
  },
  {
    n: 7,
    title: "Attendance Policy",
    blocks: [
      { p: "Participants are expected to attend sessions on time and participate respectfully." },
      { p: "For online sessions, participants are responsible for having a stable internet connection, working device, quiet space, and necessary materials such as notebook, pen, water, and comfortable seating." },
      { p: "Aval Agam is not responsible for missed sessions due to participant-side technical issues, internet issues, personal delay, wrong login link usage, device problems, or failure to attend on time." },
    ],
  },
  {
    n: 8,
    title: "Mindful Reset Workshop Policy",
    blocks: [
      { p: "The Mindful Reset Workshop is a live session." },
      { p: "Once booked, workshop fees are non-refundable and non-transferable." },
      { p: "No transfer to another class will be provided except in genuine medical emergencies, and such exceptions are subject to Aval Agam's discretion." },
      { p: "The workshop will not be recorded. Since it is a live experience, no replay or recording will be provided." },
      { p: "If a participant misses the workshop, the fee will not be refunded or carried forward." },
      { sub: "Health and Safety" },
      { p: "The workshop may include breathwork, gentle movement, mindfulness, and emotional reflection." },
      { p: "Participants should not force any breathing practice, posture, movement, or emotional process." },
      { p: "Please inform Aval Agam before the workshop if you have any relevant condition such as pregnancy, recent surgery, injury, seizure history, breathing difficulty, panic episodes, psychiatric concerns, or any health condition that may affect participation." },
      { p: "Aval Agam may suggest that a participant avoid or modify certain practices where needed." },
      { sub: "Emotional Awareness" },
      { p: "Some participants may experience emotions, memories, discomfort, tiredness, resistance, or sensitivity during or after reflective practices." },
      { p: "This can happen during self-awareness work. Participants are encouraged to go at their own pace and seek professional help if they need deeper clinical support." },
      { p: "Aval Agam does not guarantee any specific emotional, mental, physical, personal, relationship, or life outcome from attending the workshop." },
    ],
  },
  {
    n: 9,
    title: "Mindful Reset Circle Policy",
    blocks: [
      { p: "Mindful Reset Circle participants may attend from available batches conducted Monday to Thursday, based on their monthly plan and batch availability." },
      { p: "Participants may choose timings flexibly from the available daily batches." },
      { p: "The 8-session or 16-session access is valid only for the enrolled month." },
      { p: "Unused sessions will expire at the end of the month." },
      { p: "Missed sessions will not be refunded, transferred, or carried forward to the next month." },
    ],
  },
  {
    n: 10,
    title: "Inner Clarity Program Policy",
    blocks: [
      { p: "The Inner Clarity Program includes 8 live 1:1 sessions per month." },
      { p: "These 1:1 sessions are mandatory and form the core of the program." },
      { p: "The program may also include access to 16 Mindful Reset group circles per month as an optional support. Group circles are included for clients who feel comfortable joining a shared practice space. Clients who prefer private work may skip the group circles." },
      { p: "All Inner Clarity sessions and optional group circle access expire at the end of the enrolled month." },
      { p: "Unused 1:1 sessions and group circle sessions will not be carried forward to the next month unless Aval Agam specifically approves an exception in writing." },
    ],
  },
  {
    n: 11,
    title: "Rescheduling Policy",
    blocks: [
      { p: "Workshop registration is non-transferable to another person or another workshop date." },
      { p: "A transfer to the next available workshop date may be considered only in a genuine medical emergency." },
      { p: "Medical emergency transfers are subject to Aval Agam's discretion and may require reasonable supporting information." },
      { p: "Transfer approval is not guaranteed." },
      { p: "For 1:1 Inner Clarity sessions, participants are requested to inform Aval Agam in advance if they are unable to attend." },
      { p: "Prior notice is preferred so that the session can be rescheduled smoothly." },
      { p: "Genuine emergencies may be considered with understanding, but repeated last-minute cancellations, no-shows, or non-communication may result in the session being counted as completed." },
      { p: "All rescheduling is subject to availability within the same month." },
      { p: "Sessions cannot be carried forward after the monthly validity period." },
    ],
  },
  {
    n: 12,
    title: "Refund and Cancellation Policy",
    blocks: [
      { p: "All payments made to Aval Agam are subject to the Refund and Cancellation Policy." },
      { p: "As a general rule, the Mindful Reset Workshop fee is non-refundable once payment is completed. No refund especially will be provided for:" },
      {
        ul: [
          "Missed attendance",
          "Change of personal plans",
          "Internet or device issues from the participant's side",
          "Late joining",
          "Forgetting the session date or time",
          "Not being able to attend after registration",
          "Not feeling ready to participate",
          "Not using the joining link on time",
        ],
      },
      { p: "Mindful Reset Circle fees are non-refundable once access to the monthly program is provided." },
      { p: "Inner Clarity Program fees are non-refundable once the program begins." },
      { p: "Corporate wellness cancellations, refunds, and rescheduling will be handled as per the proposal, invoice, email confirmation, or agreement shared for that specific engagement." },
      { p: "If Aval Agam cancels a session, workshop, circle, or program, Aval Agam may offer a reschedule, credit, or refund depending on the situation." },
      { p: "Duplicate payments or payment errors may be refunded after verification." },
      { p: "Refunds, where approved, will be processed through the original payment method or another suitable method as decided by Aval Agam." },
    ],
  },
  {
    n: 13,
    title: "Emotional Wellness Disclaimer",
    blocks: [
      { p: "Aval Agam's sessions may involve breathwork, reflection, emotional awareness, journaling, body awareness, and inner work." },
      { p: "Participants may sometimes experience emotional discomfort, memories, tiredness, resistance, or strong feelings during or after reflective practices. This can be a natural part of self-awareness work, but participants must take responsibility for their own pace and safety." },
      { p: "Participants are free to pause, stop, or step away from any practice if they feel uncomfortable or overwhelmed." },
      { p: "Aval Agam does not provide emergency support. If you are experiencing severe distress, self-harm thoughts, suicidal thoughts, abuse, medical emergency, psychiatric crisis, or any urgent mental-health concern, please contact a qualified mental-health professional, doctor, emergency service, or local crisis helpline immediately." },
    ],
  },
  {
    n: 14,
    title: "Participant Responsibility",
    blocks: [
      { p: "By joining Aval Agam, participants agree to:" },
      {
        ul: [
          "Attend sessions respectfully and on time.",
          "Participate within their comfort and capacity.",
          "Inform Aval Agam about relevant physical, emotional, or medical concerns that may affect participation.",
          "Avoid forcing the body, breath, or emotional process.",
          "Seek medical, psychological, psychiatric, or therapeutic support where required.",
          "Maintain confidentiality in group settings.",
          "Follow community guidelines and facilitator instructions.",
        ],
      },
      { p: "Participants must inform Aval Agam in advance if they have pregnancy, recent surgery, injury, breathing difficulty, seizure history, panic episodes, psychiatric diagnosis, medication changes, or any condition that may require modified support." },
      { p: "Aval Agam may recommend that a participant seek medical or clinical support if the participant's needs appear to be outside Aval Agam's scope." },
      { p: "Participants are responsible for joining from a safe, quiet, and comfortable space. Please keep the following ready:" },
      { ul: ["Notebook", "Pen", "Water", "Comfortable seating", "Stable internet connection", "Working device with audio/video access if needed"] },
      { p: "Participants must listen to their body and emotional state during the session. They may pause, rest, or stop any practice if they feel uncomfortable." },
    ],
  },
  {
    n: 15,
    title: "Group Conduct and Confidentiality",
    blocks: [
      { p: "Aval Agam group spaces are intended to be respectful, non-judgmental, and emotionally safe." },
      { p: "Participants must not disclose, share, record, screenshot, repeat, publish, or misuse another participant's personal story, identity, image, voice, or experience." },
      { p: "Confidentiality is expected from all participants. However, Aval Agam cannot fully guarantee the conduct of every participant in a group environment." },
      { p: "Participants who violate confidentiality, behave disrespectfully, misuse WhatsApp groups, harass others, promote services without permission, disturb sessions, or cross safety boundaries may be removed from the program without refund." },
    ],
  },
  {
    n: 16,
    title: "Recording Policy",
    blocks: [
      { p: "Aval Agam sessions are not recorded." },
      { p: "Participants are not allowed to record, photograph, screenshot, livestream, or share any session, workshop, group circle, 1:1 session, or program material without prior written permission from Aval Agam. This includes audio, video, slides, practices, discussions, participant sharing, chat messages, worksheets, prompts, or any workshop material." },
      { p: "1:1 Inner Clarity sessions will not be recorded unless there is a specific written agreement between Aval Agam and the participant." },
    ],
  },
  {
    n: 17,
    title: "Community Guidelines",
    blocks: [
      { p: "Participants must maintain respectful communication in all Aval Agam spaces, including live sessions, WhatsApp groups, online meetings, offline gatherings, and community events." },
      { p: "The following are not allowed:" },
      {
        ul: [
          "Abusive language",
          "Harassment",
          "Sexual comments or misconduct",
          "Discrimination",
          "Religious or political arguments that disturb the space",
          "Promotion of personal business without permission",
          "Sharing private participant information",
          "Disruptive behaviour",
          "Repeated boundary violations",
          "Joining under false identity",
        ],
      },
      { p: "Aval Agam reserves the right to remove any participant who compromises the safety or dignity of the space." },
    ],
  },
  {
    n: 18,
    title: "Corporate Wellness Terms",
    blocks: [
      { p: "Corporate wellness programs are customised based on the needs of the organisation." },
      { p: "The scope, number of sessions, deliverables, pricing, dates, mode, facilitator availability, and payment terms will be confirmed separately through proposal, invoice, email confirmation, or written agreement." },
      { p: "Corporate wellness sessions are not clinical assessments and do not provide employee diagnosis, treatment plans, psychological evaluations, or individual mental-health reports to employers." },
      { p: "Any corporate feedback or reports, if provided, will be general, non-clinical, and non-diagnostic unless otherwise agreed in writing." },
    ],
  },
  {
    n: 19,
    title: "Guest Facilitators and Collaborations",
    blocks: [
      { p: "Aval Agam may collaborate with guest facilitators, advisors, practitioners, speakers, or wellness professionals for specific events, workshops, corporate programs, or community experiences." },
      { p: "The scope and responsibility of guest facilitators will be limited to the specific event or program they are part of." },
      { p: "Aval Agam may change the facilitator, date, time, structure, or format of an event when required due to availability, safety, operational, or technical reasons." },
    ],
  },
  {
    n: 20,
    title: "Intellectual Property",
    blocks: [
      { p: "All Aval Agam content, including website content, program names, workshop materials, guided practices, audios, videos, PDFs, journal prompts, handouts, worksheets, scripts, branding, logos, images, frameworks, session formats, and written materials are the intellectual property of Aval Agam unless otherwise stated." },
      { p: "Participants may not copy, reproduce, teach, sell, distribute, upload, modify, record, publish, or commercially use Aval Agam materials without prior written permission." },
      { p: "Program access is for personal use only." },
    ],
  },
  {
    n: 21,
    title: "Testimonials, Reviews and Images",
    blocks: [
      { p: "Aval Agam may request feedback, testimonials, reviews, or reflections from participants." },
      { p: "Testimonials, photographs, screenshots, names, videos, or identifiable client experiences will be used for marketing only with consent." },
      { p: "Aval Agam may use anonymised or non-identifiable feedback for service improvement, internal review, or communication purposes." },
      { p: "Participants may request removal or anonymisation of identifiable testimonials where reasonably possible." },
    ],
  },
  {
    n: 22,
    title: "Website Use",
    blocks: [
      { p: "Users agree not to misuse the Aval Agam website, attempt unauthorised access, copy website content, interfere with website functioning, submit false details, use another person's identity, or make fraudulent payments." },
      { p: "Aval Agam may modify, suspend, or update any website content, program description, pricing, or service availability at any time." },
    ],
  },
  {
    n: 23,
    title: "Privacy and Personal Data",
    blocks: [
      { p: "Aval Agam may collect personal details such as name, phone number, email address, location, payment details, session preferences, wellness-related information voluntarily shared by the participant, and communication details for the purpose of booking, session delivery, payment processing, customer support, program communication, and legal compliance." },
      { p: "Aval Agam will handle personal information as described in its Privacy Policy." },
      { p: "Participants should avoid sharing unnecessary sensitive information unless relevant to safe participation." },
    ],
  },
  {
    n: 24,
    title: "Limitation of Liability",
    blocks: [
      { p: "Aval Agam offers wellness and reflective practices with care, but does not guarantee specific outcomes, emotional changes, relationship changes, workplace outcomes, health results, or personal transformation." },
      { p: "Aval Agam will not be responsible for indirect, incidental, emotional, physical, financial, professional, relational, or consequential loss arising from participation, non-participation, missed sessions, technical issues, personal interpretation of practices, or use of website content, except where liability cannot be excluded under applicable law." },
      { p: "Participants are responsible for their own decisions, actions, pace of participation, and choice to seek appropriate professional support when required." },
    ],
  },
  {
    n: 25,
    title: "Right to Refuse, Pause or Discontinue Services",
    blocks: [
      { p: "Aval Agam reserves the right to refuse admission, pause participation, recommend discontinuation, or remove a participant if:" },
      {
        ul: [
          "The program is not suitable for the participant.",
          "The participant requires clinical or emergency support beyond Aval Agam's scope.",
          "The participant violates terms, boundaries, confidentiality, or community safety.",
          "The participant behaves abusively, disruptively, or dishonestly.",
          "Payment is incomplete, disputed, reversed, or fraudulent.",
          "Continuation may not be safe or appropriate.",
        ],
      },
      { p: "Refunds in such cases will be handled at Aval Agam's discretion and subject to applicable policy." },
    ],
  },
  {
    n: 26,
    title: "Changes to Terms",
    blocks: [
      { p: "Aval Agam may update these Terms & Conditions from time to time." },
      { p: "The updated version will be posted on the website with the latest revision date." },
      { p: "Continued use of the website or participation in Aval Agam programs after changes are posted means that the user accepts the updated terms." },
    ],
  },
  {
    n: 27,
    title: "Governing Law and Jurisdiction",
    blocks: [
      { p: "These Terms & Conditions are governed by the laws of India." },
      { p: "Subject to applicable law, any disputes shall fall under the jurisdiction of the courts in Coimbatore, Tamil Nadu, India." },
      { p: "Aval Agam encourages participants to first contact us directly so that concerns may be resolved respectfully and amicably." },
    ],
  },
  {
    n: 28,
    title: "Contact and Grievance Support",
    blocks: [
      { p: "For questions, concerns, payment issues, refund requests, or grievances, please contact:" },
      {
        ul: [
          "Aval Agam",
          "Email: info@avalagam.com",
          "Location: Coimbatore, Tamil Nadu, India",
          "Website: www.avalagam.com",
        ],
      },
    ],
  },
];

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if ("sub" in b) {
          return (
            <h3
              key={i}
              style={{
                fontFamily: "Playfair Display, serif",
                color: "#0F332B",
                fontSize: "17px",
                fontWeight: 700,
                margin: "18px 0 6px",
              }}
            >
              {b.sub}
            </h3>
          );
        }
        if ("ul" in b) {
          return (
            <ul key={i} style={{ margin: "0 0 14px", paddingLeft: "20px", listStyle: "disc" }}>
              {b.ul.map((li, j) => (
                <li
                  key={j}
                  style={{ color: "#2F3328", fontSize: "15px", lineHeight: 1.85, marginBottom: "4px" }}
                >
                  {li}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} style={{ color: "#2F3328", fontSize: "15px", lineHeight: 1.85, marginBottom: "14px" }}>
            {b.p}
          </p>
        );
      })}
    </>
  );
}

export default function TermsPage() {
  return (
    <div style={{ fontFamily: "Poppins, sans-serif", backgroundColor: "#FBF4E8" }}>
      {/* Header */}
      <section style={{ backgroundColor: "#0F332B" }}>
        <div className="max-w-[900px] mx-auto px-6 sm:px-10 py-14 sm:py-20">
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              color: "#C9A25F",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
              marginBottom: "22px",
            }}
          >
            <ArrowLeft size={14} /> Back to home
          </Link>
          <p
            style={{
              color: "#C9A25F",
              fontSize: "11px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: "10px",
            }}
          >
            AVAL AGAM · LEGAL
          </p>
          <h1
            style={{
              fontFamily: "Playfair Display, serif",
              color: "#FBF4E8",
              fontSize: "clamp(30px, 5vw, 52px)",
              fontWeight: 600,
              lineHeight: 1.15,
            }}
          >
            Terms &amp; Conditions
          </h1>
          <p style={{ color: "rgba(251,244,232,0.6)", fontSize: "14px", marginTop: "14px" }}>
            Last updated: {LAST_UPDATED}
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="max-w-[900px] mx-auto px-6 sm:px-10 py-14 sm:py-20">
        <Blocks blocks={INTRO} />

        {/* Quick index */}
        <nav
          style={{
            backgroundColor: "#EEE2D5",
            borderRadius: "16px",
            padding: "22px 26px",
            margin: "28px 0 40px",
          }}
        >
          <p
            style={{
              color: "#C9A25F",
              fontSize: "11px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: "14px",
            }}
          >
            On this page
          </p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {SECTIONS.map((s) => (
              <li key={s.n}>
                <a
                  href={`#section-${s.n}`}
                  style={{ color: "#0F332B", fontSize: "14px", textDecoration: "none", lineHeight: 1.9 }}
                >
                  {s.n}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {SECTIONS.map((s) => (
          <article key={s.n} id={`section-${s.n}`} style={{ scrollMarginTop: "88px", marginBottom: "34px" }}>
            <h2
              style={{
                fontFamily: "Playfair Display, serif",
                color: "#0F332B",
                fontSize: "clamp(20px, 2.4vw, 26px)",
                fontWeight: 700,
                marginBottom: "12px",
              }}
            >
              {s.n}. {s.title}
            </h2>
            <Blocks blocks={s.blocks} />
          </article>
        ))}

        {/* Footer note */}
        <div
          style={{
            borderTop: "1px solid #EEE2D5",
            paddingTop: "26px",
            marginTop: "40px",
            display: "flex",
            flexWrap: "wrap",
            gap: "14px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p style={{ color: "#2F3328", fontSize: "13px", opacity: 0.6 }}>
            Questions about these terms? Write to{" "}
            <a href="mailto:info@avalagam.com" style={{ color: "#C8734F", fontWeight: 500 }}>
              info@avalagam.com
            </a>
          </p>
          <Link
            href="/"
            style={{
              backgroundColor: "#0F332B",
              color: "#FBF4E8",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              borderRadius: "9999px",
              padding: "12px 26px",
              textDecoration: "none",
            }}
          >
            BACK TO HOME
          </Link>
        </div>
      </section>
    </div>
  );
}
