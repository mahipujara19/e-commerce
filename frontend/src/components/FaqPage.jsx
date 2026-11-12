import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import { Link } from 'react-router-dom'
import { FAQ } from '../content/policies'
import usePageMeta from '../hooks/usePageMeta'

const accordionSx = { bgcolor: 'transparent', borderBottom: '1px solid rgb(var(--line))', '&::before': { display: 'none' } }

// FAQPage structured data lets search engines show answers directly in results.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.flatMap((group) =>
    group.items.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })),
  ),
}

function FaqPage() {
  usePageMeta({
    title: 'Frequently asked questions',
    description: 'Answers about orders, delivery, payments, promo codes and returns.',
    jsonLd,
  })

  return (
    <div className="container-x max-w-3xl pb-24 pt-10 md:pt-14">
      <h1 className="font-display text-4xl md:text-5xl">Frequently asked questions</h1>
      <p className="mt-4 text-lg text-stone">Can&apos;t find your answer? <Link to="/contact" className="text-ink underline">Contact us</Link> and we&apos;ll help.</p>

      {FAQ.map((group) => (
        <section key={group.heading} className="mt-12" aria-labelledby={`faq-${group.heading}`}>
          <h2 id={`faq-${group.heading}`} className="text-[12px] font-semibold uppercase tracking-[0.2em] text-gold">{group.heading}</h2>
          <div className="mt-3">
            {group.items.map(([question, answer]) => (
              <Accordion key={question} disableGutters elevation={0} square sx={accordionSx}>
                <AccordionSummary expandIcon={<AddRoundedIcon />} sx={{ px: 0 }}>
                  <span className="font-display text-lg">{question}</span>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pb: 3 }}>
                  <p className="leading-relaxed text-stone">{answer}</p>
                </AccordionDetails>
              </Accordion>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default FaqPage
