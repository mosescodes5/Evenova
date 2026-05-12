/**
 * shared/types/index.js
 * Shared data shapes for Evenova — documented as JSDoc typedefs.
 * These are used as reference contracts between frontend and backend.
 */

/**
 * @typedef {Object} Organizer
 * @property {string}  id          - Unique organizer ID (ORG…)
 * @property {string}  name        - Company / organization name
 * @property {string}  contactName - Primary contact person
 * @property {string}  email
 * @property {string}  phone
 * @property {string}  idType      - "NIN" | "International Passport" | "BVN" | "CAC"
 * @property {string}  idNumber
 * @property {"pending"|"approved"|"rejected"} status
 * @property {number}  teamSize
 * @property {Staff[]} staff
 */

/**
 * @typedef {Object} Staff
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {"Scanner"|"Coordinator"|"Manager"} role
 * @property {string[]} gateIds - Gates this staff member is assigned to
 */

/**
 * @typedef {Object} Event
 * @property {string}  id
 * @property {string}  orgId
 * @property {string}  title
 * @property {string}  desc
 * @property {string}  date        - ISO date string "YYYY-MM-DD"
 * @property {string}  time        - "HH:MM"
 * @property {string}  endTime
 * @property {string}  venue
 * @property {string}  city
 * @property {string}  category    - "Music" | "Technology" | "Food & Drinks" | "Arts" | …
 * @property {"draft"|"upcoming"|"live"|"ended"|"cancelled"} status
 * @property {boolean} featured
 * @property {"music"|"tech"|"food"|"arts"} banner
 * @property {number}  checkinCount
 * @property {Object.<string, Gate>}       gates
 * @property {Object.<string, TicketType>} ticketTypes
 * @property {RegField[]} regFields
 * @property {Ticket[]}   tickets
 */

/**
 * @typedef {Object} Gate
 * @property {string} name
 * @property {string} color - Hex color string
 */

/**
 * @typedef {Object} TicketType
 * @property {string}   name
 * @property {number}   price  - In NGN (kobo on Paystack)
 * @property {number}   qty
 * @property {string}   color
 * @property {string[]} perks
 */

/**
 * @typedef {Object} RegField
 * @property {string}  id
 * @property {string}  label
 * @property {"text"|"email"|"tel"|"select"|"textarea"} type
 * @property {boolean} required
 * @property {string}  placeholder
 * @property {string[]} [options]  - Only for type="select"
 */

/**
 * @typedef {Object} Ticket
 * @property {string} id         - Ticket ID (TKT…)
 * @property {string} evId       - Event ID
 * @property {string} uId        - Attendee user ID (USR…)
 * @property {string} gId        - Gate ID
 * @property {string} tpId       - TicketType ID
 * @property {string} code       - Signed QR payload: "eId|tId|uId|SIG…"
 * @property {string} holderName
 * @property {string} holderEmail
 * @property {string} holderPhone
 * @property {"unused"|"used"} status
 * @property {Object} customData  - Answers to custom regFields
 * @property {string} registeredAt - ISO datetime
 */

/**
 * @typedef {Object} ScanLog
 * @property {string} id
 * @property {number} ts           - Unix timestamp (ms)
 * @property {string} evId
 * @property {string} evTitle
 * @property {string} ticketId
 * @property {string} holderName
 * @property {string} gateId
 * @property {string} gateName
 * @property {string} staffId
 * @property {string} staffName
 * @property {string} ticketTypeName
 * @property {"admitted"|"rejected"|"duplicate"} status
 * @property {string} reason
 */

export {};
