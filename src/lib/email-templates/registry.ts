import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

import { template as rsvpConfirmation } from './rsvp-confirmation'
import { template as teamInvite } from './team-invite'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'rsvp-confirmation': rsvpConfirmation,
  'team-invite': teamInvite,
}
