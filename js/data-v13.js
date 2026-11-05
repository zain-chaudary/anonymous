/*
 * V13 public-source overlays.
 * These are view-only reference data. They do not modify country baselines,
 * game rankings, combat calculations, or simulation state. The popup keeps each
 * figure's source year, unit and definition visible.
 */

/* SIPRI Yearbook 2026, estimates of total inventories as of January 2026.
   These are open-source estimates; not government disclosures or readiness counts. */
const SIPRI_NUCLEAR_2026 = {
  USA: 5042, RUS: 5420, CHN: 620, IND: 190, PAK: 170,
  GBR: 225, FRA: 370, PRK: 60, ISR: 90
};
/*
 * Global Firepower 2026 estimates. GFP calls the second pair value
 * "Readiness" and explains that its availability rates use a U.S. Air Force
 * 75% average benchmark. These are source-model estimates, not measured
 * serviceability. Aircraft categories follow GFP definitions (UAVs excluded).
 * Pair fields are [stock, GFP estimated available]; null means not itemized.
 * GFP does not give a consistent separate bomber-only category, so no bomber
 * counts are inferred here.
 */
const MIL_2026 = {
  PAK: {
    active:660000, reserve:550000, age:4794908,
    air:{total:[1397,908], fighters:[331,215], attack:[90,59], bombers:null,
      transport:[63,41], trainers:[563,366], special:[27,18], tankers:[4,3],
      helicopters:[379,246], attackHelis:[55,36]},
    land:{tanks:[2677,1740], vehicles:[59044,38379], sp:[662,430],
      towed:[2629,1709], mlrs:[652,424]},
    navy:{total:120, carriers:0, heloCarriers:0, destroyers:0, frigates:9,
      corvettes:6, submarines:8, patrol:79, mine:3},
    armorTiers:{high:'VT-4, Al-Khalid and T-80UD', middle:'Al-Zarrar and Type 85-IIAP',
      legacy:'Type 59 / Type 69 families; current serviceability is not public'},
    airTiers:{high:'J-10CE and JF-17 Block III', middle:'F-16 variants and earlier JF-17 blocks',
      legacy:'Mirage III/V and older J-7 families; status varies by airframe'},
    special:'Shaheen and Babur/Ra’ad missile families are publicly reported; system-level readiness and warhead assignment are not public.',
    elite:'Special Services Group (Army); Special Service Group (Navy).',
    intel:['Inter-Services Intelligence (ISI)','Intelligence Bureau (IB)','Military Intelligence (MI)']
  },
  IND: {
    active:1431000, reserve:1000000, age:23955181,
    air:{total:[2183,1637], fighters:[476,357], attack:[124,93], bombers:null,
      transport:[277,208], trainers:[334,251], special:[72,54], tankers:[6,5]},
    land:{tanks:[3913,2935], vehicles:[163554,122666], sp:[100,75],
      towed:[5640,null], mlrs:[300,225]},
    navy:{total:343, carriers:2, heloCarriers:null, destroyers:null, frigates:null,
      corvettes:21, submarines:18, patrol:146, mine:0},
    armorTiers:{high:'T-90S/Bhishma and Arjun', middle:'T-72 Ajeya (large legacy fleet)',
      legacy:'Older T-72 variants and stored equipment; model counts are not reconciled'},
    airTiers:{high:'Rafale and Su-30MKI', middle:'Tejas, Mirage 2000 and MiG-29UPG',
      legacy:'Jaguar and older aircraft; retirements/availability vary'},
    special:'Agni and K-series missile families are publicly associated with India’s strategic forces; BrahMos is a separate conventional missile family.',
    elite:'Para (SF); MARCOS; Garud Commando Force.',
    intel:['Research and Analysis Wing (R&AW)','Intelligence Bureau (IB)','Defence Intelligence Agency (DIA)']
  },
  CHN: {
    active:2035000, reserve:510000, age:19810606,
    air:{total:[3529,2647], fighters:[1443,1082], attack:[371,278], bombers:null,
      transport:[287,215], trainers:[401,301], special:[105,79], tankers:[9,7]},
    land:{tanks:[5870,4696], vehicles:[152040,121632], sp:[2940,2352],
      towed:[1400,1120], mlrs:[2770,2216]},
    navy:{total:841, carriers:3, heloCarriers:4, destroyers:53, frigates:46,
      corvettes:50, submarines:61, patrol:150, mine:36},
    armorTiers:{high:'Type 99A and Type 15', middle:'Type 96A/B',
      legacy:'Older Type 59/79 families; status is not consistently public'},
    airTiers:{high:'J-20 and J-16', middle:'J-10C and J-11 variants',
      legacy:'Older J-7/J-8 families; active/storage status varies'},
    special:'DF-series ballistic and cruise-missile families; SIPRI estimates the stockpile, not individual missile readiness.',
    elite:'PLA special-operations brigades; People’s Armed Police special police units.',
    intel:['Ministry of State Security (MSS)','PLA intelligence elements','Ministry of Public Security (MPS)']
  },
  USA: {
    active:1333030, reserve:799500, age:4445524,
    air:{total:[13032,9774], fighters:[1791,1343], attack:[926,695], bombers:null,
      transport:[917,688], trainers:[2610,1958], special:[611,458], tankers:[610,458]},
    land:{tanks:[4666,3500], vehicles:null, sp:[1521,1141],
      towed:[1878,1409], mlrs:[1731,1298]},
    navy:{total:465, carriers:11, heloCarriers:null, destroyers:null, frigates:null,
      corvettes:null, submarines:null, patrol:null, mine:null},
    armorTiers:{high:'M1A2 Abrams variants', middle:'M1A1 Abrams variants',
      legacy:'Older and stored vehicles are not a count of field-ready tanks'},
    airTiers:{high:'F-35 and F-22', middle:'F-15 and F-16 families',
      legacy:'Stored/retired aircraft excluded from a serviceability claim'},
    special:'Nuclear triad: land-based ICBMs, submarine-launched missiles and strategic bombers. SIPRI total is an inventory estimate, not a deployed-only count.',
    elite:'Army Special Forces and Delta Force; Navy SEALs/DEVGRU; 75th Ranger Regiment.',
    intel:['Central Intelligence Agency (CIA)','National Security Agency (NSA)','Defense Intelligence Agency (DIA)','Federal Bureau of Investigation (FBI)','Office of the Director of National Intelligence (ODNI)']
  },
  RUS: {
    active:1320000, reserve:2000000, age:1267387,
    air:{total:[4237,2754], fighters:[861,560], attack:[698,454], bombers:null,
      transport:[458,298], trainers:[530,345], special:[137,89], tankers:[18,12]},
    land:{tanks:[5630,3941], vehicles:[126512,88558], sp:[3603,2522],
      towed:[5920,4144], mlrs:[2486,1740]},
    navy:{total:747, carriers:1, heloCarriers:null, destroyers:null, frigates:null,
      corvettes:null, submarines:null, patrol:null, mine:null},
    armorTiers:{high:'T-90M and T-80BVM', middle:'T-72B3/B3M',
      legacy:'Older T-62/T-72/T-80 stocks; GFP total is not an active-only count'},
    airTiers:{high:'Su-35S and limited Su-57', middle:'Su-30SM and Su-34',
      legacy:'Older aircraft; losses, storage and serviceability are contested'},
    special:'Strategic forces include land, sea and air delivery systems; SIPRI estimates total inventory. Conventional missile readiness is not independently confirmed.',
    elite:'Special Operations Forces (SSO); GRU special-purpose units.',
    intel:['Foreign Intelligence Service (SVR)','Federal Security Service (FSB)','Main Directorate (GU/GRU)']
  },
  TUR: {
    active:481000, reserve:380000, age:1430032,
    air:{total:[1101,771], fighters:[201,141], attack:[0,0], bombers:null,
      transport:[84,59], trainers:[301,211], special:[27,19], tankers:[7,5]},
    land:{tanks:[2284,1599], vehicles:null, sp:null, towed:null, mlrs:[237,166]},
    navy:{total:192, carriers:0, heloCarriers:1, destroyers:0, frigates:17,
      corvettes:9, submarines:14, patrol:40, mine:11},
    armorTiers:{high:'Leopard 2A4', middle:'M60T and Leopard 1 families',
      legacy:'Older M48/M60 stocks; readiness is not itemized by model'},
    airTiers:{high:'Modernized F-16 variants', middle:'Other F-16 blocks',
      legacy:'No publicly itemized high/mid/legacy fleet counts'},
    special:'No nuclear warhead inventory is listed by SIPRI for Türkiye; NATO nuclear-sharing arrangements are not a Turkish national arsenal.',
    elite:'Special Forces Command (ÖKK); Naval SAT/SAS teams.',
    intel:['National Intelligence Organization (MİT)']
  },
  IRN: {
    active:610000, reserve:350000, age:1414191,
    air:{total:[551,303], fighters:[188,103], attack:[21,12], bombers:null,
      transport:[86,47], trainers:null, special:null, tankers:null},
    land:{tanks:[2675,null], vehicles:[75939,45563], sp:[424,254],
      towed:[1803,1082], mlrs:[1550,930]},
    navy:{total:109, carriers:0, heloCarriers:0, destroyers:0, frigates:7,
      corvettes:3, submarines:25, patrol:21, mine:null},
    armorTiers:{high:'Karrar and selected T-72 variants', middle:'T-72 and locally modified families',
      legacy:'Older M60, Chieftain and T-54/55 families; exact active counts are not public'},
    airTiers:{high:'Limited modernized types; no public tier count', middle:'F-14, MiG-29 and locally maintained aircraft',
      legacy:'Aging F-4/F-5 and other legacy airframes; status varies'},
    special:'Ballistic-missile and uncrewed-aircraft programmes are public; they are not evidence of a nuclear warhead. SIPRI lists no Iranian nuclear arsenal.',
    elite:'IRGC Quds Force; Artesh 65th NOHED Airborne Special Forces Brigade; IRGC special units.',
    intel:['Ministry of Intelligence (MOIS)','IRGC Intelligence Organization']
  },
  ISR: {
    active:169500, reserve:465000, age:131637,
    air:{total:[597,478], fighters:[239,191], attack:[45,36], bombers:null,
      transport:[14,11], trainers:[148,118], special:[19,15], tankers:[13,10]},
    land:{tanks:[1300,1040], vehicles:null, sp:null, towed:null, mlrs:[228,182]},
    navy:{total:82, carriers:0, heloCarriers:0, destroyers:null, frigates:null,
      corvettes:null, submarines:null, patrol:null, mine:null},
    armorTiers:{high:'Merkava Mk 4', middle:'Merkava Mk 3',
      legacy:'Older models and reserve stocks; counts by tier are not public'},
    airTiers:{high:'F-35I', middle:'F-15 and F-16 families',
      legacy:'Older or reserve airframes; exact status is not public'},
    special:'SIPRI lists an estimated inventory; Israel maintains a policy of nuclear ambiguity and does not officially confirm a nuclear arsenal.',
    elite:'Sayeret Matkal; Shayetet 13; Unit 669.',
    intel:['Mossad','Israel Security Agency (Shin Bet)','Military Intelligence Directorate (Aman)']
  },
  GBR: {
    active:141330, reserve:31940, age:753050,
    air:{total:[625,406], fighters:[103,67], attack:[38,25], bombers:null,
      transport:[30,20], trainers:[201,131], special:[29,19], tankers:[9,6]},
    land:{tanks:[288,187], vehicles:null, sp:null, towed:null, mlrs:[43,28]},
    navy:{total:116, carriers:2, heloCarriers:0, destroyers:null, frigates:null,
      corvettes:null, submarines:null, patrol:null, mine:null},
    armorTiers:{high:'Challenger 2 (Challenger 3 is a future upgrade, not counted here)', middle:'—',
      legacy:'Stored/retired fleet not treated as serviceable'},
    airTiers:{high:'F-35B and Typhoon', middle:'—', legacy:'No dedicated strategic bomber fleet'},
    special:'Sea-based Trident deterrent; SIPRI inventory estimate includes deployed, stored and retired warheads.',
    elite:'Special Air Service (SAS); Special Boat Service (SBS).',
    intel:['Secret Intelligence Service (SIS/MI6)','Security Service (MI5)','GCHQ','Defence Intelligence']
  },
  FRA: {
    active:264000, reserve:43444, age:752121,
    air:{total:[974,779], fighters:[223,178], attack:[0,0], bombers:null,
      transport:[118,94], trainers:[140,112], special:[44,35], tankers:[15,12]},
    land:{tanks:[427,342], vehicles:null, sp:null, towed:null, mlrs:null},
    navy:{total:166, carriers:1, heloCarriers:3, destroyers:11, frigates:null,
      corvettes:null, submarines:null, patrol:null, mine:null},
    armorTiers:{high:'Leclerc', middle:'—', legacy:'No separate legacy MBT tier count published'},
    airTiers:{high:'Rafale', middle:'—', legacy:'No dedicated strategic bomber fleet'},
    special:'Sea-based M51 missiles and air-launched ASMPA; SIPRI inventory estimate includes deployed, stored and retired warheads.',
    elite:'1er RPIMa; 13e RDP; Commando Hubert.',
    intel:['Directorate-General for External Security (DGSE)','Directorate-General for Internal Security (DGSI)','Directorate of Military Intelligence (DRM)']
  },
  DEU: {
    active:184324, reserve:860000, age:841191,
    air:{total:[569,427], fighters:[127,95], attack:[63,47], bombers:null,
      transport:[55,41], trainers:[16,12], special:[27,20], tankers:[3,2]},
    land:{tanks:[296,222], vehicles:null, sp:null, towed:null, mlrs:[33,25]},
    navy:{total:96, carriers:0, heloCarriers:0, destroyers:null, frigates:null,
      corvettes:null, submarines:null, patrol:null, mine:null},
    armorTiers:{high:'Leopard 2A7/A8 family', middle:'Earlier Leopard 2 variants',
      legacy:'Stored/retired vehicles are not a serviceable-count estimate'},
    airTiers:{high:'Eurofighter Typhoon', middle:'—', legacy:'No dedicated strategic bomber fleet'},
    special:'No German national nuclear-warhead inventory is estimated by SIPRI; NATO nuclear-sharing is a separate arrangement.',
    elite:'Kommando Spezialkräfte (KSK); Kampfschwimmer (KSM).',
    intel:['Federal Intelligence Service (BND)','Federal Office for the Protection of the Constitution (BfV)','Military Counterintelligence Service (MAD)']
  },
  JPN: {
    active:251500, reserve:56000, age:1108818,
    air:{total:[1429,1143], fighters:[217,174], attack:[47,38], bombers:null,
      transport:[53,42], trainers:[399,319], special:[135,108], tankers:[10,8]},
    land:{tanks:[734,587], vehicles:null, sp:null, towed:null, mlrs:[99,79]},
    navy:{total:158, carriers:0, heloCarriers:4, destroyers:null, frigates:null,
      corvettes:null, submarines:null, patrol:null, mine:null},
    armorTiers:{high:'Type 10', middle:'Type 90', legacy:'Older Type 74 fleet; phase-out status varies'},
    airTiers:{high:'F-35A/B', middle:'F-15J and F-2', legacy:'No dedicated strategic bomber fleet'},
    special:'No Japanese nuclear-warhead inventory is estimated by SIPRI; Japan is a non-nuclear-weapon state under the NPT.',
    elite:'Special Forces Group; Amphibious Rapid Deployment Brigade; Special Boarding Unit.',
    intel:['Cabinet Intelligence and Research Office (CIRO)','Defense Intelligence Headquarters (DIH)','Public Security Intelligence Agency (PSIA)']
  },
  KOR: {
    active:450000, reserve:3100000, age:416654,
    air:{total:[1540,1078], fighters:[242,169], attack:[98,69], bombers:null,
      transport:[40,28], trainers:[335,235], special:[35,25], tankers:[4,3]},
    land:{tanks:[1831,1282], vehicles:null, sp:null, towed:null, mlrs:[525,368]},
    navy:{total:215, carriers:0, heloCarriers:2, destroyers:null, frigates:null,
      corvettes:null, submarines:null, patrol:null, mine:null},
    armorTiers:{high:'K2 Black Panther', middle:'K1A1/K1',
      legacy:'Older M48 fleet; status and reserve counts vary'},
    airTiers:{high:'F-35A and F-15K', middle:'KF-16 and FA-50', legacy:'No dedicated strategic bomber fleet'},
    special:'No South Korean nuclear-warhead inventory is estimated by SIPRI; public strategic systems are conventionally armed.',
    elite:'707th Special Mission Group; UDT/SEAL.',
    intel:['National Intelligence Service (NIS)','Defense Intelligence Command']
  },
  PRK: {
    active:1320000, reserve:560000, age:420779,
    air:{total:[837,377], fighters:[341,153], attack:[114,51], bombers:null,
      transport:[1,0], trainers:[176,79], special:[0,0], tankers:[0,0]},
    land:{tanks:[4895,2448], vehicles:null, sp:null, towed:null, mlrs:[1500,750]},
    navy:{total:332, carriers:0, heloCarriers:0, destroyers:null, frigates:null,
      corvettes:null, submarines:null, patrol:null, mine:null},
    armorTiers:{high:'Newer Chonma/Pokpung-family designs (numbers unverified)',
      middle:'T-62-derived Chonma-ho families', legacy:'Older T-55/T-59 derivatives; readiness highly uncertain'},
    airTiers:{high:'Small MiG-29 fleet', middle:'MiG-23/MiG-21 families',
      legacy:'Large older fleet; GFP readiness model is especially uncertain'},
    special:'SIPRI estimates a highly uncertain nuclear inventory; missile tests and public parades do not establish operational readiness.',
    elite:'Reconnaissance General Bureau special-operations elements; exact force structure and strength are not public.',
    intel:['Reconnaissance General Bureau (RGB)','Ministry of State Security']
  },
  UKR: {
    active:900000, reserve:4000000, age:392280,
    air:{total:[347,191], fighters:[88,48], attack:[30,17], bombers:null,
      transport:[22,12], trainers:[72,40], special:[5,3], tankers:[0,0]},
    land:{tanks:[1121,729], vehicles:null, sp:null, towed:null, mlrs:[288,187]},
    navy:{total:169, carriers:0, heloCarriers:0, destroyers:0, frigates:null,
      corvettes:null, submarines:0, patrol:null, mine:null},
    armorTiers:{high:'Donated Leopard 2/Abrams/Challenger and newer Ukrainian types',
      middle:'T-64/T-72/T-80 variants', legacy:'Inventory changes rapidly in wartime; totals are not a current serviceability count'},
    airTiers:{high:'F-16 and donated Western types', middle:'MiG-29/Su-27 families',
      legacy:'Su-24/Su-25 and other legacy airframes; losses/repairs change totals'},
    special:'No Ukrainian nuclear-warhead inventory is estimated by SIPRI. GFP wartime inventory/reserve estimates are especially volatile.',
    elite:'Special Operations Forces of Ukraine; Security Service Alpha unit.',
    intel:['Defence Intelligence of Ukraine (HUR)','Security Service of Ukraine (SBU)','Foreign Intelligence Service (SZRU)']
  },
  EGY: {
    active:438500, reserve:479000, age:1668709,
    air:{total:[1088,707], fighters:[242,157], attack:[90,59], bombers:null,
      transport:[53,34], trainers:null, special:null, tankers:null},
    land:{tanks:[3620,null], vehicles:[54694,38286], sp:[1056,739],
      towed:[962,673], mlrs:[648,454]},
    navy:{total:149, carriers:0, heloCarriers:2, destroyers:0, frigates:13,
      corvettes:7, submarines:8, patrol:61, mine:17},
    armorTiers:{high:'M1A1 Abrams', middle:'M60A3 and other upgraded families',
      legacy:'Older T-54/55 and T-62 stocks; operational status varies'},
    airTiers:{high:'Rafale and modern F-16 blocks', middle:'F-16 and MiG-29 families',
      legacy:'Older MiG-21/Mirage families; active status varies'},
    special:'No Egyptian nuclear-warhead inventory is estimated by SIPRI; strategic systems are conventionally armed.',
    elite:'Thunderbolt Unit (Unit 777); Unit 999 (public reporting; exact structure not fully disclosed).',
    intel:['General Intelligence Service (GIS)','National Security Sector (Homeland Security)']
  },
  SAU: {
    active:247000, reserve:null, age:621255,
    air:{total:[917,596], fighters:[283,184], attack:[81,53], bombers:null,
      transport:[49,32], trainers:[202,131], special:[16,10], tankers:[22,14]},
    land:{tanks:[1085,705], vehicles:null, sp:null, towed:null, mlrs:[327,213]},
    navy:{total:32, carriers:0, heloCarriers:0, destroyers:null, frigates:null,
      corvettes:null, submarines:0, patrol:null, mine:null},
    armorTiers:{high:'M1A2S Abrams', middle:'M60A3', legacy:'Older AMX-30 / stored equipment; counts are uncertain'},
    airTiers:{high:'F-15SA and Typhoon', middle:'F-15S/modernized F-15 families',
      legacy:'Tornado and older F-15 variants; serviceability not independently counted'},
    special:'No Saudi nuclear-warhead inventory is estimated by SIPRI; any future nuclear plans are not an existing arsenal.',
    elite:'Royal Saudi Land Forces Special Forces; Special Security Forces.',
    intel:['General Intelligence Presidency (GIP)','Presidency of State Security (PSS)']
  },
  AZE: {
    active:126000, reserve:306000, age:159754,
    air:{total:[159,87], fighters:[12,7], attack:[20,11], bombers:null,
      transport:[4,2], trainers:[36,20], special:[0,0], tankers:[0,0]},
    land:{tanks:[1354,880], vehicles:null, sp:null, towed:null, mlrs:[696,452]},
    navy:{total:32, carriers:0, heloCarriers:0, destroyers:0, frigates:null,
      corvettes:null, submarines:0, patrol:null, mine:null},
    armorTiers:{high:'T-90S', middle:'T-72 families',
      legacy:'Older T-55/T-62 families; serviceability not public'},
    airTiers:{high:'No publicly reported high-end fighter fleet count',
      middle:'MiG-29', legacy:'Su-25 and older aircraft; exact availability is not public'},
    special:'No Azerbaijani nuclear-warhead inventory is estimated by SIPRI.',
    elite:'Special Forces Command; Naval Special Forces elements.',
    intel:['State Security Service (SSS)','Foreign Intelligence Service (FIS)']
  },
  BGD: {
    active:204000, reserve:null, age:3205246,
    air:{total:[212,138], fighters:[41,27], attack:[0,0], bombers:null,
      transport:[17,11], trainers:[83,54], special:[4,3], tankers:[0,0]},
    land:{tanks:[320,224], vehicles:null, sp:null, towed:null, mlrs:[103,72]},
    navy:{total:121, carriers:0, heloCarriers:0, destroyers:null, frigates:null,
      corvettes:null, submarines:null, patrol:null, mine:null},
    armorTiers:{high:'VT-5 light tank', middle:'MBT-2000/Type 90-II and Type 69 families',
      legacy:'Older Type 59 variants; counts and readiness by model are not public'},
    airTiers:{high:'No publicly reported high-end fighter tier count', middle:'MiG-29',
      legacy:'F-7 and other older aircraft; status varies'},
    special:'No Bangladeshi nuclear-warhead inventory is estimated by SIPRI.',
    elite:'Para Commando Brigade; SWADS naval special warfare unit.',
    intel:['Directorate General of Forces Intelligence (DGFI)','National Security Intelligence (NSI)']
  }
};

/* Global Firepower annual military-age cohort (2026). The source does not
   state an age band; these are not fit, eligible or willing recruits. */
const MIL_2026_SOURCE = {
  annualAgeUrl:'https://www.globalfirepower.com/manpower-reaching-military-age-annually.php',
  activeUrl:'https://www.globalfirepower.com/active-military-manpower.php',
  reserveUrl:'https://www.globalfirepower.com/active-reserve-military-manpower.php',
  aircraftUrl:'https://www.globalfirepower.com/aircraft-total.php',
  tanksUrl:'https://www.globalfirepower.com/armor-tanks-total.php',
  navyUrl:'https://www.globalfirepower.com/navy-ships.php',
  profileBase:'https://www.globalfirepower.com/country-military-strength-detail.php?country_id='
};
const GFP_PROFILE_SLUG = {
  PAK:'pakistan', IND:'india', CHN:'china', USA:'united-states-of-america', RUS:'russia',
  TUR:'turkey', IRN:'iran', ISR:'israel', GBR:'united-kingdom', FRA:'france', DEU:'germany',
  JPN:'japan', KOR:'south-korea', PRK:'north-korea', UKR:'ukraine', EGY:'egypt',
  SAU:'saudi-arabia', AZE:'azerbaijan', BGD:'bangladesh'
};

/* Country-level public intelligence agencies: names only, no invented staff totals. */
const INTEL_DISCLOSURE = {
  PAK:{note:'This reference set names publicly identified agencies only; it does not establish station/agent coverage by country or total staffing.'},
  DEFAULT:{note:'This reference set does not establish station/agent coverage by country or total staffing. Unknown does not mean no activity.'}
};

/* Public estimates from WNA / OECD-NEA & IAEA Red Book. 2024 mine output;
   identified resources recoverable at <= US$130/kg U as of 2025-01-01. */
const URANIUM_2026 = {
  KAZ:{output:23270, resources:1219000}, CAN:{output:14309, resources:639700},
  NAM:{output:7333, resources:504500}, AUS:{output:4598, resources:2119800},
  UZB:{output:4000, resources:null}, RUS:{output:2738, resources:745600},
  CHN:{output:1600, resources:492200}, NER:{output:962, resources:412500},
  IND:{output:500, resources:null}, ZAF:{output:200, resources:405700},
  UKR:{output:288, resources:206800}, USA:{output:260, resources:null},
  BRA:{output:null, resources:231000}, MNG:{output:null, resources:223000},
  TZA:{output:null, resources:75000}
};
const URANIUM_SOURCE_URL = 'https://world-nuclear.org/information-library/nuclear-fuel-cycle/mining-of-uranium/world-uranium-mining-production';

/*
 * USGS Mineral Commodity Summaries 2026, country tables for 2025 estimated
 * mine production and reserves. Units are commodity-specific; this compact
 * dataset deliberately includes only figures that appeared in the tables.
 * An absent country row is unknown/not listed, never zero.
 */
const USGS_MINERALS_2026 = [
  {name:'Gold',symbol:'Au',unit:'metric tons of gold content',source:'USGS MCS 2026',rows:{
    USA:{prod:'160',reserve:'3,000'}, AUS:{prod:'280',reserve:'13,000'}, BRA:{prod:'80',reserve:'2,500'},
    CAN:{prod:'200',reserve:'3,200'}, CHN:{prod:'380',reserve:'3,200'}, GHA:{prod:'150',reserve:'1,000'},
    IDN:{prod:'90',reserve:'3,600'}, KAZ:{prod:'130',reserve:'2,300'}, MEX:{prod:'140',reserve:'1,400'},
    PER:{prod:'110',reserve:'2,200'}, RUS:{prod:'310',reserve:'12,000'}, ZAF:{prod:'90',reserve:'5,000'},
    UZB:{prod:'130',reserve:'2,200'}
  }},
  {name:'Silver',symbol:'Ag',unit:'metric tons of silver content',source:'USGS MCS 2026',rows:{
    USA:{prod:'1,100',reserve:'23,000'}, ARG:{prod:'800',reserve:'6,500'}, AUS:{prod:'1,000',reserve:'91,000'},
    BOL:{prod:'1,500',reserve:'22,000'}, CAN:{prod:'400',reserve:'4,900'}, CHL:{prod:'1,400',reserve:'33,000'},
    CHN:{prod:'3,400',reserve:'67,000'}, IND:{prod:'800',reserve:'8,000'}, MEX:{prod:'6,300',reserve:'37,000'},
    PER:{prod:'3,600',reserve:'110,000'}, POL:{prod:'1,300',reserve:'59,000'}, RUS:{prod:'1,200',reserve:'92,000'}
  }},
  {name:'Copper',symbol:'Cu',unit:'thousand metric tons of copper content',source:'USGS MCS 2026',rows:{
    USA:{prod:'1,000',reserve:'47,000'}, AUS:{prod:'730',reserve:'100,000'}, CAN:{prod:'500',reserve:'7,000'},
    CHL:{prod:'5,300',reserve:'180,000'}, CHN:{prod:'1,800',reserve:'41,000'}, COD:{prod:'3,200',reserve:'80,000'},
    IND:{prod:'23',reserve:'2,200'}, IDN:{prod:'710',reserve:'21,000'}, KAZ:{prod:'710',reserve:'20,000'},
    MEX:{prod:'690',reserve:'53,000'}, PER:{prod:'2,700',reserve:'85,000'}, RUS:{prod:'1,300',reserve:'80,000'},
    ZMB:{prod:'940',reserve:'21,000'}
  }},
  {name:'Lithium',symbol:'Li',unit:'metric tons of lithium content',source:'USGS MCS 2026',rows:{
    USA:{prod:'Withheld',reserve:'4,400,000'}, ARG:{prod:'23,000',reserve:'4,400,000'},
    AUS:{prod:'92,000',reserve:'8,400,000'}, BRA:{prod:'12,000',reserve:'540,000'},
    CAN:{prod:'5,600',reserve:'1,600,000'}, CHL:{prod:'56,000',reserve:'9,200,000'},
    CHN:{prod:'62,000',reserve:'4,600,000'}, MLI:{prod:'9,400',reserve:'370,000'},
    PRT:{prod:'380',reserve:'60,000'}, ZWE:{prod:'28,000',reserve:'500,000'}
  }},
  {name:'Rare earths',symbol:'REO',unit:'metric tons, rare-earth-oxide equivalent',source:'USGS MCS 2026',rows:{
    USA:{prod:'51,000',reserve:'1,900,000'}, AUS:{prod:'29,000',reserve:'6,300,000'},
    BRA:{prod:'2,000',reserve:'11,000,000'}, CAN:{prod:'0 (USGS dash)',reserve:'830,000'},
    CHN:{prod:'270,000',reserve:'44,000,000'}, IND:{prod:'2,900',reserve:'Not available'},
    RUS:{prod:'2,600',reserve:'3,800,000'}, ZAF:{prod:'0 (USGS dash)',reserve:'860,000'},
    TZA:{prod:'0 (USGS dash)',reserve:'890,000'}, VNM:{prod:'150',reserve:'3,500,000'}
  }},
  {name:'Cobalt',symbol:'Co',unit:'metric tons of cobalt content',source:'USGS MCS 2026',rows:{
    USA:{prod:'300',reserve:'70,000'}, AUS:{prod:'3,700',reserve:'1,700,000'},
    CAN:{prod:'3,500',reserve:'220,000'}, CHN:{prod:'2,000',reserve:'160,000'},
    COD:{prod:'230,000',reserve:'6,000,000'}, CUB:{prod:'2,000',reserve:'500,000'},
    IDN:{prod:'44,000',reserve:'760,000'}, MDG:{prod:'3,900',reserve:'100,000'},
    PNG:{prod:'2,800',reserve:'84,000'}, PHL:{prod:'3,700',reserve:'260,000'},
    RUS:{prod:'7,700',reserve:'800,000'}, TUR:{prod:'1,900',reserve:'91,000'}
  }},
  {name:'Nickel',symbol:'Ni',unit:'metric tons of nickel content',source:'USGS MCS 2026',rows:{
    USA:{prod:'10,000',reserve:'340,000'}, AUS:{prod:'45,000',reserve:'25,000,000'},
    BRA:{prod:'70,000',reserve:'16,000,000'}, CAN:{prod:'140,000',reserve:'2,200,000'},
    CHN:{prod:'120,000',reserve:'4,400,000'}, IDN:{prod:'2,600,000',reserve:'62,000,000'},
    NCL:{prod:'140,000',reserve:'7,100,000'}, PHL:{prod:'270,000',reserve:'4,800,000'},
    RUS:{prod:'200,000',reserve:'8,300,000'}
  }},
  {name:'Platinum-group metals',symbol:'PGM',unit:'production = combined Pt + Pd; reserves = total PGM content (metric tons)',source:'USGS MCS 2026',rows:{
    USA:{prod:'8',reserve:'590'}, CAN:{prod:'21',reserve:'310'}, RUS:{prod:'104',reserve:'11,000'},
    ZAF:{prod:'190',reserve:'63,000'}, ZWE:{prod:'33',reserve:'1,300'}
  }},
  {name:'Natural industrial diamond',symbol:'C',unit:'million carats; industrial diamond only, not gem-quality diamond',source:'USGS MCS 2026',rows:{
    AGO:{prod:'1',reserve:'150'}, BWA:{prod:'5',reserve:'250'}, COD:{prod:'7',reserve:'150'},
    RUS:{prod:'16',reserve:'750'}, ZAF:{prod:'3',reserve:'87'}, ZWE:{prod:'5',reserve:'56'}
  }},
  {name:'Iron ore',symbol:'Fe',unit:'production = million metric tons usable ore; reserves = million metric tons crude ore (iron content in brackets)',source:'USGS MCS 2026',rows:{
    USA:{prod:'38',reserve:'3,600 (2,700 Fe)'}, AUS:{prod:'980',reserve:'659,000 (627,000 Fe)'},
    BRA:{prod:'420',reserve:'34,000 (15,000 Fe)'}, CAN:{prod:'69',reserve:'6,000 (2,300 Fe)'},
    CHL:{prod:'19',reserve:'3,000 (740 Fe)'}, CHN:{prod:'290',reserve:'17,000 (3,000 Fe)'},
    IND:{prod:'310',reserve:'5,500 (3,400 Fe)'}, IRN:{prod:'93',reserve:'4,200 (1,500 Fe)'},
    KAZ:{prod:'35',reserve:'3,800 (1,500 Fe)'}, MEX:{prod:'7.7',reserve:'940 (520 Fe)'},
    PER:{prod:'21',reserve:'1,800 (1,000 Fe)'}, RUS:{prod:'86',reserve:'35,000 (14,000 Fe)'},
    ZAF:{prod:'66',reserve:'1,200 (680 Fe)'}, SWE:{prod:'26',reserve:'1,300 (600 Fe)'},
    TUR:{prod:'18',reserve:'150 (99 Fe)'}, UKR:{prod:'52',reserve:'76,500 (72,300 Fe)'}
  }}
];
const USGS_MCS_2026_URL = 'https://doi.org/10.3133/mcs2026';

/* Pakistan project-specific entries, kept separate from national USGS tables. */
const LOCAL_RESOURCE_FACTS = {
  PAK:[
    {name:'Reko Diq copper',output:'Not producing; first production targeted for end-2028 (project forecast)',
      reserve:'~15 million metric tons contained copper; probable reserves, 100% project basis, 2025 feasibility',
      note:'Barrick 50%; Pakistan federal/provincial interests together 50%. Project reserve is not current national mine output.'},
    {name:'Reko Diq gold',output:'Not producing; first production targeted for end-2028 (project forecast)',
      reserve:'~26 million troy ounces; probable reserves, 100% project basis, 2025 feasibility',
      note:'Same copper-gold orebody/project as the copper line above; not an independent mine.'},
    {name:'Thar coal',output:'SECMC Block II stated annual mine capacity: 7.6 million tonnes/year (capacity, not actual annual output)',
      reserve:'Company/industry estimate ~175 billion tonnes in-place across Thar; not equivalent to proved recoverable reserves. Block II 2012–13 study: 2.039 billion tonnes resource, 1.57 billion tonnes described as mineable.',
      note:'Keep in-place geological resource, project resource and national proved reserves distinct.'},
    {name:'Other Pakistani minerals & gems',output:'No comparable national production figures included here',
      reserve:'Rock salt, gypsum, chromite, iron ore and gemstones are reported; no unsupported country-wide reserve totals are added.',
      note:'Gem-quality emerald, ruby, topaz and other stones are not covered by the industrial-diamond table.'}
  ]
};

/* Pakistan energy-balance data reproduced in the Ministry's 2025 brochure;
   source table is Pakistan Energy Year Book 2023–24. Values are MTOE, not
   physical volume, proved reserves, or installed generation capacity. */
const ENERGY_BALANCE_PAK = {
  year:'FY2023–24',
  indigenous:[
    ['Crude oil',3.463],['Natural gas',23.597],['LPG',0.595],['Coal',8.616],
    ['Hydroelectricity',9.528],['Nuclear electricity',5.967],['Renewables',1.360]
  ],
  imports:[
    ['Gas, including LNG',9.114],['Crude oil',8.474],['Petroleum products',7.096],
    ['LPG',1.230],['Coal',3.592],['Electricity',0.090]
  ],
  gasResource:'The 2025 Ministry brochure says total conventional and unconventional gas reserves are estimated at about 160 Tcf; this is an opportunity estimate, not a proved-reserve figure.',
  source:'https://ppisonline.com/Brochure/Investment%20Brochure%202025.pdf'
};

/* Oil: daily rates are million barrels/day; monthly numbers are 30-day equivalents.
   Only explicit, source-matched crude flows are filled. A blank is not zero. */
const OIL_PROFILE = {
  PAK:{reserves:'239.55 million barrels proved (FY2024–25; Ministry of Energy)', productionDaily:0.062459,
    productionYear:'FY2024–25 crude', productionType:'Crude oil', importsMonthly:5.18,
    importsYear:'FY2023–24 crude imports: 8.474 MTOE converted at 7.33 bbl/toe',
    exportsMonthly:null, exportsYear:'No comparable separate crude-export figure found',
    note:'Production and import periods differ. Refined petroleum products are a separate flow; this is not Pakistan’s total petroleum import bill.'},
  IND:{reserves:'About 4.9 billion barrels recoverable (2023; EIA estimate)', productionDaily:0.604,
    productionYear:'2023 crude', productionType:'Crude oil', importsDaily:4.5, importsYear:'2023 crude imports', exportsDaily:null,
    exportsYear:'No comparable crude-export figure in cited EIA source',
    note:'Crude only; refined petroleum products and stock changes are excluded.'},
  CHN:{reserves:'About 26.2 billion barrels proved (2023; EIA estimate)', productionDaily:4.32,
    productionYear:'2025 crude, including lease condensate (EIA estimate)', productionType:'Crude oil',
    importsDaily:11.0, importsYear:'Approximately 11 Mb/d; customs data, reference year not stated in cited summary', exportsDaily:null,
    exportsYear:'No comparable crude-export figure in cited source',
    note:'Crude only. The import value is approximate; reserve estimates and output definitions vary by source.'},
  USA:{reserves:'About 48.3 billion barrels proved (2023-era EIA/OPEC compilation)',
    productionDaily:13.66, productionYear:'2025 crude, including lease condensate (EIA actual)', productionType:'Crude oil',
    importsDaily:6.6, importsYear:'2024 crude imports', exportsDaily:4.1, exportsYear:'2024 crude exports',
    note:'Crude only; U.S. petroleum liquids, natural-gas liquids and refined-product flows are larger and reported separately.'},
  SAU:{reserves:'About 267.2 billion barrels proved (2023; OPEC Annual Statistical Bulletin)',
    productionDaily:9.55, productionYear:'2025 crude, including lease condensate (EIA actual)', productionType:'Crude oil',
    importsDaily:null, importsYear:'No comparable crude-import series listed in the cited source',
    exportsDaily:7.0, exportsYear:'2023 crude exports (EIA country brief)',
    note:'Production and export reference years differ; do not read this as a live monthly meter.'},
  RUS:{reserves:'About 80 billion barrels proved (2023-era compilation; source definitions vary)',
    productionDaily:9.89, productionYear:'2025 crude, including lease condensate (EIA estimate)', productionType:'Crude oil',
    importsDaily:null, importsYear:'No comparable country-level crude-import figure',
    exportsDaily:4.8, exportsYear:'2023 crude/condensate export estimate; sanctions reduce transparency',
    note:'Production and export series use different reference periods; sanctions also reduce trade transparency.'},
  IRN:{reserves:'About 208.6 billion barrels proved (2023; OPEC/national reporting)',
    productionDaily:4.05, productionYear:'2025 crude, including lease condensate (EIA estimate)', productionType:'Crude oil',
    importsDaily:null, importsYear:'Trade data is incomplete under sanctions', exportsDaily:null,
    exportsYear:'Export estimates vary; no single comparable official monthly figure is shown',
    note:'Use caution: trade transparency and source definitions vary under sanctions.'},
  ARE:{reserves:'About 113 billion barrels proved (2023; OPEC/national reporting)',
    productionDaily:3.77, productionYear:'2025 crude, including lease condensate (EIA estimate)', productionType:'Crude oil',
    importsDaily:null, importsYear:'No comparable country-level crude-import figure', exportsDaily:null,
    exportsYear:'No comparable country-level crude-export figure',
    note:'Trade is not inferred from production; source coverage is incomplete.'}
};
const OIL_SOURCES = {
  PAK:'https://ppisonline.com/Brochure/Investment%20Brochure%202025.pdf',
  IND:'https://www.eia.gov/international/content/analysis/countries_long/India/pdf/India.pdf',
  CHN:'https://worldoilmonitor.com/china-oil',
  USA:'https://worldoilmonitor.com/us-oil-production',
  SAU:'https://worldoilmonitor.com/saudi-arabia-oil',
  RUS:'https://worldoilmonitor.com/russia-oil',
  IRN:'https://worldoilmonitor.com/iran-oil',
  ARE:'https://worldoilmonitor.com/uae-oil'
};
const OIL_TRADE_SOURCES = {
  PAK:'https://ppisonline.com/Brochure/Investment%20Brochure%202025.pdf',
  IND:'https://www.eia.gov/international/content/analysis/countries_long/India/pdf/India.pdf',
  CHN:'https://www.eia.gov/international/content/analysis/countries_long/China/pdf/China-2025.pdf',
  USA:'https://www.eia.gov/international/data/world/petroleum-and-other-liquids',
  SAU:'https://www.eia.gov/international/content/analysis/countries_long/Saudi_Arabia/pdf/Saudi-Arabia.pdf',
  RUS:'https://www.eia.gov/international/analysis/country/RUS',
  IRN:'https://www.eia.gov/international/analysis/country/IRN',
  ARE:'https://www.eia.gov/international/analysis/country/ARE'
};

const RESOURCE_NOTES = {
  PAK:'Pakistan project data are shown separately from comparable national USGS tables. Thar in-place geology, mineable resources, proved reserves and mine capacity are different measures. The cited WNA table has no separate Pakistan uranium line.',
  IND:'USGS MCS does not publish country-specific 2025 mine-output/reserve rows for every mineral; missing rows are not zero.',
  CHN:'Production and reserves are commodity-specific; mine output does not equal refined output or export availability.',
  USA:'USGS economic reserves are not all geological resources. Government gold stocks are monetary reserves, not mineable gold.',
  PRK:'Public mineral data are incomplete; no-data entries are not zeros.'
};
