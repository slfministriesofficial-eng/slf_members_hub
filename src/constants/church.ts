import founderPhoto from '../assets/gallery/bishop-narayana-rao-avatar.jpg'

type LeaderInfo = { name: string; title: string; bio: string; photo?: string }

// Single source of truth for the org's own contact/service info — used on the
// ID card back and the public digital member profile page.
export const CHURCH_INFO = {
  name: 'Sarah Living Faith Ministries',
  shortName: 'SLF Ministries',
  city: 'Vijayawada',
  tagline: 'Building Lives · Sharing Christ · Serving God',
  addressLines: ['SLF Ministries, Tadigadapa,', 'Vijayawada, Andhra Pradesh – 520007'],
  phone: '+91 96422 95097',
  email: 'slfministriesofficial@gmail.com',
  website: 'www.slfministries.org',
  welcomeMessage:
    "Welcome to the official Digital Member Portal of SLF Ministries. We are delighted to welcome you to our church family. May the grace, peace, and love of our Lord Jesus Christ be with you.",
  about:
    "SLF Ministries (Sarah Living Faith Ministries) is a Christ-centered church dedicated to sharing the Gospel, building faithful disciples, strengthening families, and serving our community with God's love. Our mission is to lead people into a deeper relationship with Jesus Christ through worship, prayer, biblical teaching, fellowship, and compassionate service.",
  services: [
    { label: 'Morning Worship', time: '9:00 AM' },
    { label: 'Evening Worship', time: '6:00 PM' },
  ],
  // Second entry is still a placeholder — swap in the real name/title/bio/photo whenever ready.
  leadership: [
    {
      name: 'Bishop V. Narayana Rao Garu',
      title: 'Founder of SLF Ministries',
      bio: 'Leading our congregation with faith, wisdom, and a heart for God’s word.',
      photo: founderPhoto,
    },
    {
      name: "Pastor's Name",
      title: 'Associate Pastor',
      bio: 'Serving the church family with dedication, compassion, and steady discipleship.',
    },
  ] satisfies LeaderInfo[],
  // Placeholder tiles — swap for real photos later, same six categories.
  gallery: [
    { label: 'Worship Service', icon: 'megaphone' },
    { label: 'Church Building', icon: 'building' },
    { label: 'Youth Fellowship', icon: 'users' },
    { label: 'Baptism Service', icon: 'cross' },
    { label: 'Christmas Celebration', icon: 'cake' },
    { label: 'Prayer Meeting', icon: 'heart' },
  ],
  social: {
    instagram: 'https://www.instagram.com/s.l.f.ministries_vijayawada',
    youtube: 'https://youtube.com/@slfministriesvijayawada',
    website: 'https://www.slfministries.org',
  },
  // No API key needed — Google's plain address-embed format. Swap for a precise
  // "share > embed" link from Google Maps if exact pin placement matters later.
  mapsEmbedUrl:
    'https://www.google.com/maps?q=' +
    encodeURIComponent('SLF Ministries, Tadigadapa, Vijayawada, Andhra Pradesh 520007') +
    '&output=embed',
  mapsLinkUrl:
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent('SLF Ministries, Tadigadapa, Vijayawada, Andhra Pradesh 520007'),
}
