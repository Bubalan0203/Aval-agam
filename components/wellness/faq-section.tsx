"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { Plus, Minus } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    q: "Who is Aval Agam for?",
    a: "Aval Agam is for anyone who is carrying life silently — women, mothers, adolescent girls, families, working adults and workplace teams. If you feel scattered, emotionally tired, or simply long for a quiet space to understand yourself better, this is for you.",
  },
  {
    q: "Do I need any prior experience or flexibility?",
    a: "None at all. You do not need to be flexible, experienced in yoga, or familiar with meditation. You only need the willingness to begin. Everything at Aval Agam is designed to meet you exactly where you are.",
  },
  {
    q: "Is this a replacement for therapy?",
    a: "No. Aval Agam is a soulspace — a preventive and reflective wellness practice, not a clinical service. It is not a replacement for therapy or medical treatment. If you are working with a therapist or doctor, Aval Agam can be a gentle complementary practice.",
  },
  {
    q: "Can I join only the group circle?",
    a: "Yes. The Mindful Reset Circle is also available as an independent program with either 8 or 16 sessions per month.",
  },
  {
    q: "Can families and adolescents join the circles?",
    a: "Yes. Aval Agam offers specific circles for adolescent girls and family groups. These are designed with age-appropriate practices that help young people and families develop emotional vocabulary, soften communication and create shared rituals of pause.",
  },
  {
    q: "What happens in an Inner Clarity session?",
    a: "An Inner Clarity session is a private, guided space to slow down and understand what may be happening beneath your thoughts, emotions and repeated patterns. The session may begin with gentle breath awareness and grounding, followed by reflective conversation, present-moment emotional observation, body awareness, journaling prompts and psychodynamic-informed exploration. Rather than offering quick advice, the process helps you notice what keeps repeating, what may be influencing your responses and what your inner world may be asking for. You leave with greater awareness, a clearer understanding of your experience and one or two practical directions to carry into daily life. Inner Clarity is a non-clinical emotional wellness program and does not replace psychotherapy, medical care or crisis support.",
  },
  {
    q: "Is Inner Clarity psychotherapy?",
    a: "No. Inner Clarity is a non-clinical emotional wellness and reflective-development program. It draws from psychodynamic and experiential principles but does not provide diagnosis, psychotherapy, medical treatment or crisis care.",
  },
  {
    q: "What does psychodynamic-informed reflection mean?",
    a: "It means exploring recurring emotional themes, protective responses, internal conflicts, earlier influences and relationship patterns that may continue to affect present choices.",
  },
  {
    q: "What does experiential work mean?",
    a: "Experiential work pays attention to what is happening within you during the session — through emotion, body sensations, breath, thoughts and impulses — rather than discussing everything only at an intellectual level.",
  },
  {
    q: "How is neuroplasticity connected to the program?",
    a: "Neuroplasticity describes the brain and nervous system's capacity to adapt through learning and repeated experience. Inner Clarity does not promise to rewire the brain. The program creates repeated opportunities to notice familiar patterns and practise more intentional responses over time.",
  },
  {
    q: "Why are group circles included in Inner Clarity?",
    a: "Personal insight may be difficult to carry into everyday life without regular practice. The Mindful Reset Circle provides a breath-led rhythm of regulation, mindfulness, reflection and journaling between 1:1 sessions.",
  },
  {
    q: "Do you offer programs for workplaces?",
    a: "Yes. Aval Agam's Corporate Wellness programs bring breathwork, mindful reset practices and emotional regulation workshops to teams. These are available through corporate pilots, team circles, workshops and selected Inner Clarity support.",
  },
  {
    q: "Where are the sessions held?",
    a: "Offline sessions are held at the Aval Agam soulspace in Coimbatore, Tamil Nadu. Our programs are also available online. Please reach out via WhatsApp or email for specific location and scheduling details.",
  },
];

export function FAQSection() {
  const [openItem, setOpenItem] = useState<string | undefined>(undefined);

  return (
    <section id="faq" style={{ backgroundColor: '#EEE2D5' }} className="w-full">
      <div className="max-w-[800px] mx-auto px-6 py-20 lg:py-28">
        {/* Header */}
        <div className="text-center mb-12 flex flex-col items-center gap-4">
          <p style={{ fontFamily: 'Poppins, sans-serif', color: '#C9A25F', fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600 }}>
            BEFORE YOU BEGIN
          </p>
          <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#0F332B', fontSize: 'clamp(28px, 3.5vw, 44px)', lineHeight: 1.25, fontWeight: 600 }}>
            Frequently asked{' '}
            <em style={{ color: '#C8734F', fontStyle: 'italic' }}>questions.</em>
          </h2>
        </div>

        {/* Accordion */}
        <Accordion.Root
          type="single"
          collapsible
          value={openItem}
          onValueChange={setOpenItem}
        >
          {faqs.map((faq, i) => (
            <Accordion.Item
              key={i}
              value={`item-${i}`}
              style={{ borderBottom: '1px solid rgba(201,162,95,0.4)' }}
            >
              <Accordion.Trigger
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '20px 0',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  gap: '16px',
                }}
              >
                <span style={{ fontFamily: 'Playfair Display, serif', color: '#0F332B', fontSize: '17px', fontWeight: 500, lineHeight: 1.4 }}>
                  {faq.q}
                </span>
                <span style={{ flexShrink: 0 }}>
                  {openItem === `item-${i}` ? (
                    <Minus size={16} style={{ color: '#C8734F' }} />
                  ) : (
                    <Plus size={16} style={{ color: '#C8734F' }} />
                  )}
                </span>
              </Accordion.Trigger>
              <Accordion.Content
                style={{ overflow: 'hidden' }}
              >
                <p style={{ fontFamily: 'Poppins, sans-serif', color: '#2F3328', fontSize: '15px', lineHeight: 1.8, paddingBottom: '20px', paddingRight: '32px' }}>
                  {faq.a}
                </p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
