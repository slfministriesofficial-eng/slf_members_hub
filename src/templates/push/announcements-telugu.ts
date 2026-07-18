import type { Template } from './announcements'

/**
 * Telugu versions of the announcement starter templates — same keys as the
 * English set in ./announcements.ts, so the composer's language toggle can
 * swap the applied template in place. Structure mirrors the English ones:
 * natural description with [తేదీ] / [సమయం] placeholders the admin fills in,
 * closing with the bold church signature. The `*asterisks*` are WhatsApp bold
 * markers (rendered bold there, stripped automatically for push).
 */

/** Bold full church name in Telugu — the standard sign-off. */
export const SIGN_OFF_TELUGU = '*సారా లివింగ్ ఫెయిత్ మినిస్ట్రీస్*'

const VENUE_TELUGU = 'SLF మినిస్ట్రీస్, తాడిగడప'

export const TELUGU_TEMPLATES: Template[] = [
  {
    key: 'sunday-service',
    label: 'ఆదివారం ఆరాధన',
    title: 'ఆదివారం ఆరాధన ఆహ్వానం',
    message: [
      'ప్రియమైన సంఘ కుటుంబ సభ్యులారా,',
      '',
      `ఈ ఆదివారం [తేదీ] న [సమయం] గంటలకు ${VENUE_TELUGU}లో జరిగే ఆరాధనకు మిమ్మల్ని, మీ కుటుంబాన్ని ప్రేమతో ఆహ్వానిస్తున్నాము.`,
      '',
      'ఆరాధన, ప్రార్థన మరియు సహవాసంలో కలిసి దేవుని సన్నిధిలో ఎదుగుదాం.',
      '',
      'దేవుడు మిమ్మల్ని, మీ కుటుంబాన్ని ఆశీర్వదించును గాక.',
      '',
      SIGN_OFF_TELUGU,
    ].join('\n'),
  },
  {
    key: 'prayer-meeting',
    label: 'ప్రార్థన కూటమి',
    title: 'ప్రార్థన కూటమి ఆహ్వానం',
    message: [
      'ప్రియమైన సంఘ కుటుంబ సభ్యులారా,',
      '',
      `దేవుని నడిపింపు మరియు ఆశీర్వాదాల కోసం కలిసి ప్రార్థించేందుకు [తేదీ] న [సమయం] గంటలకు ${VENUE_TELUGU}లో జరిగే ప్రార్థన కూటమికి రండి.`,
      '',
      '"ప్రార్థన సమస్తాన్ని మారుస్తుంది."',
      '',
      'మీతో కలిసి ప్రార్థించాలని ఎదురుచూస్తున్నాము.',
      '',
      SIGN_OFF_TELUGU,
    ].join('\n'),
  },
  {
    key: 'youth-meeting',
    label: 'యువజన సహవాసం',
    title: 'యువజన సహవాసం',
    message: [
      'ప్రియమైన యువతీ యువకులారా,',
      '',
      `[తేదీ] న [సమయం] గంటలకు ${VENUE_TELUGU}లో జరిగే యువజన సహవాసానికి మీకు ఆహ్వానం.`,
      '',
      'ఆరాధన, వాక్య ధ్యానం, సహవాసం మరియు ఆనందం కోసం మీ స్నేహితులతో కలిసి రండి.',
      '',
      'అక్కడ కలుద్దాం!',
      '',
      SIGN_OFF_TELUGU,
    ].join('\n'),
  },
  {
    key: 'choir-practice',
    label: 'గాయక బృంద సాధన',
    title: 'గాయక బృంద సాధన',
    message: [
      'ప్రియమైన గాయక బృంద సభ్యులారా,',
      '',
      `[తేదీ] న [సమయం] గంటలకు ${VENUE_TELUGU}లో జరిగే మన గాయక బృంద సాధన గురించి గుర్తు చేస్తున్నాము.`,
      '',
      'దయచేసి కొద్ది నిమిషాల ముందుగా వచ్చి, ఆరాధన సాధనకు సిద్ధంగా ఉండండి.',
      '',
      'సంగీతం ద్వారా దేవుణ్ణి సేవిస్తున్నందుకు ధన్యవాదాలు.',
      '',
      SIGN_OFF_TELUGU,
    ].join('\n'),
  },
  {
    key: 'bible-study',
    label: 'వాక్య ధ్యానం',
    title: 'వాక్య ధ్యానం ఆహ్వానం',
    message: [
      'ప్రియమైన సంఘ కుటుంబ సభ్యులారా,',
      '',
      `[తేదీ] న [సమయం] గంటలకు ${VENUE_TELUGU}లో జరిగే వాక్య ధ్యానంలో పాల్గొనండి.`,
      '',
      'దేవుని వాక్యంలో కలిసి లోతుగా ఎదుగుదాం.',
      '',
      'మిమ్మల్ని కలవాలని ఎదురుచూస్తున్నాము.',
      '',
      SIGN_OFF_TELUGU,
    ].join('\n'),
  },
  {
    key: 'special-event',
    label: 'ప్రత్యేక కార్యక్రమం',
    title: 'ప్రత్యేక సంఘ కార్యక్రమం',
    message: [
      'ప్రియమైన సంఘ కుటుంబ సభ్యులారా,',
      '',
      `[తేదీ] న [సమయం] గంటలకు ${VENUE_TELUGU}లో జరిగే మన ప్రత్యేక కార్యక్రమానికి మీకు హృదయపూర్వక ఆహ్వానం.`,
      '',
      'మీ కుటుంబ సభ్యులతో, స్నేహితులతో కలిసి వచ్చి ఆనందించండి.',
      '',
      'దేవుని ఆశీర్వాదాలు మీపై ఉండును గాక!',
      '',
      SIGN_OFF_TELUGU,
    ].join('\n'),
  },
  {
    key: 'emergency-update',
    label: 'అత్యవసర సమాచారం',
    title: 'ముఖ్యమైన సంఘ ప్రకటన',
    message: [
      'ప్రియమైన సంఘ కుటుంబ సభ్యులారా,',
      '',
      'దయచేసి ఈ ముఖ్యమైన సమాచారాన్ని గమనించండి:',
      '',
      '[వివరాలు ఇక్కడ రాయండి]',
      '',
      'మీ సహకారానికి ధన్యవాదాలు.',
      '',
      'దేవుడు మిమ్మల్ని ఆశీర్వదించును గాక.',
      '',
      SIGN_OFF_TELUGU,
    ].join('\n'),
  },
]
