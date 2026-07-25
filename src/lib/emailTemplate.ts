import { type EmailLocale, getEmailTranslations } from './emailTranslations'
import { DEFAULT_ORG_NAME } from './branding'

interface EmailTemplateOptions {
  title: string
  preheader?: string
  content: string
  buttonText?: string
  buttonUrl?: string
  footerNote?: string
  chapterName?: string
  locale?: EmailLocale
}

export function generateEmailTemplate({
  title,
  preheader,
  content,
  buttonText,
  buttonUrl,
  footerNote,
  chapterName = DEFAULT_ORG_NAME,
  locale = 'lv',
}: EmailTemplateOptions): string {
  const t = getEmailTranslations(locale)

  return `
    <!DOCTYPE html>
    <html lang="${locale}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        ${preheader ? `<meta name="description" content="${preheader}">` : ''}
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #1f2937; font-size: 24px; font-weight: bold;">${title}</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 0 40px 20px 40px;">
                    ${content}
                  </td>
                </tr>

                <!-- Button (if provided) -->
                ${
                  buttonText && buttonUrl
                    ? `
                <tr>
                  <td align="center" style="padding: 0 40px 30px 40px;">
                    <a href="${buttonUrl}" style="display: inline-block; padding: 14px 32px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">${buttonText}</a>
                  </td>
                </tr>
                `
                    : ''
                }

                <!-- Footer Note (if provided) -->
                ${
                  footerNote
                    ? `
                <tr>
                  <td style="padding: 0 40px 20px 40px; border-top: 1px solid #e5e7eb;">
                    ${footerNote}
                  </td>
                </tr>
                `
                    : ''
                }

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px 40px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      © ${new Date().getFullYear()} ${chapterName}. ${t.allRightsReserved}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}
