import { genId, encodeTicket } from "../utils/crypto.js";
/* ─────────────────────────────────────────────────────────────
   6. SAMPLE DATA  (3-tier pricing: Early Bird / Regular / VIP)
───────────────────────────────────────────────────────────── */
export const NAMES = [
  "Adaeze Okonkwo","Chukwuemeka Nwosu","Fatima Al-Hassan","Bisi Adeyemi",
  "Tunde Bakare","Ngozi Obi","Emeka Eze","Kemi Adebayo","Dipo Olawale",
  "Sola Obaseki","Yetunde Adisa","Chioma Nnaji","Biodun Fasanya",
  "Adeola Bright","Funmi Coker","Gbemisola Ige","Lara Dada","Kunle Afolabi",
];

export function makeTickets(evId, gateKeys, typeKeys, count) {
  return Array.from({ length: count }, (_, i) => {
    const tId = genId("TKT"), uId = genId("USR");
    const gKey = gateKeys[i % gateKeys.length];
    // 20% early bird, 55% regular, 25% VIP
    const tKey = i < count * 0.2 ? typeKeys[0]
               : i < count * 0.75 ? typeKeys[1]
               : typeKeys[2] || typeKeys[typeKeys.length - 1];
    const name = NAMES[i % NAMES.length];
    return {
      id: tId, evId, uId, gId: gKey, tpId: tKey,
      code: encodeTicket(evId, tId, uId),
      holderName: name,
      holderEmail: name.toLowerCase().replace(/ /g, ".") + "@gmail.com",
      holderPhone: "+234 8" + (10000000 + Math.floor(Math.random() * 89999999)),
      status: i < count * 0.38 ? "used" : "unused",
      customData: {},
      registeredAt: new Date(Date.now() - (count - i) * 3_600_000).toISOString(),
    };
  });
}

/* Build IDs once so they don't regenerate on re-render */
const _E1 = genId("EVT"), _E2 = genId("EVT"), _E3 = genId("EVT"), _E4 = genId("EVT");
const _O1 = genId("ORG"), _O2 = genId("ORG");
const _S1 = genId("USR"), _S2 = genId("USR");

const mkGates = (...names) =>
  Object.fromEntries(names.map((n, i) => [genId("GT"), { name: n, color: ["#7c3aed","#f59e0b","#10b981","#3b82f6"][i] }]));

const mkTypes = (...defs) =>
  Object.fromEntries(defs.map(([n, p, c, perks]) => [genId("TP"), { name: n, price: p, qty: 200, color: c, perks }]));

export const DEF_FIELDS = [
  { id: genId("FL"), label: "Full Name",      type: "text",  required: true,  placeholder: "Your full name" },
  { id: genId("FL"), label: "Email Address",  type: "email", required: true,  placeholder: "you@email.com" },
  { id: genId("FL"), label: "Phone Number",   type: "tel",   required: true,  placeholder: "+234 xxx xxx xxxx" },
];

const E1_GATES = mkGates("Main Entrance","VIP Lounge","Press Gate");
const E1_TYPES = mkTypes(
  ["Early Bird", 8000,  "#10b981", ["Limited-time discount","General admission","Wristband"]],
  ["Regular",    15000, "#7c3aed", ["General admission","Event wristband"]],
  ["VIP",        45000, "#f59e0b", ["Priority entry","VIP lounge","Free drinks","Meet & greet"]]
);
const E2_GATES = mkGates("Hall A","Hall B");
const E2_TYPES = mkTypes(
  ["Early Bird", 12000, "#10b981", ["Early access pricing","All sessions","Certificate"]],
  ["Standard",   25000, "#3b82f6", ["All sessions","Lunch included","Certificate"]],
  ["VVIP",       75000, "#f59e0b", ["Front row","Networking dinner","Speaker access","Gift bag"]]
);
const E3_GATES = mkGates("Beach Entry","Pavilion Gate");
const E3_TYPES = mkTypes(
  ["Early Bird", 4000,  "#10b981", ["Early access","Single entry"]],
  ["Single",     8000,  "#10b981", ["1 entry","General access"]],
  ["Couple",     14000, "#ec4899", ["2 entries","Reserved table","Welcome drink"]]
);
const E4_GATES = mkGates("Shrine Gate");
const E4_TYPES = mkTypes(
  ["Early Bird", 3000,  "#10b981", ["Early entry","Limited wristband"]],
  ["General",    5000,  "#6366f1", ["General admission"]],
  ["Premium",    12000, "#f59e0b", ["Reserved area","Premium bar"]]
);

export const DEFAULT_EVENTS = [
  { id: _E1, orgId: _O1, title: "Afrobeats Fest Lagos 2025",
    desc: "The biggest celebration of Afrobeats in West Africa. Headliners, rising stars, food vendors, art and an unforgettable Lagos night.",
    date: "2025-08-15", time: "18:00", endTime: "02:00",
    venue: "Eko Hotel & Suites", city: "Lagos",
    category: "Music", status: "upcoming", featured: true, banner: "music",
    checkinCount: 0, gates: E1_GATES, ticketTypes: E1_TYPES,
    regFields: [...DEF_FIELDS, { id: genId("FL"), label: "T-Shirt Size", type: "select", required: false, placeholder: "", options: ["XS","S","M","L","XL","XXL"] }],
    tickets: makeTickets(_E1, Object.keys(E1_GATES), Object.keys(E1_TYPES), 24) },

  { id: _E2, orgId: _O1, title: "Tech Summit Nigeria 2025",
    desc: "Nigeria's premier tech conference for innovators, founders, VCs and engineers. Workshops, keynotes, pitch competitions and structured networking.",
    date: "2025-09-22", time: "09:00", endTime: "18:00",
    venue: "Lagos Oriental Hotel", city: "Lagos",
    category: "Technology", status: "upcoming", featured: true, banner: "tech",
    checkinCount: 0, gates: E2_GATES, ticketTypes: E2_TYPES,
    regFields: [...DEF_FIELDS,
      { id: genId("FL"), label: "Company", type: "text", required: false, placeholder: "Where do you work?" },
      { id: genId("FL"), label: "Job Title", type: "text", required: false, placeholder: "Your role" },
    ],
    tickets: makeTickets(_E2, Object.keys(E2_GATES), Object.keys(E2_TYPES), 20) },

  { id: _E3, orgId: _O2, title: "Lagos Food & Wine Festival",
    desc: "A weekend of African cuisine, craft cocktails and fine wines. 40+ vendors, live demos, wine tastings and music by the beach.",
    date: "2025-10-05", time: "12:00", endTime: "22:00",
    venue: "Landmark Beach", city: "Lagos",
    category: "Food & Drinks", status: "upcoming", featured: false, banner: "food",
    checkinCount: 0, gates: E3_GATES, ticketTypes: E3_TYPES,
    regFields: [...DEF_FIELDS, { id: genId("FL"), label: "Dietary Requirement", type: "select", required: false, placeholder: "", options: ["None","Vegetarian","Vegan","Halal","Gluten-Free"] }],
    tickets: makeTickets(_E3, Object.keys(E3_GATES), Object.keys(E3_TYPES), 16) },

  { id: _E4, orgId: _O2, title: "Felabration 2025",
    desc: "The legendary annual festival celebrating the music and legacy of Fela Anikulapo-Kuti. 7 nights of Afrobeat, culture and freedom.",
    date: "2025-10-15", time: "20:00", endTime: "04:00",
    venue: "New Afrika Shrine", city: "Lagos",
    category: "Music", status: "upcoming", featured: true, banner: "arts",
    checkinCount: 0, gates: E4_GATES, ticketTypes: E4_TYPES,
    regFields: DEF_FIELDS,
    tickets: makeTickets(_E4, Object.keys(E4_GATES), Object.keys(E4_TYPES), 14) },
];

export const DEFAULT_ORGS = [
  { id: _O1, name: "Amara Events Co.", contactName: "Amara Okonkwo",
    email: "Mosesoluwa2005@gmail.com", phone: "+234 801 234 5678",
    idType: "NIN", idNumber: "NIN-28374912",
    status: "approved", teamSize: 8, password: "Moses2005.",
    staff: [
      { id: _S1, name: "Kalu Nduka", email: "kalu@amaraevents.ng", role: "Scanner", gateIds: [], password: "Kalu#Gate01" },
      { id: _S2, name: "Temi Adeyemi", email: "temi@amaraevents.ng", role: "Coordinator", gateIds: [], password: "Temi@Coord22" },
    ],
  },
  { id: _O2, name: "Lagos Events Hub", contactName: "Babatunde Adeniyi",
    email: "babs@lagosevents.ng", phone: "+234 802 345 6789",
    idType: "International Passport", idNumber: "A09283741",
    status: "pending", teamSize: 10, password: "Lagos#Hub2024", staff: [],
  },
];

export const ADS = [
  { id:"a1", brand:"GTBank",          title:"Power your event payments",       sub:"Accept payments from any bank. Zero setup fee.", cta:"Get Started", color:"#f97316" },
  { id:"a2", brand:"Flutterwave",     title:"Send & receive money across Africa", sub:"100+ currencies. Instant settlements for event revenue.", cta:"Learn More", color:"#f59e0b" },
  { id:"a3", brand:"Lagos Tourism",   title:"Lagos: Africa's Event Capital",   sub:"Discover world-class venues across Lagos State.", cta:"Explore", color:"#10b981" },
];