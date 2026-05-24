import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'Cellibrate Health'

interface TeamInviteProps {
  inviterName?: string
  role?: string
  signupUrl?: string
}

const roleLabel = (role?: string) => {
  if (role === 'admin') return 'Admin'
  if (role === 'team') return 'Team member'
  return role || 'Team member'
}

const TeamInviteEmail = ({ inviterName, role, signupUrl }: TeamInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join the {SITE_NAME} team</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You're invited to join the team</Heading>
        <Text style={text}>
          {inviterName ? `${inviterName} has` : "You've been"} invited
          {inviterName ? ' you ' : ' '}to join the {SITE_NAME} team as a{' '}
          <strong>{roleLabel(role)}</strong>.
        </Text>
        <Section style={card}>
          <Text style={cardRow}>
            To accept, create your account using <strong>this exact email
            address</strong>. Your {roleLabel(role).toLowerCase()} access is
            applied automatically as soon as you sign up.
          </Text>
        </Section>
        {signupUrl && (
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button style={button} href={signupUrl}>
              Create your account
            </Button>
          </Section>
        )}
        <Text style={footer}>With gratitude, the {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TeamInviteEmail,
  subject: `You've been invited to join the ${SITE_NAME} team`,
  displayName: 'Team invite',
  previewData: {
    inviterName: 'Kim',
    role: 'team',
    signupUrl: 'https://tasteofconventions.com/auth',
  },
} satisfies TemplateEntry

export default TeamInviteEmail

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
const button = {
  backgroundColor: '#2a1810',
  color: '#ffffff',
  fontSize: '15px',
  borderRadius: '8px',
  padding: '12px 22px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = {
  fontSize: '12px',
  color: '#999999',
  margin: '28px 0 0',
}
