import { Controller, Get, Header, NotFoundException, Param, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipEnvelope } from '../common/decorators/skip-envelope.decorator';
import { renderEmail, type EmailTemplate } from './template.service';

const TEMPLATES: EmailTemplate[] = [
  'welcome',
  'email-verification',
  'password-reset',
  'magic-link',
  'lockout-alert',
];

const SAMPLE_DATA: Record<EmailTemplate, Record<string, unknown>> = {
  welcome: {
    name: 'Jane Doe',
    url: 'http://localhost:5555/api/auth/verify-email?token=preview-token',
  },
  'email-verification': {
    name: 'Jane Doe',
    url: 'http://localhost:5555/api/auth/verify-email?token=preview-token',
  },
  'password-reset': {
    name: 'Jane Doe',
    email: 'jane@example.com',
    url: 'http://localhost:5555/api/auth/reset-password?token=preview-token',
  },
  'magic-link': {
    url: 'http://localhost:5555/api/auth/magic-link/verify-magic-link?token=preview-token',
  },
  'lockout-alert': {
    name: 'Jane Doe',
    email: 'jane@example.com',
    failedAttempts: 5,
    ipAddress: '203.0.113.42',
    timestamp: new Date().toUTCString(),
    resetUrl: 'http://localhost:5555/api/auth/forget-password',
  },
};

/**
 * Development-only email preview route (P15 E4).
 * Renders templates in the browser without sending an email.
 *
 * GET /dev/email                     — lists all available templates
 * GET /dev/email/:template           — renders the named template with sample data
 *
 * Only mounted when NODE_ENV !== 'production'.
 */
@SkipEnvelope()
@ApiExcludeController()
@Controller({ version: VERSION_NEUTRAL, path: 'dev/email' })
export class EmailPreviewController {
  @Get()
  listTemplates() {
    return {
      templates: TEMPLATES,
      usage: 'GET /dev/email/:template',
    };
  }

  @Get(':template')
  @Header('Content-Type', 'text/html; charset=utf-8')
  previewTemplate(@Param('template') template: string) {
    if (!TEMPLATES.includes(template as EmailTemplate)) {
      throw new NotFoundException(
        `Template "${template}" not found. Available: ${TEMPLATES.join(', ')}`,
      );
    }

    const { html } = renderEmail({
      template: template as EmailTemplate,
      subject: `Preview — ${template}`,
      data: SAMPLE_DATA[template as EmailTemplate],
    });

    // Return raw HTML — Fastify will serve it with correct content-type
    return html;
  }
}
