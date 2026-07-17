const SHEET_NAME = 'Members';

const HEADERS = [
  'Member ID',
  'Registration Date',
  'Join Date',
  'Full Name',
  'Preferred Name',
  'Gender',
  'Date of Birth',
  'Marital Status',
  'Anniversary Date',
  'Blood Group',
  'Primary Phone',
  'WhatsApp Number',
  'Email Address',
  'Address',
  'Emergency Contact Name',
  'Emergency Contact Phone',
  'Emergency Contact Relation',
  'Occupation',
  'First Time Visiting',
  'Previous Church/Club',
  'Baptism Status',
  'Baptism Date',
  'Baptized By',
  'Believer Since (Years)',
  'Ministry/Group',
  'Family ID',
  "Spouse's Name",
  "Spouse's Date of Birth",
  "Spouse's Phone",
  'Children (Name & DOB)',
  'Declaration Confirmation',
]

// Maps the camelCase field names the frontend sends to the sheet's column headers,
// so the JSON contract mirrors MemberFormData instead of the sheet's exact header text.
const FIELD_MAP = {
  memberId: 'Member ID',
  registrationDate: 'Registration Date',
  joiningDate: 'Join Date',
  fullName: 'Full Name',
  preferredName: 'Preferred Name',
  gender: 'Gender',
  dob: 'Date of Birth',
  maritalStatus: 'Marital Status',
  marriageDay: 'Anniversary Date',
  bloodGroup: 'Blood Group',
  mobile: 'Primary Phone',
  whatsapp: 'WhatsApp Number',
  email: 'Email Address',
  address: 'Address',
  emergencyName: 'Emergency Contact Name',
  emergencyMobile: 'Emergency Contact Phone',
  emergencyRelationship: 'Emergency Contact Relation',
  occupation: 'Occupation',
  firstTimeVisiting: 'First Time Visiting',
  previousChurch: 'Previous Church/Club',
  baptized: 'Baptism Status',
  baptizedDate: 'Baptism Date',
  baptizedBy: 'Baptized By',
  believerYears: 'Believer Since (Years)',
  ministryInterests: 'Ministry/Group',
  familyId: 'Family ID',
  spouseName: "Spouse's Name",
  spouseDob: "Spouse's Date of Birth",
  spouseMobile: "Spouse's Phone",
  children: 'Children (Name & DOB)',
  declarationConfirmed: 'Declaration Confirmation',
}

// Fields the public digital-profile page (QR scan destination) is allowed to see.
// Everything else (phone, email, address, emergency/spouse/children info) never
// leaves the server for a public request, regardless of what the page renders.
const PUBLIC_SAFE_FIELDS = [
  'memberId',
  'fullName',
  'joiningDate',
  'registrationDate',
  'ministryInterests',
  'believerYears',
  'baptized',
  'baptizedDate',
  'bloodGroup',
  'firstTimeVisiting',
]

function toPublicFields(fields) {
  const safe = {}
  PUBLIC_SAFE_FIELDS.forEach((key) => {
    safe[key] = fields[key]
  })
  return safe
}

function doGet(e) {
  // Lightweight count endpoint for the Announcements page's
  // "Send Notification to N Devices" label.
  if (e.parameter && e.parameter.tokens === 'count') {
    return jsonResponse({ count: countFcmTokens() })
  }

  const sheet = getSheet()
  const rows = sheet.getDataRange().getValues()
  const records = rows
    .slice(1)
    .map((row) => rowToRecord(HEADERS, row))
    .filter((r) => r['Member ID'])
    .map(recordToFields)

  const id = e.parameter && e.parameter.id
  const isPublic = e.parameter && e.parameter.public === '1'

  if (id) {
    const match = records.find((r) => r.memberId === id)
    if (!match) return jsonResponse(null)
    return jsonResponse(isPublic ? toPublicFields(match) : match)
  }

  // Public mode always requires a specific id — never dump the full roster.
  if (isPublic) return jsonResponse({ error: 'Missing id' })

  return jsonResponse(records)
}

function doPost(e) {
  const lock = LockService.getScriptLock()
  lock.waitLock(30000)
  try {
    const body = JSON.parse(e.postData.contents)

    if (body.action === 'create') return jsonResponse(createMember(body))
    if (body.action === 'update') return jsonResponse(updateMember(body))
    if (body.action === 'delete') return jsonResponse(deleteMember(body))
    if (body.action === 'saveFcmToken') return jsonResponse(saveFCMToken(body))
    if (body.action === 'deleteFcmToken') return jsonResponse(deleteFCMToken(body))
    if (body.action === 'sendPush') return jsonResponse(sendPushBroadcast(body))

    return jsonResponse({ error: 'Unknown action: ' + body.action })
  } catch (err) {
    return jsonResponse({ error: err.message })
  } finally {
    lock.releaseLock()
  }
}

function createMember(body) {
  const sheet = getSheet()
  const record = fieldsToRecord(body)
  record['Member ID'] = nextMemberId(sheet)
  record['Registration Date'] = formatDate(new Date())

  sheet.appendRow(HEADERS.map((h) => toCellValue(h, record[h])))
  return recordToFields(record)
}

function updateMember(body) {
  const sheet = getSheet()
  const rowIndex = findRowByMemberId(sheet, body.memberId)
  if (rowIndex === -1) return { error: 'Member not found: ' + body.memberId }

  const existing = rowToRecord(HEADERS, sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0])
  const updates = fieldsToRecord(body)
  const merged = Object.assign({}, existing, updates, {
    'Member ID': existing['Member ID'],
    'Registration Date': existing['Registration Date'],
  })

  sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([
    HEADERS.map((h) => toCellValue(h, merged[h])),
  ])
  return recordToFields(merged)
}

function deleteMember(body) {
  const sheet = getSheet()
  const rowIndex = findRowByMemberId(sheet, body.memberId)
  if (rowIndex === -1) return { error: 'Member not found: ' + body.memberId }

  sheet.deleteRow(rowIndex)
  return { deleted: body.memberId }
}

function fieldsToRecord(body) {
  const record = {}
  Object.keys(FIELD_MAP).forEach((field) => {
    if (!(field in body)) return
    record[FIELD_MAP[field]] = serializeValue(field, body[field])
  })
  return record
}

function serializeValue(field, value) {
  if (field === 'children' && Array.isArray(value)) {
    return value.map((c) => (c.name || '') + ' (' + (c.dob || '') + ')').join('; ')
  }
  if (field === 'ministryInterests' && Array.isArray(value)) {
    return value.join(', ')
  }
  if (field === 'declarationConfirmed') {
    return value ? 'Yes' : 'No'
  }
  return value
}

// Converts a header-keyed sheet record back into the camelCase field names the
// frontend expects, so GET and POST use the same shape (mirror of fieldsToRecord).
function recordToFields(record) {
  const fields = {}
  Object.keys(FIELD_MAP).forEach((field) => {
    fields[field] = deserializeValue(field, record[FIELD_MAP[field]])
  })
  return fields
}

function deserializeValue(field, value) {
  if (field === 'children') {
    if (!value) return []
    return value
      .toString()
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const match = /^(.*)\s\((.*)\)$/.exec(part)
        return match ? { name: match[1].trim(), dob: match[2].trim() } : { name: part, dob: '' }
      })
  }
  if (field === 'ministryInterests') {
    return value
      ? value
          .toString()
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []
  }
  if (field === 'declarationConfirmed') {
    return value === 'Yes' || value === true
  }
  return value === undefined || value === null ? '' : value
}

// Member IDs are formatted SLF-0001 — find the highest existing number and increment it.
function nextMemberId(sheet) {
  const count = Math.max(sheet.getLastRow() - 1, 0)
  const values = count > 0 ? sheet.getRange(2, 1, count, 1).getValues() : []
  let max = 0
  values.forEach((row) => {
    const match = /^SLF-(\d+)$/.exec(row[0])
    if (match) max = Math.max(max, parseInt(match[1], 10))
  })
  return 'SLF-' + String(max + 1).padStart(4, '0')
}

function findRowByMemberId(sheet, memberId) {
  const count = Math.max(sheet.getLastRow() - 1, 0)
  const values = count > 0 ? sheet.getRange(2, 1, count, 1).getValues() : []
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === memberId) return i + 2 // +2: skip header row, 1-indexed
  }
  return -1
}

// Sheets auto-converts a pure-digit string into a Number, and a "YYYY-MM-DD"-looking
// string into its own Date type, on write — force these columns to stay plain text.
const TEXT_HEADERS = [
  'Primary Phone',
  'WhatsApp Number',
  'Emergency Contact Phone',
  "Spouse's Phone",
  'Registration Date',
  'Join Date',
  'Date of Birth',
  'Anniversary Date',
  'Baptism Date',
  "Spouse's Date of Birth",
]

function toCellValue(header, value) {
  const v = value !== undefined && value !== null ? value : ''
  if (TEXT_HEADERS.indexOf(header) !== -1 && v !== '') return "'" + v
  return v
}

function rowToRecord(headers, row) {
  const record = {}
  headers.forEach((h, i) => {
    record[h] = row[i]
  })
  return record
}

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd')
}

function getSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
  if (!sheet) throw new Error('Sheet not found: ' + SHEET_NAME)
  return sheet
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON)
}

// ============================== FCM TOKENS ==============================
// Push-notification token registry — one row per browser/device that has
// enabled notifications. Upserted by token, so re-registrations and
// Firebase's silent token rotations never create duplicate rows.

const FCM_SHEET_NAME = 'FCM Tokens'
const FCM_HEADERS = ['Member ID', 'Token', 'Platform', 'Browser', 'Updated At', 'Audience']

/**
 * Get (or create on first use) the "FCM Tokens" sheet with its header row.
 * Also upgrades a sheet created before the "Audience" column existed.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} the tokens sheet
 */
function getFcmSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = spreadsheet.getSheetByName(FCM_SHEET_NAME)
  if (!sheet) {
    sheet = spreadsheet.insertSheet(FCM_SHEET_NAME)
    sheet.appendRow(FCM_HEADERS)
  } else if (sheet.getLastColumn() < FCM_HEADERS.length) {
    sheet.getRange(1, 1, 1, FCM_HEADERS.length).setValues([FCM_HEADERS])
  }
  return sheet
}

/**
 * How many devices are registered for push notifications.
 * @returns {number} token row count (excluding the header)
 */
function countFcmTokens() {
  const sheet = getFcmSheet()
  return Math.max(sheet.getLastRow() - 1, 0)
}

/**
 * Save or update an FCM token, linked to a member ID.
 * Matching row (by token) is updated in place; otherwise a row is appended.
 * @param {{memberId: string, token: string, platform: string, browser: string, updatedAt: string, audience: string}} body
 * @returns {{saved: boolean, memberId: string}} confirmation payload
 */
function saveFCMToken(body) {
  if (!body.token) throw new Error('Missing token')
  if (!body.memberId) throw new Error('Missing memberId')

  const sheet = getFcmSheet()
  const rows = sheet.getDataRange().getValues()
  const rowValues = [
    body.memberId,
    body.token,
    body.platform || '',
    body.browser || '',
    body.updatedAt || new Date().toISOString(),
    body.audience === 'member' ? 'member' : 'admin',
  ]

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] === body.token) {
      sheet.getRange(i + 1, 1, 1, FCM_HEADERS.length).setValues([rowValues])
      return { saved: true, memberId: body.memberId }
    }
  }

  sheet.appendRow(rowValues)
  return { saved: true, memberId: body.memberId }
}

/**
 * Remove an FCM token row (called when a device disables notifications, so
 * future sends don't target a dead token).
 * @param {{token: string}} body
 * @returns {{deleted: boolean}} whether a matching row was removed
 */
function deleteFCMToken(body) {
  if (!body.token) throw new Error('Missing token')

  const sheet = getFcmSheet()
  const rows = sheet.getDataRange().getValues()
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] === body.token) {
      sheet.deleteRow(i + 1)
      return { deleted: true }
    }
  }
  return { deleted: false }
}

// ============================== PUSH SENDING ==============================

const FIREBASE_PROJECT_ID = 'slf-members-hub'
const YOUTUBE_LIVE_URL = 'https://youtube.com/@slfministriesvijayawada?si=FxNYdC6QAlKPxpV_'

/**
 * Send one push message to a list of tokens via the FCM HTTP v1 API.
 * Sends DATA-ONLY messages (title/body/url/tag inside the data field) — the
 * app's firebase-messaging-sw.js builds the visible notification from these,
 * which avoids the duplicate-notification problem mixed payloads cause.
 * @param {string[]} tokens FCM registration tokens to target
 * @param {{title: string, body: string, url?: string, tag?: string}} msg
 * @returns {{sent: number, failed: number}} delivery counts
 */
function sendPushToTokens(tokens, msg) {
  const url = 'https://fcm.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/messages:send'
  let sent = 0
  let failed = 0

  tokens.forEach(function (token) {
    if (!token) return
    const payload = {
      message: {
        token: token,
        data: {
          title: msg.title || 'SLF Members Hub',
          body: msg.body || '',
          url: msg.url || '/',
          tag: msg.tag || 'slf-members-hub',
        },
        webpush: { headers: { Urgency: 'high', TTL: '3600' } },
      },
    }
    try {
      const response = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      })
      if (response.getResponseCode() === 200) sent++
      else failed++
    } catch (err) {
      failed++
    }
  })
  return { sent: sent, failed: failed }
}

/**
 * All registered tokens, optionally filtered by audience ('member'/'admin').
 * @param {string} [audience] omit for every token
 * @returns {string[]} FCM tokens
 */
function getFcmTokens(audience) {
  const rows = getFcmSheet().getDataRange().getValues()
  const tokens = []
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][1]) continue
    if (audience && rows[i][5] !== audience) continue
    tokens.push(rows[i][1])
  }
  return tokens
}

/**
 * "sendPush" web-app action — the Announcements page posts the composed
 * announcement here and it goes to EVERY registered device (members + admin).
 * @param {{title: string, body: string, url?: string}} body
 * @returns {{sent: number, failed: number}} delivery counts
 */
function sendPushBroadcast(body) {
  if (!body.title && !body.body) throw new Error('Missing notification content')
  return sendPushToTokens(getFcmTokens(), {
    title: body.title,
    body: body.body,
    url: body.url,
    tag: 'slf-announcement-' + new Date().getTime(),
  })
}

/**
 * Convenience for testing from the Apps Script editor: sends a test push to
 * every registered device.
 * @returns {{sent: number, failed: number}} delivery counts
 */
function sendTestPush() {
  return sendPushToTokens(getFcmTokens(), {
    title: 'SLF Members Hub',
    body: 'Test notification from Google Apps Script!',
  })
}

// ============================== SCHEDULED NOTIFICATIONS ==============================
// The church notification calendar. A single time-driven trigger fires
// runScheduledNotifications() every 15 minutes; it matches the current
// day + 15-minute slot against this table and sends whatever is due.
// Times are in the script's timezone — make sure Project Settings shows
// Asia/Kolkata (IST).
//
// day: 0 = Sunday ... 6 = Saturday, or '*' for every day. time: 'HH:mm' on a
// 15-minute boundary. url: where tapping the notification takes the member.

const SCHEDULE = [
  // Sunday Worship Service — Sunday 10:00 AM
  {
    key: 'sun-worship-r1',
    day: 6,
    time: '20:00',
    title: '📅 Tomorrow’s Worship Service',
    body: 'Join us tomorrow (Sunday) at 10:00 AM for worship, prayer, and God’s Word. We look forward to worshipping with you.',
  },
  {
    key: 'sun-worship-r2',
    day: 0,
    time: '09:30',
    title: '⏰ 30 Minutes to Go!',
    body: 'Sunday Worship Service begins at 10:00 AM. We look forward to seeing you.',
  },
  {
    key: 'sun-worship-live',
    day: 0,
    time: '10:00',
    title: '🔴 Sunday Worship Service is LIVE',
    body: 'Our worship service has begun. Join us live as we worship the Lord together.',
    url: YOUTUBE_LIVE_URL,
  },

  // Bible Study — Wednesday 8:00 PM
  {
    key: 'bible-r1',
    day: 3,
    time: '17:00',
    title: '📖 Bible Study Tonight',
    body: 'Join us today at 8:00 PM as we grow together in God’s Word.',
  },
  {
    key: 'bible-r2',
    day: 3,
    time: '19:30',
    title: '⏰ 30 Minutes Remaining',
    body: 'Bible Study begins at 8:00 PM. Get ready to join us.',
  },
  {
    key: 'bible-live',
    day: 3,
    time: '20:00',
    title: '🔴 Bible Study is LIVE',
    body: 'Join us now as we study God’s Word together.',
    url: YOUTUBE_LIVE_URL,
  },

  // Saturday Evening Service — Saturday 8:00 PM
  {
    key: 'sat-eve-r1',
    day: 6,
    time: '17:00',
    title: '🌅 Saturday Evening Service',
    body: 'Join us tonight at 8:00 PM for worship and fellowship.',
  },
  {
    key: 'sat-eve-r2',
    day: 6,
    time: '19:30',
    title: '⏰ 30 Minutes Remaining',
    body: 'Saturday Evening Service begins at 8:00 PM.',
  },
  {
    key: 'sat-eve-live',
    day: 6,
    time: '20:00',
    title: '🔴 Saturday Evening Service is LIVE',
    body: 'Join us now for worship and God’s Word.',
    url: YOUTUBE_LIVE_URL,
  },

  // SLF Family Online Prayer — every day 6:30 PM
  {
    key: 'prayer-r1',
    day: '*',
    time: '17:30',
    title: '🙏 SLF Family Online Prayer',
    body: 'Join us today at 6:30 PM as we come together in prayer.',
  },
  {
    key: 'prayer-r2',
    day: '*',
    time: '18:15',
    title: '⏰ Prayer Begins in 15 Minutes',
    body: 'Get ready to join the SLF Family Online Prayer.',
  },
  {
    key: 'prayer-live',
    day: '*',
    time: '18:30',
    title: '🔴 SLF Family Online Prayer is LIVE',
    body: 'Let us come together in prayer and seek the Lord.',
    url: YOUTUBE_LIVE_URL,
  },
]

/**
 * Dispatcher — runs every 15 minutes via a clock trigger. Rounds "now" to the
 * nearest 15-minute slot (clock triggers drift a few minutes), finds SCHEDULE
 * entries due in this slot, and sends each at most once per day
 * (CacheService guards against double-fires).
 */
function runScheduledNotifications() {
  const now = new Date()
  const tz = Session.getScriptTimeZone()
  let hour = now.getHours()
  let minute = Math.round(now.getMinutes() / 15) * 15
  if (minute === 60) {
    minute = 0
    hour += 1
  }
  if (hour === 24) return // nothing scheduled at midnight; skip day-rollover edge
  const slot = (hour < 10 ? '0' : '') + hour + ':' + (minute < 10 ? '0' : '') + minute
  const day = now.getDay()
  const dateKey = Utilities.formatDate(now, tz, 'yyyy-MM-dd')
  const cache = CacheService.getScriptCache()

  const due = SCHEDULE.filter(function (entry) {
    return entry.time === slot && (entry.day === '*' || entry.day === day)
  })
  if (due.length === 0) return

  const tokens = getFcmTokens()
  if (tokens.length === 0) return

  due.forEach(function (entry) {
    const dedupeKey = 'push-' + dateKey + '-' + slot + '-' + entry.key
    if (cache.get(dedupeKey)) return
    cache.put(dedupeKey, '1', 21600) // 6h — far longer than any trigger drift
    sendPushToTokens(tokens, {
      title: entry.title,
      body: entry.body,
      url: entry.url,
      tag: 'slf-' + entry.key,
    })
  })
}

/**
 * One-time setup: run this once from the Apps Script editor. Creates the
 * every-15-minutes clock trigger for runScheduledNotifications (removing any
 * older duplicates first, so re-running is always safe).
 * @returns {string} confirmation text
 */
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'runScheduledNotifications') {
      ScriptApp.deleteTrigger(trigger)
    }
  })
  ScriptApp.newTrigger('runScheduledNotifications').timeBased().everyMinutes(15).create()
  return 'Scheduled-notification trigger installed (runs every 15 minutes).'
}
