import { readFileSync } from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';
import * as juice from 'juice';

/**
 * Template names — correspond to .hbs files in src/email/templates/.
 */
export type EmailTemplate =
  | 'welcome'
  | 'email-verification'
  | 'password-reset'
  | 'magic-link'
  | 'lockout-alert';

interface RenderOptions {
  template: EmailTemplate;
  subject: string;
  data: Record<string, unknown>;
}

/**
 * Renders an HTML email from a Handlebars template and inlines CSS with juice
 * so it renders correctly in Gmail, Outlook, and Apple Mail (P15 E1-E3).
 *
 * Templates live in src/email/templates/*.hbs.
 * The base layout (base.hbs) is wrapped around every template.
 *
 * Usage:
 *   const { html, text } = renderEmail({ template: 'welcome', subject: '...', data: { name, url } });
 */
export function renderEmail(options: RenderOptions): { html: string; text: string } {
  const baseSource = readTemplate('base');
  const contentSource = readTemplate(options.template);

  const appName = process.env.APP_NAME ?? 'NestJS Better-Auth';

  // Compile content partial first
  const contentTemplate = Handlebars.compile(contentSource);
  const content = contentTemplate({ ...options.data, appName });

  // Inject content into base layout
  const baseTemplate = Handlebars.compile(baseSource);
  const rawHtml = baseTemplate({
    subject: options.subject,
    appName,
    content,
  });

  // Inline CSS styles so email clients that strip <style> tags still render correctly
  const html = juice(rawHtml);

  // Plain-text fallback — strip all HTML tags (P15 E5)
  const text = rawHtml
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s{2,}/g, '\n')
    .trim();

  return { html, text };
}

function readTemplate(name: string): string {
  // In production (dist/), templates are copied to dist/email/templates/
  // In development (src/), templates are in src/email/templates/
  const candidates = [
    join(__dirname, 'templates', `${name}.hbs`),
    join(process.cwd(), 'src', 'email', 'templates', `${name}.hbs`),
  ];
  for (const path of candidates) {
    try {
      return readFileSync(path, 'utf-8');
    } catch {
      // try next
    }
  }
  throw new Error(`Email template not found: ${name}`);
}
