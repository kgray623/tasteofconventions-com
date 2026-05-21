import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'Cellibrate Health'

interface RsvpConfirmationProps {
  guestName?: string
  eventTitle?: string
  eventStartsAt?: string
  location?: string
  status?: 'yes' | 'no' | 'maybe'
  partySize?: number
}

const formatStatus = (status?: string) => {
  if (status === 'yes') return "You're attending"
  if (status === 'no') return "You've declined"
  if (status === 'maybe') return 'Marked as maybe'
  return 'Response received'
}

const RsvpConfirmationEmail = ({
  guestName,
  eventTitle,
  eventStartsAt,
  location,
  status,
  partySize,
}: RsvpConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {eventTitle
        ? `Your RSVP for ${eventTitle} has been received`
        : 'Your RSVP has been received'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {guestName ? `Thank you, ${guestName}!` : 'Thank you for your RSVP!'}
        </Heading>
        <Text style={text}>
          We've received your response for{' '}
          <strong>{eventTitle ?? 'the event'}</strong>. A copy of your RSVP
          details is below for your records.
        </Text>

        <Section style={card}>
          <Text style={cardRow}>
            <strong>Status:</strong> {formatStatus(status)}
          </Text>
          {status !== 'no' && typeof partySize === 'number' && (
            <Text style={cardRow}>
              <strong>Party size:</strong> {partySize}
            </Text>
          )}
          {eventStartsAt && (
            <Text style={cardRow}>
              <strong>When:</strong>{' '}
              {new Date(eventStartsAt).toLocaleString(undefined, {
                dateStyle: 'full',
                timeStyle: 'short',
              })}
            </Text>
          )}
          {location && (
            <Text style={cardRow}>
              <strong>Where:</strong> {location}
            </Text>
          )}
        </Section>

        <Text style={text}>
          Need to update your response? Just open your original invitation link
          again and resubmit.
        </Text>

        <Text style={footer}>With gratitude, the {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RsvpConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data?.eventTitle
      ? `Your RSVP for ${data.eventTitle} is confirmed`
      : 'Your RSVP has been received',
  displayName: 'RSVP confirmation',
  previewData: {
    guestName: 'Jane Doe',
    eventTitle: 'Cellibrate Health Feast',
    eventStartsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    location: '123 Wellness Way, Springfield',
    status: 'yes',
    partySize: 2,
  },
} satisfies TemplateEntry

export default RsvpConfirmationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = {
  fontSize: '26px',
  fontWeight: 'bold' as const,
  color: '#2a1810',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#55575d',
  lineHeight: '1.6',
  margin: '0 0 18px',
}
const card = {
  backgroundColor: '#fbf6ef',
  border: '1px solid #e8dccb',
  borderRadius: '10px',
  padding: '18px 20px',
  margin: '8px 0 24px',
}
const cardRow = {
  fontSize: '14px',
  color: '#2a1810',
  lineHeight: '1.6',
  margin: '4px 0',
}
const footer = {
  fontSize: '12px',
  color: '#999999',
  margin: '28px 0 0',
}
