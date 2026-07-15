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
