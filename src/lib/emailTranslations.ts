export type EmailLocale = 'lv' | 'en'

export const emailTranslations = {
  lv: {
    // Common
    greeting: 'Sveiki',
    allRightsReserved: 'Visas tiesības aizsargātas.',
    copyLinkNote: 'Vai kopējiet un ielīmējiet šo saiti savā pārlūkprogrammā:',

    // Magic link
    magicLink: {
      subject: 'Jūsu pieslēgšanās saite',
      title: 'Pieslēgties kontam',
      hello: 'Sveiki',
      clickToSignIn:
        'Noklikšķiniet uz pogas zemāk, lai pieslēgtos savam kontam. Parole nav nepieciešama!',
      signInButton: 'Pieslēgties',
      linkExpires: 'Šī saite derīga 15 minūtes.',
      ignoreIfNotRequested:
        'Ja jūs nepieprasījāt šo pieslēgšanās saiti, varat droši ignorēt šo e-pastu.',
    },

    // Password reset
    passwordReset: {
      subject: 'Paroles atjaunošana',
      title: 'Atjaunot paroli',
      hello: 'Sveiki',
      requestReceived:
        'Mēs saņēmām pieprasījumu atjaunot jūsu konta paroli. Noklikšķiniet uz pogas zemāk, lai izveidotu jaunu paroli:',
      resetButton: 'Atjaunot paroli',
      linkExpires: 'Šī saite derīga 1 stundu.',
      ignoreIfNotRequested:
        'Ja jūs nepieprasījāt paroles atjaunošanu, varat droši ignorēt šo e-pastu. Jūsu parole paliks nemainīta.',
    },

    // Contact form
    contact: {
      adminSubject: 'Jauns kontaktformas ziņojums',
      adminTitle: 'Jauns kontaktformas ziņojums',
      subject: 'Tēma',
      contactDetails: 'Kontaktinformācija',
      name: 'Vārds',
      email: 'E-pasts',
      phone: 'Tālrunis',
      message: 'Ziņojums',
      submitted: 'Nosūtīts',
      viewInAdmin: 'Skatīt admin panelī',

      userSubject: 'Paldies par jūsu ziņojumu',
      userTitle: 'Paldies par jūsu ziņojumu!',
      userGreeting: 'Cienījamais',
      userMessage: 'Mēs esam saņēmuši jūsu ziņojumu un atbildēsim pēc iespējas ātrāk.',
      yourMessage: 'Jūsu ziņojums',
    },

    // Event registration
    event: {
      adminSubject: 'Jauna reģistrācija pasākumam',
      adminTitle: 'Jauna reģistrācija pasākumam',
      wantsToParticipate: 'Kāds vēlas piedalīties jūsu pasākumā!',
      eventLabel: 'Pasākums',
      date: 'Datums',
      location: 'Vieta',
      registrantDetails: 'Dalībnieka informācija',
      name: 'Vārds',
      email: 'E-pasts',
      phone: 'Tālrunis',
      company: 'Uzņēmums',
      invitedBy: 'Mani uzaicināja',
      message: 'Ziņojums',
      submitted: 'Nosūtīts',
      viewInAdmin: 'Skatīt admin panelī',

      userSubject: 'Reģistrācija apstiprināta',
      userTitle: 'Paldies par reģistrāciju!',
      userGreeting: 'Cienījamais',
      registrationConfirmed: 'Jūsu reģistrācija pasākumam',
      hasBeenConfirmed: 'ir apstiprināta.',
      eventDetails: 'Pasākuma informācija',
      calendarNote: 'Šim e-pastam ir pievienots kalendāra uzaicinājums. Lūdzu, pievienojiet to savam kalendāram.',
      lookForward: 'Gaidīsim jūs pasākumā!',
      reminder: 'Atgādinājums: Pasākums sākas pēc 1 stundas',
    },

    // Activity notifications (1-2-1 meetings, referrals)
    activity: {
      // Meetings
      meetingCreatedSubject: 'Jauna 1-2-1 tikšanās reģistrēta',
      meetingCreatedTitle: 'Jauna 1-2-1 tikšanās',
      meetingRegistered: 'ir reģistrējis 1-2-1 tikšanos ar jums.',
      meetingDate: 'Datums',
      meetingLocation: 'Vieta',
      meetingInvitedBy: 'Uzaicināja',
      meetingTopics: 'Tēmas',
      meetingCanComment: 'Jūs varat pievienot komentārus par šo tikšanos savā profilā.',
      viewActivities: 'Skatīt aktivitātes',

      // Meeting comments
      commentSubject: 'Jauns komentārs 1-2-1 tikšanās ierakstam',
      commentTitle: 'Jauns komentārs',
      commentAdded: 'ir pievienojis komentāru jūsu 1-2-1 tikšanās ierakstam',

      // Referrals
      referralCreatedSubject: 'Jauna rekomendācija saņemta',
      referralCreatedTitle: 'Jauna rekomendācija',
      referralRegistered: 'ir reģistrējis rekomendāciju jums.',
      referralDate: 'Datums',
      referralFrom: 'No',
      referralPotentialValue: 'Potenciālā vērtība',
      referralDescription: 'Apraksts',
      referralUpdateStatus: 'Lūdzu, atjauniniet rekomendācijas statusu, kad būsiet sazinājušies ar klientu.',
      viewReferrals: 'Skatīt rekomendācijas',

      // Referral status
      referralStatusSubject: 'Rekomendācijas statuss atjaunināts',
      referralStatusTitle: 'Rekomendācijas statuss atjaunināts',
      referralStatusUpdated: 'ir atjauninājis jūsu dotās rekomendācijas statusu.',
      referralStatus: 'Statuss',
      referralRecipient: 'Saņēmējs',
      referralBusinessValue: 'Darījuma vērtība',
      referralSuccess: 'VEIKSMĪGA',
      referralFailed: 'NEVEIKSMĪGA',
      referralCongrats: 'Apsveicam ar veiksmīgu rekomendāciju!',
    },

    // Email change
    emailChange: {
      subject: 'E-pasta maiņas apstiprināšana',
      title: 'Apstiprini jauno e-pasta adresi',
      hello: 'Sveiki',
      requestReceived: 'Jūs pieprasījāt mainīt savu e-pasta adresi uz:',
      confirmButton: 'Apstiprināt e-pastu',
      linkExpires: 'Šī saite derīga 1 stundu.',
      ignoreIfNotRequested:
        'Ja jūs nepieprasījāt šo maiņu, varat droši ignorēt šo e-pastu. Jūsu e-pasta adrese paliks nemainīta.',
      willBeUsername: 'Šis e-pasts tiks izmantots arī kā lietotājvārds pieslēgšanās laikā.',
      notificationSubject: 'E-pasta maiņas pieprasījums',
      notificationTitle: 'E-pasta maiņas pieprasījums',
      notificationMessage: 'Kāds ir pieprasījis nomainīt jūsu konta e-pasta adresi uz jaunu adresi. Ja tas nebijāt jūs, lūdzu, sazinieties ar administratoru.',
    },

    // Generic
    user: 'Lietotājs',
  },

  en: {
    // Common
    greeting: 'Hello',
    allRightsReserved: 'All rights reserved.',
    copyLinkNote: 'Or copy and paste this link into your browser:',

    // Magic link
    magicLink: {
      subject: 'Your Login Link',
      title: 'Sign In to Your Account',
      hello: 'Hello',
      clickToSignIn:
        'Click the button below to sign in to your account. No password needed!',
      signInButton: 'Sign In',
      linkExpires: 'This link will expire in 15 minutes.',
      ignoreIfNotRequested:
        "If you didn't request this login link, you can safely ignore this email.",
    },

    // Password reset
    passwordReset: {
      subject: 'Reset Your Password',
      title: 'Reset Your Password',
      hello: 'Hello',
      requestReceived:
        'We received a request to reset your password for your account. Click the button below to create a new password:',
      resetButton: 'Reset Password',
      linkExpires: 'This link will expire in 1 hour.',
      ignoreIfNotRequested:
        "If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.",
    },

    // Contact form
    contact: {
      adminSubject: 'New Contact Form Submission',
      adminTitle: 'New Contact Form Submission',
      subject: 'Subject',
      contactDetails: 'Contact Details',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      message: 'Message',
      submitted: 'Submitted',
      viewInAdmin: 'View in Admin Panel',

      userSubject: 'Thank you for contacting us',
      userTitle: 'Thank You for Your Message!',
      userGreeting: 'Dear',
      userMessage: 'We have received your message and will get back to you as soon as possible.',
      yourMessage: 'Your Message',
    },

    // Event registration
    event: {
      adminSubject: 'New Event Registration',
      adminTitle: 'New Event Registration Received',
      wantsToParticipate: 'Someone wants to participate in your event!',
      eventLabel: 'Event',
      date: 'Date',
      location: 'Location',
      registrantDetails: 'Registrant Details',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      company: 'Company',
      invitedBy: 'Invited By',
      message: 'Message',
      submitted: 'Submitted',
      viewInAdmin: 'View in Admin Panel',

      userSubject: 'Registration Confirmed',
      userTitle: 'Thank You for Registering!',
      userGreeting: 'Dear',
      registrationConfirmed: 'Your registration for',
      hasBeenConfirmed: 'has been confirmed.',
      eventDetails: 'Event Details',
      calendarNote: 'A calendar invitation is attached to this email. Please add it to your calendar.',
      lookForward: 'We look forward to seeing you at the event!',
      reminder: 'Reminder: Event starts in 1 hour',
    },

    // Activity notifications (1-2-1 meetings, referrals)
    activity: {
      // Meetings
      meetingCreatedSubject: 'New 1-2-1 Meeting Registered',
      meetingCreatedTitle: 'New 1-2-1 Meeting',
      meetingRegistered: 'has registered a 1-2-1 meeting with you.',
      meetingDate: 'Date',
      meetingLocation: 'Location',
      meetingInvitedBy: 'Invited By',
      meetingTopics: 'Topics',
      meetingCanComment: 'You can add comments about this meeting in your profile.',
      viewActivities: 'View Activities',

      // Meeting comments
      commentSubject: 'New Comment on 1-2-1 Meeting',
      commentTitle: 'New Comment',
      commentAdded: 'has added a comment to your 1-2-1 meeting record',

      // Referrals
      referralCreatedSubject: 'New Referral Received',
      referralCreatedTitle: 'New Referral',
      referralRegistered: 'has registered a referral for you.',
      referralDate: 'Date',
      referralFrom: 'From',
      referralPotentialValue: 'Potential Value',
      referralDescription: 'Description',
      referralUpdateStatus: 'Please update the referral status once you have contacted the client.',
      viewReferrals: 'View Referrals',

      // Referral status
      referralStatusSubject: 'Referral Status Updated',
      referralStatusTitle: 'Referral Status Updated',
      referralStatusUpdated: 'has updated the status of your referral.',
      referralStatus: 'Status',
      referralRecipient: 'Recipient',
      referralBusinessValue: 'Business Value',
      referralSuccess: 'SUCCESS',
      referralFailed: 'FAILED',
      referralCongrats: 'Congratulations on a successful referral!',
    },

    // Email change
    emailChange: {
      subject: 'Email Change Confirmation',
      title: 'Confirm Your New Email Address',
      hello: 'Hello',
      requestReceived: 'You requested to change your email address to:',
      confirmButton: 'Confirm Email',
      linkExpires: 'This link will expire in 1 hour.',
      ignoreIfNotRequested:
        "If you didn't request this change, you can safely ignore this email. Your email address will remain unchanged.",
      willBeUsername: 'This email will also be used as your username for signing in.',
      notificationSubject: 'Email Change Request',
      notificationTitle: 'Email Change Request',
      notificationMessage: 'Someone has requested to change your account email address to a new address. If this was not you, please contact the administrator.',
    },

    // Generic
    user: 'User',
  },
} as const

export function getEmailTranslations(locale: EmailLocale) {
  return emailTranslations[locale] || emailTranslations.en
}

// Server runs in UTC; fall back to Latvia timezone when a site-specific one is unavailable
export const DEFAULT_EMAIL_TIMEZONE = 'UTC'

export function formatDateForEmail(
  dateString: string,
  locale: EmailLocale,
  timezone?: string | null,
): string {
  const dateLocale = locale === 'lv' ? 'lv-LV' : 'en-US'
  return new Date(dateString).toLocaleDateString(dateLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone || DEFAULT_EMAIL_TIMEZONE,
  })
}

export function formatDateTimeForEmail(
  dateString: string,
  locale: EmailLocale,
  timezone?: string | null,
): string {
  const dateLocale = locale === 'lv' ? 'lv-LV' : 'en-US'
  return new Date(dateString).toLocaleString(dateLocale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone || DEFAULT_EMAIL_TIMEZONE,
    timeZoneName: 'short',
  })
}
