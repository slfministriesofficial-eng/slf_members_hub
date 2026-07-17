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

  // Per-member notification status for the bell indicator on member cards.
  // Deliberately returns NO token values — only whether each member has a
  // registration and which device/browser it came from.
  if (e.parameter && e.parameter.tokens === 'status') {
    return jsonResponse(getFcmStatusByMember())
  }

  // Upcoming-triggers view for the admin's Notification Schedule page —
  // computed HERE so the page always mirrors what the trigger will really
  // fire (SCHEDULE + member dates live server-side; no duplicated logic).
  if (e.parameter && e.parameter.schedule === 'upcoming') {
    return jsonResponse(getUpcomingSchedule())
  }

  // Master automation state + individually paused members, for the admin's
  // notification controls on the Follow-ups page.
  if (e.parameter && e.parameter.settings === 'notifications') {
    return jsonResponse(getNotificationSettings())
  }

  // This month's send log for the dashboard's "Notifications sent" card.
  if (e.parameter && e.parameter.history === 'notifications') {
    return jsonResponse(getNotificationHistory())
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
    if (body.action === 'schedulePush') return jsonResponse(schedulePush(body))
    if (body.action === 'setNotificationsEnabled') return jsonResponse(setNotificationsEnabled(body))
    if (body.action === 'setMemberMuted') return jsonResponse(setMemberMuted(body))
    if (body.action === 'setNotificationKeyEnabled') return jsonResponse(setNotificationKeyEnabled(body))

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
 * How many devices a church-wide send will actually reach right now —
 * registered tokens minus any belonging to muted members, so the counts the
 * app shows always match what a real send would do.
 * @returns {number} reachable device count
 */
function countFcmTokens() {
  return getFcmTokens().length
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

// ============================== NOTIFICATION CONTROLS ==============================
// Admin on/off switches, stored in Script Properties (no sheet needed):
//   - a master pause that stops the ENTIRE automatic dispatcher (church
//     calendar, personal greetings, visitor welcomes, scheduled announcements)
//   - a per-member mute list — muted members receive NOTHING (automatic or
//     manual) on any of their devices until unmuted.
// Manual "Send Notification" from the Announcements page still works while
// the master switch is off — pressing Send is an explicit admin action.

const PAUSE_PROPERTY_KEY = 'notificationsPaused'
const MUTED_PROPERTY_KEY = 'mutedMemberIds'
const DISABLED_PROPERTY_KEY = 'disabledNotificationKeys'

// Per-type keys for the personal/announcement notifications (church-calendar
// entries use their own SCHEDULE keys, e.g. 'sun-worship-live').
const EXTRA_NOTIFICATION_KEYS = [
  'birthday',
  'wedding-anniversary',
  'membership-anniversary',
  'baptism-anniversary',
  'visitor-welcome',
  'scheduled-announcements',
]

/**
 * Current notification-control state for the admin UI.
 * @returns {{enabled: boolean, muted: string[], disabled: string[]}}
 *   master switch + muted member IDs + individually switched-off notification keys
 */
function getNotificationSettings() {
  return {
    enabled: PropertiesService.getScriptProperties().getProperty(PAUSE_PROPERTY_KEY) !== '1',
    muted: getMutedMemberIds(),
    disabled: getDisabledNotificationKeys(),
  }
}

/**
 * Notification keys the admin has switched off individually.
 * @returns {string[]} disabled keys (empty when everything is on)
 */
function getDisabledNotificationKeys() {
  const raw = PropertiesService.getScriptProperties().getProperty(DISABLED_PROPERTY_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    return []
  }
}

/**
 * "setNotificationKeyEnabled" web-app action — switch ONE automatic
 * notification on or off (a SCHEDULE entry key or one of the personal/
 * announcement keys). Rejects unknown keys so a typo can't silently create
 * a switch that controls nothing.
 * @param {{key: string, enabled: boolean}} body
 * @returns {{enabled: boolean, muted: string[], disabled: string[]}} the updated settings
 */
function setNotificationKeyEnabled(body) {
  if (!body.key) throw new Error('Missing key')
  const validKeys = SCHEDULE.map(function (entry) {
    return entry.key
  }).concat(EXTRA_NOTIFICATION_KEYS)
  if (validKeys.indexOf(body.key) === -1) throw new Error('Unknown notification key: ' + body.key)

  const disabled = getDisabledNotificationKeys().filter(function (key) {
    return key !== body.key
  })
  if (!body.enabled) disabled.push(body.key)
  PropertiesService.getScriptProperties().setProperty(DISABLED_PROPERTY_KEY, JSON.stringify(disabled))
  return getNotificationSettings()
}

/**
 * Member IDs the admin has individually paused.
 * @returns {string[]} muted member IDs (empty when none)
 */
function getMutedMemberIds() {
  const raw = PropertiesService.getScriptProperties().getProperty(MUTED_PROPERTY_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    return []
  }
}

/**
 * "setNotificationsEnabled" web-app action — flip the master automation switch.
 * @param {{enabled: boolean}} body
 * @returns {{enabled: boolean, muted: string[]}} the updated settings
 */
function setNotificationsEnabled(body) {
  const props = PropertiesService.getScriptProperties()
  if (body.enabled) props.deleteProperty(PAUSE_PROPERTY_KEY)
  else props.setProperty(PAUSE_PROPERTY_KEY, '1')
  return getNotificationSettings()
}

/**
 * "setMemberMuted" web-app action — pause or resume ALL notifications for one member.
 * @param {{memberId: string, muted: boolean}} body
 * @returns {{enabled: boolean, muted: string[]}} the updated settings
 */
function setMemberMuted(body) {
  if (!body.memberId) throw new Error('Missing memberId')
  const muted = getMutedMemberIds().filter(function (id) {
    return id !== body.memberId
  })
  if (body.muted) muted.push(body.memberId)
  PropertiesService.getScriptProperties().setProperty(MUTED_PROPERTY_KEY, JSON.stringify(muted))
  return getNotificationSettings()
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
  const deadTokens = []

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
      const code = response.getResponseCode()
      if (code === 200) {
        sent++
      } else {
        failed++
        // 404 UNREGISTERED = the token is permanently dead (rotated/uninstalled).
        // Collect it so the row gets pruned — otherwise dead rows pile up and
        // inflate the device counts shown in the app.
        if (code === 404) deadTokens.push(token)
      }
    } catch (err) {
      failed++
    }
  })

  deadTokens.forEach(function (token) {
    try {
      deleteFCMToken({ token: token })
    } catch (err) {
      // best-effort cleanup — a failed prune just retries on the next send
    }
  })

  return { sent: sent, failed: failed }
}

/**
 * All registered tokens, optionally filtered by audience ('member'/'admin').
 * Devices belonging to a muted member are excluded from EVERY send —
 * automatic and manual alike.
 * @param {string} [audience] omit for every token
 * @returns {string[]} FCM tokens
 */
function getFcmTokens(audience) {
  const rows = getFcmSheet().getDataRange().getValues()
  const muted = getMutedMemberIds()
  const tokens = []
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][1]) continue
    if (audience && rows[i][5] !== audience) continue
    if (muted.indexOf(rows[i][0]) !== -1) continue
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
  const result = sendPushToTokens(getFcmTokens(), {
    title: body.title,
    body: body.body,
    url: body.url,
    tag: 'slf-announcement-' + new Date().getTime(),
  })
  logNotificationHistory('announcement', body.title || body.body, result)
  return result
}

/**
 * Convenience for testing from the Apps Script editor: sends a test push to
 * every registered device.
 * @returns {{sent: number, failed: number}} delivery counts
 */
function sendTestPush() {
  const result = sendPushToTokens(getFcmTokens(), {
    title: 'SLF Members Hub',
    body: 'Test notification from Google Apps Script!',
  })
  logNotificationHistory('announcement', 'Test notification', result)
  return result
}

// ============================== NOTIFICATION HISTORY ==============================
// One row per completed send — powers the dashboard's "Notifications sent"
// card. The sheet keeps the CURRENT MONTH ONLY: rows from previous months are
// deleted automatically on every write and read.

const HISTORY_SHEET_NAME = 'Notification History'
const HISTORY_HEADERS = ['Sent At', 'Title', 'Kind', 'Sent', 'Failed']

/**
 * Get (or create on first use) the send-history sheet.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} the sheet
 */
function getHistorySheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = spreadsheet.getSheetByName(HISTORY_SHEET_NAME)
  if (!sheet) {
    sheet = spreadsheet.insertSheet(HISTORY_SHEET_NAME)
    sheet.appendRow(HISTORY_HEADERS)
  }
  return sheet
}

/**
 * Delete every history row that is not from the current month (bottom-up so
 * row indices stay valid while deleting).
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet the history sheet
 */
function pruneHistoryToCurrentMonth(sheet) {
  const tz = Session.getScriptTimeZone()
  const monthKey = Utilities.formatDate(new Date(), tz, 'yyyy-MM')
  const rows = sheet.getDataRange().getValues()
  for (let i = rows.length - 1; i >= 1; i--) {
    const sentAt = parseSheetDate(rows[i][0])
    if (sentAt && Utilities.formatDate(sentAt, tz, 'yyyy-MM') !== monthKey) {
      sheet.deleteRow(i + 1)
    }
  }
}

/**
 * Record one completed send. Best-effort — a history failure must never
 * break the send that just succeeded.
 * @param {string} kind 'announcement' | 'scheduled' | 'church' | a greeting key
 * @param {string} title what was sent (notification title)
 * @param {{sent: number, failed: number}} result delivery counts
 */
function logNotificationHistory(kind, title, result) {
  try {
    const sheet = getHistorySheet()
    sheet.appendRow([new Date().toISOString(), title || '', kind || 'other', result.sent, result.failed])
    pruneHistoryToCurrentMonth(sheet)
  } catch (err) {
    // ignore — the push itself already went out
  }
}

/**
 * "history=notifications" endpoint — this month's sends, newest first.
 * @returns {{items: Array<{sentAt: string, title: string, kind: string, sent: number, failed: number}>}}
 */
function getNotificationHistory() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HISTORY_SHEET_NAME)
  if (!sheet) return { items: [] }
  pruneHistoryToCurrentMonth(sheet)

  const rows = sheet.getDataRange().getValues()
  const items = []
  for (let i = 1; i < rows.length; i++) {
    const sentAt = parseSheetDate(rows[i][0])
    if (!sentAt) continue
    items.push({
      sentAt: sentAt.toISOString(),
      title: rows[i][1] ? String(rows[i][1]) : '',
      kind: rows[i][2] ? String(rows[i][2]) : 'other',
      sent: Number(rows[i][3]) || 0,
      failed: Number(rows[i][4]) || 0,
    })
  }
  items.sort(function (a, b) {
    return a.sentAt < b.sentAt ? 1 : a.sentAt > b.sentAt ? -1 : 0
  })
  return { items: items }
}

// ============================== SCHEDULED NOTIFICATIONS ==============================
// The church notification calendar. A single time-driven trigger fires
// runScheduledNotifications() every 5 minutes; it matches the current
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
 * Dispatcher — runs every 5 minutes via a clock trigger. Uses the most recent
 * 15-minute slot boundary (floor, never round-up), so a SCHEDULE entry fires
 * on the first run AT or AFTER its time — a couple of minutes late at worst,
 * never early — and at most once per day (CacheService guards double-fires
 * across the multiple runs that map to the same slot).
 */
function runScheduledNotifications() {
  // Master switch — while paused, NOTHING automatic goes out. Scheduled
  // announcements stay pending and deliver after automation is resumed.
  if (getNotificationSettings().enabled === false) return

  const now = new Date()
  const tz = Session.getScriptTimeZone()
  const hour = now.getHours()
  const minute = Math.floor(now.getMinutes() / 15) * 15
  const slot = (hour < 10 ? '0' : '') + hour + ':' + (minute < 10 ? '0' : '') + minute
  const day = now.getDay()
  const dateKey = Utilities.formatDate(now, tz, 'yyyy-MM-dd')
  const cache = CacheService.getScriptCache()

  // Church-wide calendar entries due in this slot (services, prayer, live
  // alerts) — skipping any the admin switched off on the Access page.
  const disabled = getDisabledNotificationKeys()
  const due = SCHEDULE.filter(function (entry) {
    if (disabled.indexOf(entry.key) !== -1) return false
    return entry.time === slot && (entry.day === '*' || entry.day === day)
  })
  if (due.length > 0) {
    const tokens = getFcmTokens()
    if (tokens.length > 0) {
      due.forEach(function (entry) {
        const dedupeKey = 'push-' + dateKey + '-' + slot + '-' + entry.key
        if (cache.get(dedupeKey)) return
        cache.put(dedupeKey, '1', 21600) // 6h — far longer than any trigger drift
        const result = sendPushToTokens(tokens, {
          title: entry.title,
          body: entry.body,
          url: entry.url,
          tag: 'slf-' + entry.key,
        })
        logNotificationHistory('church', entry.title, result)
      })
    }
  }

  // Personal greetings — each one goes ONLY to that member's own devices
  if (slot === PERSONAL_GREETINGS_SLOT) runPersonalGreetings(now, dateKey, cache)
  if (slot === VISITOR_WELCOME_SLOT) runVisitorWelcome(now, dateKey, cache)

  // Admin-scheduled announcements whose time has arrived
  processScheduledPushes(now)
}

// ============================== SCHEDULED ANNOUNCEMENTS ==============================
// One-off announcements the admin schedules from the Announcements page.
// Stored in their own sheet; the 5-minute dispatcher sends any pending row
// whose time has arrived, then marks it sent (so it can never fire twice).

const SCHEDULED_SHEET_NAME = 'Scheduled Notifications'
const SCHEDULED_HEADERS = ['ID', 'Title', 'Body', 'URL', 'Send At', 'Status', 'Created At', 'Sent At']

/**
 * Get (or create on first use) the scheduled-announcements sheet.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} the sheet
 */
function getScheduledSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = spreadsheet.getSheetByName(SCHEDULED_SHEET_NAME)
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SCHEDULED_SHEET_NAME)
    sheet.appendRow(SCHEDULED_HEADERS)
  }
  return sheet
}

/**
 * "schedulePush" web-app action — store an announcement to be pushed later.
 * @param {{title: string, body: string, url?: string, sendAt: string}} body
 *   sendAt is an ISO datetime; must be in the future
 * @returns {{scheduled: boolean, sendAt: string}} confirmation payload
 */
function schedulePush(body) {
  if (!body.title && !body.body) throw new Error('Missing notification content')
  if (!body.sendAt) throw new Error('Missing sendAt')
  const sendAt = new Date(body.sendAt)
  if (isNaN(sendAt.getTime())) throw new Error('Invalid sendAt')
  if (sendAt.getTime() <= Date.now()) throw new Error('Scheduled time must be in the future')

  getScheduledSheet().appendRow([
    Utilities.getUuid(),
    body.title || '',
    body.body || '',
    body.url || '',
    sendAt.toISOString(),
    'pending',
    new Date().toISOString(),
    '',
  ])
  return { scheduled: true, sendAt: sendAt.toISOString() }
}

/**
 * Send every pending scheduled announcement whose time has arrived, then
 * mark it sent. Runs inside the 5-minute dispatcher, so delivery lands
 * within ~5 minutes of the chosen time.
 * @param {Date} now current time
 */
function processScheduledPushes(now) {
  // Switched off on the Access page — rows stay pending (NOT marked sent),
  // so they deliver after the switch is turned back on.
  if (getDisabledNotificationKeys().indexOf('scheduled-announcements') !== -1) return

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = spreadsheet.getSheetByName(SCHEDULED_SHEET_NAME)
  if (!sheet) return // nothing ever scheduled — don't create the sheet just to read it

  const rows = sheet.getDataRange().getValues()
  let tokens = null // fetched lazily, only if something is actually due

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][5] !== 'pending') continue
    const sendAt = parseSheetDate(rows[i][4])
    if (!sendAt || sendAt.getTime() > now.getTime()) continue

    // Mark sent BEFORE sending — if the send partially fails we prefer a
    // missed retry over accidentally blasting everyone twice.
    sheet.getRange(i + 1, 6, 1, 3).setValues([['sent', rows[i][6], new Date().toISOString()]])

    if (tokens === null) tokens = getFcmTokens()
    if (tokens.length === 0) continue
    const result = sendPushToTokens(tokens, {
      title: rows[i][1],
      body: rows[i][2],
      url: rows[i][3] || undefined,
      tag: 'slf-scheduled-' + rows[i][0],
    })
    logNotificationHistory('scheduled', rows[i][1], result)
  }
}

/**
 * One-time setup: run this once from the Apps Script editor. Creates the
 * every-5-minutes clock trigger for runScheduledNotifications (removing any
 * older duplicates first, so re-running is always safe).
 * @returns {string} confirmation text
 */
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'runScheduledNotifications') {
      ScriptApp.deleteTrigger(trigger)
    }
  })
  ScriptApp.newTrigger('runScheduledNotifications').timeBased().everyMinutes(5).create()
  return 'Scheduled-notification trigger installed (runs every 5 minutes).'
}

// ============================== PERSONAL NOTIFICATIONS ==============================
// Per-member greetings, matched daily against the Members sheet and sent ONLY
// to the devices that member registered (via "Get Church Notifications" on
// their public profile page). Members who never opted in are skipped silently.
//
//   8:00 AM — Birthday, Wedding Anniversary, Membership Anniversary,
//             Baptism Anniversary (whichever apply that day)
//   7:00 PM — First-Time Visitor Welcome (registered earlier the same day)

const PERSONAL_GREETINGS_SLOT = '08:00'
const VISITOR_WELCOME_SLOT = '19:00'
const SIGN_OFF_LINES = 'With love and prayers,\nSarah Living Faith Ministries, Vijayawada'

/**
 * All member records as camelCase field objects (same shape the web app uses).
 * @returns {Object[]} member field objects
 */
function getAllMemberFields() {
  const rows = getSheet().getDataRange().getValues()
  return rows
    .slice(1)
    .map(function (row) {
      return rowToRecord(HEADERS, row)
    })
    .filter(function (r) {
      return r['Member ID']
    })
    .map(recordToFields)
}

/**
 * Member ID → [tokens] map, so each personal greeting targets only the
 * devices that member registered. Muted members are left out entirely, so
 * their birthday/anniversary/welcome greetings are skipped too.
 * @returns {Object<string, string[]>} tokens grouped by Member ID
 */
function getFcmTokenMap() {
  const rows = getFcmSheet().getDataRange().getValues()
  const muted = getMutedMemberIds()
  const map = {}
  for (let i = 1; i < rows.length; i++) {
    const memberId = rows[i][0]
    const token = rows[i][1]
    if (!memberId || !token) continue
    if (muted.indexOf(memberId) !== -1) continue
    if (!map[memberId]) map[memberId] = []
    map[memberId].push(token)
  }
  return map
}

/**
 * Parse a sheet cell that should hold a date — tolerates real Date cells and
 * 'yyyy-MM-dd' text cells (the app writes dates as text on purpose).
 * @param {*} value raw cell value
 * @returns {Date | null} parsed date, or null when empty/invalid
 */
function parseSheetDate(value) {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  const parsed = new Date(String(value))
  return isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Does an annual event (birthday/anniversary) fall on today's month+day?
 * Feb-29 events are celebrated on Feb 28 in non-leap years instead of being
 * skipped for three years out of four.
 * @param {Date | null} eventDate the original event date
 * @param {Date} now today
 * @returns {boolean} true when the anniversary is today
 */
function matchesAnnualDate(eventDate, now) {
  if (!eventDate) return false
  const eventMonth = eventDate.getMonth()
  const eventDay = eventDate.getDate()
  if (eventMonth === now.getMonth() && eventDay === now.getDate()) return true
  if (eventMonth === 1 && eventDay === 29 && now.getMonth() === 1 && now.getDate() === 28) {
    const year = now.getFullYear()
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
    return !isLeap
  }
  return false
}

/**
 * "Full Name & Spouse's Name" when a spouse is on file, otherwise just the
 * member's name (per spec: single / no spouse → only {Full Name}).
 * @param {Object} member camelCase member fields
 * @returns {string} greeting name(s)
 */
function coupleName(member) {
  const name = member.fullName || 'Member'
  const spouse = (member.spouseName || '').toString().trim()
  return spouse ? name + ' & ' + spouse : name
}

/**
 * Send one personal greeting at most once per member per day.
 * @param {GoogleAppsScript.Cache.Cache} cache script cache for dedupe
 * @param {string} dateKey yyyy-MM-dd
 * @param {string} eventKey e.g. 'birthday'
 * @param {string} memberId whose greeting this is
 * @param {string[]} tokens that member's device tokens
 * @param {{title: string, body: string}} msg what to send
 */
function sendPersonalOnce(cache, dateKey, eventKey, memberId, tokens, msg) {
  const dedupeKey = 'personal-' + dateKey + '-' + eventKey + '-' + memberId
  if (cache.get(dedupeKey)) return
  cache.put(dedupeKey, '1', 21600)
  const result = sendPushToTokens(tokens, { title: msg.title, body: msg.body, tag: 'slf-' + eventKey })
  logNotificationHistory(eventKey, msg.title, result)
}

/**
 * 8:00 AM sweep — birthday, wedding anniversary, membership anniversary, and
 * baptism anniversary greetings for every member whose date matches today.
 * Anniversaries are skipped in their starting year (joining/marriage/baptism
 * day itself is not an "anniversary" yet).
 * @param {Date} now current time
 * @param {string} dateKey yyyy-MM-dd
 * @param {GoogleAppsScript.Cache.Cache} cache script cache for dedupe
 */
function runPersonalGreetings(now, dateKey, cache) {
  const tokenMap = getFcmTokenMap()
  if (Object.keys(tokenMap).length === 0) return
  const currentYear = now.getFullYear()
  const disabled = getDisabledNotificationKeys()

  getAllMemberFields().forEach(function (member) {
    const tokens = tokenMap[member.memberId]
    if (!tokens || tokens.length === 0) return
    const name = member.fullName || 'Member'

    const dob = parseSheetDate(member.dob)
    if (disabled.indexOf('birthday') === -1 && matchesAnnualDate(dob, now)) {
      sendPersonalOnce(cache, dateKey, 'birthday', member.memberId, tokens, {
        title: '🎂 Happy Birthday!',
        body:
          'Dear ' +
          name +
          ',\nMay our Lord Jesus Christ bless you with abundant joy, good health, wisdom, peace, and many more blessed years of life.\n\nWishing you a very Happy Birthday!\n\n' +
          SIGN_OFF_LINES,
      })
    }

    const wedding = parseSheetDate(member.marriageDay)
    if (disabled.indexOf('wedding-anniversary') === -1 && matchesAnnualDate(wedding, now) && wedding.getFullYear() < currentYear) {
      sendPersonalOnce(cache, dateKey, 'wedding-anniversary', member.memberId, tokens, {
        title: '💍 Happy Wedding Anniversary!',
        body:
          'Dear ' +
          coupleName(member) +
          ',\nMay God continue to bless your marriage with love, peace, joy, and abundant grace.\n\nWishing you both a blessed Wedding Anniversary.\n\n' +
          SIGN_OFF_LINES,
      })
    }

    const joined = parseSheetDate(member.joiningDate) || parseSheetDate(member.registrationDate)
    if (disabled.indexOf('membership-anniversary') === -1 && matchesAnnualDate(joined, now) && joined.getFullYear() < currentYear) {
      sendPersonalOnce(cache, dateKey, 'membership-anniversary', member.memberId, tokens, {
        title: '🎉 Happy Membership Anniversary!',
        body:
          'Dear ' +
          coupleName(member) +
          ",\nToday marks another wonderful year as members of Sarah Living Faith Ministries, Vijayawada.\n\nThank you for your faithful fellowship, service, and commitment to God's Kingdom. May the Lord continue to bless your family abundantly.\n\n" +
          SIGN_OFF_LINES,
      })
    }

    const baptized = parseSheetDate(member.baptizedDate)
    if (disabled.indexOf('baptism-anniversary') === -1 && matchesAnnualDate(baptized, now) && baptized.getFullYear() < currentYear) {
      sendPersonalOnce(cache, dateKey, 'baptism-anniversary', member.memberId, tokens, {
        title: '✝️ Happy Baptism Anniversary!',
        body:
          'Dear ' +
          name +
          ',\nToday marks your Baptism Anniversary. May the Lord strengthen your faith and continue to guide you in your walk with Christ.\n\nMay His grace and peace be with you always.\n\n' +
          SIGN_OFF_LINES,
      })
    }
  })
}

/**
 * 7:00 PM sweep — same-day welcome for first-time visitors who registered
 * earlier today.
 * @param {Date} now current time
 * @param {string} dateKey yyyy-MM-dd
 * @param {GoogleAppsScript.Cache.Cache} cache script cache for dedupe
 */
function runVisitorWelcome(now, dateKey, cache) {
  if (getDisabledNotificationKeys().indexOf('visitor-welcome') !== -1) return
  const tokenMap = getFcmTokenMap()
  if (Object.keys(tokenMap).length === 0) return
  const tz = Session.getScriptTimeZone()

  getAllMemberFields().forEach(function (member) {
    if (member.firstTimeVisiting !== 'Yes') return
    const registered = parseSheetDate(member.registrationDate)
    if (!registered) return
    if (Utilities.formatDate(registered, tz, 'yyyy-MM-dd') !== dateKey) return

    const tokens = tokenMap[member.memberId]
    if (!tokens || tokens.length === 0) return

    sendPersonalOnce(cache, dateKey, 'visitor-welcome', member.memberId, tokens, {
      title: '👋 Welcome to Sarah Living Faith Ministries!',
      body:
        'Dear ' +
        (member.fullName || 'Friend') +
        ",\nThank you for worshipping with us today. We are delighted to have you with us and pray that you experienced God's presence.\n\nWe look forward to welcoming you again soon.\n\nGod bless you and your family.\nSarah Living Faith Ministries, Vijayawada",
    })
  })
}

// ============================== UPCOMING-SCHEDULE VIEW ==============================
// Read-only data for the admin's "Notification Schedule" page: everything the
// dispatcher will fire between now and the end of the current month.

/**
 * 'HH:mm' has already passed at `now`?
 * @param {string} time 'HH:mm'
 * @param {Date} now reference moment
 * @returns {boolean} true when the slot time is not after now
 */
function timeHasPassed(time, now) {
  const parts = time.split(':')
  const slotMinutes = Number(parts[0]) * 60 + Number(parts[1])
  return slotMinutes <= now.getHours() * 60 + now.getMinutes()
}

/**
 * Upcoming notification triggers for the rest of the current month —
 * church-wide weekly entries expanded per date, daily entries returned once
 * (the page shows them as a single "repeats daily" card), and every personal
 * greeting (birthday / wedding / membership / baptism) computed from the
 * Members sheet. Visitor welcomes are unpredictable (same-day) and are
 * represented by the daily card note client-side.
 * @returns {{month: string, daily: Object[], events: Object[]}}
 */
function getUpcomingSchedule() {
  const tz = Session.getScriptTimeZone()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()

  // Switched-off notifications are excluded so this view (and the "Next
  // Notification" hero it powers) only ever shows what will REALLY fire.
  const disabled = getDisabledNotificationKeys()

  const daily = SCHEDULE.filter(function (entry) {
    return entry.day === '*' && disabled.indexOf(entry.key) === -1
  }).map(function (entry) {
    return { key: entry.key, time: entry.time, title: entry.title, live: Boolean(entry.url) }
  })

  const events = []

  for (let dayNum = now.getDate(); dayNum <= lastDay; dayNum++) {
    const date = new Date(year, month, dayNum)
    const isToday = dayNum === now.getDate()
    const dateStr = Utilities.formatDate(date, tz, 'yyyy-MM-dd')

    // Church-wide weekly entries falling on this date
    SCHEDULE.forEach(function (entry) {
      if (disabled.indexOf(entry.key) !== -1) return
      if (entry.day === '*' || entry.day !== date.getDay()) return
      if (isToday && timeHasPassed(entry.time, now)) return
      events.push({
        date: dateStr,
        time: entry.time,
        kind: 'church',
        title: entry.title,
        live: Boolean(entry.url),
      })
    })
  }

  // Personal greetings for the rest of the month (all fire at 08:00)
  const personalTime = PERSONAL_GREETINGS_SLOT
  getAllMemberFields().forEach(function (member) {
    const checks = [
      { kind: 'birthday', title: 'Birthday', date: parseSheetDate(member.dob), skipYearZero: false },
      {
        kind: 'wedding-anniversary',
        title: 'Wedding Anniversary',
        date: parseSheetDate(member.marriageDay),
        skipYearZero: true,
      },
      {
        kind: 'membership-anniversary',
        title: 'Membership Anniversary',
        date: parseSheetDate(member.joiningDate) || parseSheetDate(member.registrationDate),
        skipYearZero: true,
      },
      {
        kind: 'baptism-anniversary',
        title: 'Baptism Anniversary',
        date: parseSheetDate(member.baptizedDate),
        skipYearZero: true,
      },
    ]

    checks.forEach(function (check) {
      if (!check.date) return
      if (disabled.indexOf(check.kind) !== -1) return
      if (check.skipYearZero && check.date.getFullYear() >= year) return
      for (let dayNum = now.getDate(); dayNum <= lastDay; dayNum++) {
        const date = new Date(year, month, dayNum)
        if (!matchesAnnualDate(check.date, date)) continue
        if (dayNum === now.getDate() && timeHasPassed(personalTime, now)) continue
        events.push({
          date: Utilities.formatDate(date, tz, 'yyyy-MM-dd'),
          time: personalTime,
          kind: check.kind,
          title: check.title,
          live: false,
          memberName: member.fullName || member.memberId,
          memberId: member.memberId,
        })
      }
    })
  })

  // Admin-scheduled announcements still pending within this month — so the
  // Follow-ups hero/preview and the schedule page show them alongside the
  // church calendar and personal greetings.
  const scheduledSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SCHEDULED_SHEET_NAME)
  if (scheduledSheet && disabled.indexOf('scheduled-announcements') === -1) {
    const scheduledRows = scheduledSheet.getDataRange().getValues()
    const monthEnd = new Date(year, month, lastDay, 23, 59, 59)
    for (let i = 1; i < scheduledRows.length; i++) {
      if (scheduledRows[i][5] !== 'pending') continue
      const sendAt = parseSheetDate(scheduledRows[i][4])
      if (!sendAt || sendAt.getTime() <= now.getTime() || sendAt.getTime() > monthEnd.getTime()) continue
      events.push({
        date: Utilities.formatDate(sendAt, tz, 'yyyy-MM-dd'),
        time: Utilities.formatDate(sendAt, tz, 'HH:mm'),
        kind: 'scheduled',
        title: scheduledRows[i][1] || 'Scheduled Announcement',
        live: false,
      })
    }
  }

  events.sort(function (a, b) {
    return a.date === b.date ? (a.time < b.time ? -1 : a.time > b.time ? 1 : 0) : a.date < b.date ? -1 : 1
  })

  return { month: Utilities.formatDate(now, tz, 'MMMM yyyy'), daily: daily, events: events }
}

/**
 * Notification-status summary per member — powers the bell indicator shown
 * beside the MEMBER badge across the app. One entry per member who has at
 * least one registered device; the newest registration wins for the
 * device/browser/updatedAt details. Token values are never included.
 * @returns {{members: Array<{memberId: string, platform: string, browser: string, updatedAt: string, devices: number}>}}
 */
function getFcmStatusByMember() {
  const rows = getFcmSheet().getDataRange().getValues()
  const byMember = {}

  for (let i = 1; i < rows.length; i++) {
    const memberId = rows[i][0]
    const token = rows[i][1]
    if (!memberId || !token) continue
    const updatedAt = rows[i][4] ? String(rows[i][4]) : ''
    const existing = byMember[memberId]
    if (!existing) {
      byMember[memberId] = {
        memberId: memberId,
        platform: rows[i][2] || '',
        browser: rows[i][3] || '',
        updatedAt: updatedAt,
        devices: 1,
      }
    } else {
      existing.devices += 1
      if (updatedAt > existing.updatedAt) {
        existing.platform = rows[i][2] || ''
        existing.browser = rows[i][3] || ''
        existing.updatedAt = updatedAt
      }
    }
  }

  return { members: Object.keys(byMember).map(function (key) { return byMember[key] }) }
}
