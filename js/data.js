/* ============================================================
   WORLD LEADER 2026 — REAL-WORLD DATA BASELINE (Nov 2026)
   Sources: IMF WEO 2025, World Bank, SIPRI 2025, IISS Military
   Balance 2025, CIA Factbook. Figures are best-estimate values
   projected to Nov 2026. gdp/def/rev in $B. pop in millions.
   troops in thousands. fx = local currency per USD.
   ============================================================ */

const BLOCS = {
  NATO: ['USA','GBR','FRA','DEU','ITA','CAN','TUR','POL','ESP','NLD','BEL','NOR','DNK','NOR','ISL','PRT','GRC','CZE','HUN','ROU','BGR','SVK','SVN','HRV','ALB','EST','LVA','LTU','LUX','MKD','MNE','FIN','SWE'],
  GCC: ['SAU','ARE','QAT','KWT','BHR','OMN'],
  SCO: ['CHN','RUS','IND','PAK','IRN','KAZ','UZB','KGZ','TJK','BLR'],
  BRICS: ['BRA','RUS','IND','CHN','ZAF','ETH','IRN','EGY','ARE','IDN','SAU'],
  EU: ['FRA','DEU','ITA','ESP','NLD','BEL','PRT','GRC','AUT','IRL','FIN','HRV','SVK','SVN','EST','LVA','LTU','POL','CZE','HUN','ROU','BGR','SWE','DNK','CYP','MLT','LUX']
};

/* Deep-profile countries. rel = relations toward PAK (-100..100).
   st = internal stability 0-100. un = unrest/note. ai doctrine drives
   world reactions. nu = nuclear warheads. mil figures approx real. */
const COUNTRIES = {
  PAK: { name:'Pakistan', flag:'🇵🇰', region:'South Asia', player:true,
    pop:241.5, gdp:415, growth:3.0, infl:7.0, debtGdp:70, extDebt:91, reserves:15.5,
    fx:281, currency:'PKR', remit:34, exports:32, imports:58, taxGdp:10.5, deficit:6.0,
    defense:8.6, troops:654, tanks:3719, aircraft:470, ships:60, artillery:4600,
    nu:170, agency:'ISI', leader:'President Zain Chaudary (You)',
    gov:'Federal Parliamentary Republic', st:55,
    rel:{CHN:85,SAU:80,ARE:74,TUR:72,QAT:68,AZE:66,OMN:60,KWT:58,USA:38,GBR:45,CAN:48,
         IRN:26,AFG:6,IND:14,RUS:40,BGD:40,LKA:55,CHN2:0,MLD:52,NPL:55,DEU:50,FRA:48,
         ITA:52,ESP:50,POL:45,JPN:45,KOR:45,AUS:45,IDN:58,MYS:60,EGY:50,MAR:52,DZA:50,
         JOR:52,IRQ:45,SYR:20,YEM:35,SDN:45,TUN:48,LBY:30,PSE:75,UKR:30,BLR:35,KAZ:52,
         UZB:50,TKM:45,TJK:48,KGZ:48,NGA:42,ZAF:48,ETH:45,KEN:45,BRA:48,MEX:42,ARG:45,
         CHL:45,PRK:15,KOR2:0,SGP:52,VNM:52,THA:50,PHL:48,MMR:45,KHM:48,LAO:45,BRN:48,
         CUB:40,VEN:38,BEL:48,NLD:48,SWE:48,NOR:48,DNK:48,FIN:45,GRC:45,CZE:45,HUN:48,
         ROU:45,BGR:45,PRT:48,IRL:48,NZL:45} },

  IND: { name:'India', flag:'🇮🇳', region:'South Asia',
    pop:1440, gdp:4180, growth:6.6, infl:4.5, debtGdp:82, extDebt:700, reserves:700,
    fx:88, currency:'INR', exports:780, imports:860, defense:86,
    troops:1455, tanks:4201, aircraft:613, ships:150, nu:180, agency:'RAW',
    leader:'Narendra Modi', gov:'BJP — Hindu Nationalist', st:70,
    un:'Kashmir insurgency, farmer unrest, sectarian tensions',
    ai:{doctrine:'hegemon-SouthAsia', aggr:0.55},
    rel:{PAK:14,USA:63,RUS:56,CHN:18,FRA:70,GBR:62,ARE:68,SAU:66,JPN:72,AUS:71,ISR:65,IRN:35,AFG:40} },

  CHN: { name:'China', flag:'🇨🇳', region:'East Asia',
    pop:1410, gdp:19200, growth:4.6, infl:0.6, debtGdp:290, extDebt:2500, reserves:3300,
    fx:7.1, currency:'CNY', exports:3600, imports:2700, defense:296,
    troops:2035, tanks:4950, aircraft:1900, ships:370, nu:600, agency:'MSS',
    leader:'Xi Jinping', gov:'CCP One-Party', st:82,
    ai:{doctrine:'rise-quietly', aggr:0.35},
    rel:{PAK:85,USA:25,IND:18,RUS:88,JPN:30,TWN:2,PRK:60,KOR:25,ARE:62,SAU:60,IRN:55,EUT:40} },

  USA: { name:'United States', flag:'🇺🇸', region:'North America',
    pop:342, gdp:30200, growth:2.1, infl:3.0, debtGdp:124, extDebt:0, reserves:0,
    fx:1, currency:'USD', exports:2100, imports:3400, defense:916,
    troops:1328, tanks:2640, aircraft:2757, ships:470, nu:5177, agency:'CIA',
    leader:'Donald Trump', gov:'Republican (MAGA)', st:64,
    un:'Deep political polarization',
    ai:{doctrine:'hegemon-global', aggr:0.45},
    rel:{PAK:38,IND:63,CHN:25,RUS:12,ISR:80,SAU:72,ARE:74,JPN:85,KOR:84,GBR:82,EU:70,IRN:5,AFG:8,PRK:10,TWN:75} },

  RUS: { name:'Russia', flag:'🇷🇺', region:'Eurasia',
    pop:143, gdp:2250, growth:1.2, infl:8.0, debtGdp:20, reserves:570,
    fx:82, currency:'RUB', exports:430, imports:280, defense:149,
    troops:1100, tanks:2700, aircraft:1540, ships:265, nu:5580, agency:'SVR/GRU',
    leader:'Vladimir Putin', gov:'Kremlin Dominant-Party', st:60,
    un:'War economy, Ukraine war grinding on',
    ai:{doctrine:'revanchist', aggr:0.6},
    rel:{PAK:40,CHN:88,IND:56,USA:12,EU:8,UKR:1,IRN:65,PRK:70,IRN2:0,SAU:55,AFG:35} },

  SAU: { name:'Saudi Arabia', flag:'🇸🇦', region:'Middle East',
    pop:33, gdp:1120, growth:3.8, infl:2.0, debtGdp:30, reserves:450,
    fx:3.75, currency:'SAR', exports:330, imports:280, defense:80,
    troops:257, tanks:800, aircraft:285, ships:55, nu:0, agency:'GIP',
    leader:'Crown Prince MBS', gov:'Absolute Monarchy', st:75,
    ai:{doctrine:'money-first', aggr:0.2},
    rel:{PAK:80,USA:72,CHN:60,IRN:30,EGY:65,ARE:75,GBR:65} },

  ARE: { name:'UAE', flag:'🇦🇪', region:'Middle East',
    pop:10.5, gdp:560, growth:4.5, infl:2.2, debtGdp:30, reserves:160,
    fx:3.67, currency:'AED', exports:400, imports:300, defense:23,
    troops:63, tanks:354, aircraft:160, ships:30, nu:0, agency:'UAE ISD',
    leader:'President MBZ', gov:'Federal Monarchy', st:80,
    rel:{PAK:74,IND:68,SAU:75,USA:74,CHN:62,IRN:45,ISR:35,EGY:70} },

  TUR: { name:'Türkiye', flag:'🇹🇷', region:'Middle East/Europe',
    pop:86, gdp:1480, growth:3.2, infl:32, debtGdp:28, reserves:150,
    fx:43, currency:'TRY', exports:270, imports:340, defense:25,
    troops:355, tanks:2237, aircraft:205, ships:45, nu:0, agency:'MİT',
    leader:'Recep Tayyip Erdoğan', gov:'Presidential (AKP)', st:60,
    rel:{PAK:72,USA:40,RUS:55,EU:35,IRN:40,ISR:8,SAU:60,AZE:85,SYR:35} },

  QAT: { name:'Qatar', flag:'🇶🇦', region:'Middle East',
    pop:3.0, gdp:230, growth:2.5, infl:1.5, debtGdp:40, reserves:50,
    fx:3.64, currency:'QAR', exports:100, imports:35, defense:5.5,
    troops:87, tanks:90, aircraft:40, ships:15, nu:0, agency:'QIA-linked',
    leader:'Emir Tamim', gov:'Absolute Monarchy', st:85,
    rel:{PAK:68,USA:78,SAU:68,IRN:50,EGY:55,TUR:70,ISR:15} },

  IRN: { name:'Iran', flag:'🇮🇷', region:'Middle East',
    pop:92, gdp:1750, growth:1.5, infl:35, debtGdp:45, reserves:15,
    fx:900000, currency:'IRR', exports:60, imports:70, defense:16,
    troops:610, tanks:4071, aircraft:335, ships:90, nu:0, agency:'MOIS/Quds',
    leader:'President Pezeshkian / Khamenei', gov:'Islamic Republic', st:52,
    un:'Post-June-2025 strikes: nuclear program set back, economy strangled by sanctions',
    ai:{doctrine:'resistance-axis', aggr:0.4},
    rel:{PAK:26,USA:5,CHN:55,RUS:65,ISR:1,SAU:30,AFG:25,IRQ:60,TUR:40} },

  ISR: { name:'Israel', flag:'🇮🇱', region:'Middle East',
    pop:9.9, gdp:570, growth:3.5, infl:3.0, debtGdp:68, reserves:220,
    fx:3.3, currency:'ILS', exports:70, imports:90, defense:32,
    troops:170, tanks:1370, aircraft:600, ships:15, nu:90, agency:'Mossad',
    leader:'Benjamin Netanyahu', gov:'Likud Coalition', st:65,
    un:'Post-Gaza-war regional hostility',
    ai:{doctrine:'preemption', aggr:0.75},
    rel:{PAK:0,USA:80,IRN:1,EGY:40,JOR:40,SAU:20,TUR:8,ARE:35} },

  AFG: { name:'Afghanistan', flag:'🇦🇫', region:'South/Central Asia',
    pop:42, gdp:17, growth:2.5, infl:5, debtGdp:5, reserves:1.5,
    fx:70, currency:'AFN', exports:2, imports:8, defense:0.4,
    troops:150, tanks:0, aircraft:5, ships:0, nu:0, agency:'GDI (Taliban)',
    leader:'Hibatullah Akhundzada', gov:'Taliban Emirate', st:40,
    un:'TTP leadership based on Afghan soil; Durand Line disputes',
    ai:{doctrine:'ideological', aggr:0.5},
    rel:{PAK:6,CHN:45,RUS:40,IRN:25,USA:8} },

  EGY: { name:'Egypt', flag:'🇪🇬', region:'North Africa',
    pop:107, gdp:400, growth:4.2, infl:12, debtGdp:85, reserves:46,
    fx:48, currency:'EGP', exports:40, imports:95, defense:10,
    troops:440, tanks:3620, aircraft:500, ships:60, nu:0, agency:'MIS',
    leader:'Abdel Fattah el-Sisi', gov:'Military-Backed Republic', st:60,
    rel:{PAK:50,USA:60,SAU:65,ARE:70,CHN:55,ISR:40,ETH:25} },

  GBR: { name:'United Kingdom', flag:'🇬🇧', region:'Europe',
    pop:68.5, gdp:3650, growth:1.3, infl:3.4, debtGdp:100, reserves:0,
    fx:0.77, currency:'GBP', exports:520, imports:680, defense:75,
    troops:138, tanks:213, aircraft:180, ships:30, nu:225, agency:'MI6',
    leader:'Keir Starmer', gov:'Labour', st:62,
    rel:{PAK:45,USA:82,EU:65,IND:62,CHN:25,RUS:5,PAK2:0} },

  FRA: { name:'France', flag:'🇫🇷', region:'Europe',
    pop:66, gdp:3250, growth:1.1, infl:2.0, debtGdp:115, reserves:0,
    fx:0.86, currency:'EUR', exports:650, imports:750, defense:64,
    troops:203, tanks:220, aircraft:220, ships:35, nu:290, agency:'DGSE',
    leader:'Emmanuel Macron', gov:'Centrist (lame duck, 2027 election looms)', st:55,
    rel:{PAK:48,IND:70,USA:60,CHN:30,RUS:6,EU:70} },

  DEU: { name:'Germany', flag:'🇩🇪', region:'Europe',
    pop:83.5, gdp:4750, growth:0.8, infl:2.3, debtGdp:63, reserves:0,
    fx:0.86, currency:'EUR', exports:1550, imports:1350, defense:86,
    troops:182, tanks:300, aircraft:180, ships:30, nu:0, agency:'BND',
    leader:'Friedrich Merz', gov:'CDU Coalition', st:65,
    rel:{PAK:50,USA:60,CHN:35,RUS:5,IND:55} },

  JPN: { name:'Japan', flag:'🇯🇵', region:'East Asia',
    pop:123, gdp:4250, growth:1.0, infl:2.5, debtGdp:250, reserves:1250,
    fx:155, currency:'JPY', exports:720, imports:750, defense:55,
    troops:247, tanks:520, aircraft:280, ships:60, nu:0, agency:'PSIA',
    leader:'Sanae Takaichi', gov:'LDP Conservative', st:75,
    rel:{PAK:45,USA:85,CHN:30,IND:72,KOR:45,PRK:3,RUS:10} },

  KOR: { name:'South Korea', flag:'🇰🇷', region:'East Asia',
    pop:51.5, gdp:1950, growth:2.0, infl:2.2, debtGdp:55, reserves:420,
    fx:1420, currency:'KRW', exports:690, imports:620, defense:47,
    troops:500, tanks:2500, aircraft:450, ships:70, nu:0, agency:'NIS',
    leader:'Lee Jae-myung', gov:'Democratic Party', st:68,
    rel:{PAK:45,USA:84,CHN:35,JPN:45,PRK:2,IND:68} },

  PRK: { name:'North Korea', flag:'🇰🇵', region:'East Asia',
    pop:26, gdp:30, growth:1.0, infl:10, debtGdp:20, reserves:1,
    fx:9000, currency:'KPW', exports:2, imports:3.5, defense:4,
    troops:1280, tanks:3500, aircraft:570, ships:60, nu:50, agency:'RGB',
    leader:'Kim Jong Un', gov:'Juche Dynastic', st:70,
    rel:{PAK:15,CHN:60,RUS:70,USA:10,KOR:2,JPN:2} },

  UKR: { name:'Ukraine', flag:'🇺🇦', region:'Europe',
    pop:35, gdp:200, growth:2.0, infl:10, debtGdp:90, reserves:40,
    fx:42, currency:'UAH', exports:45, imports:70, defense:65,
    troops:900, tanks:1000, aircraft:80, ships:5, nu:0, agency:'SBU/GUR',
    leader:'Volodymyr Zelensky', gov:'Wartime Democracy', st:45,
    rel:{PAK:30,USA:55,EU:75,RUS:1,CHN:20} },

  BGD: { name:'Bangladesh', flag:'🇧🇩', region:'South Asia',
    pop:173, gdp:470, growth:4.8, infl:8.5, debtGdp:38, reserves:27,
    fx:122, currency:'BDT', exports:44, imports:68, defense:4.8,
    troops:163, tanks:300, aircraft:60, ships:20, nu:0, agency:'DGFI',
    leader:'New elected govt (Feb 2026 polls)', gov:'BNP-led Coalition', st:50,
    un:'Post-2024-upheaval polarization, Jamaat rising',
    rel:{PAK:40,IND:35,CHN:60,USA:55,PSE:80,TUR:55} },

  SAU_NOTE: null,

  IRN2: null, AFG2: null,

  IDN: { name:'Indonesia', flag:'🇮🇩', region:'SE Asia',
    pop:283, gdp:1600, growth:5.1, infl:2.5, debtGdp:40, reserves:155,
    fx:16200, currency:'IDR', exports:270, imports:230, defense:25,
    troops:400, tanks:410, aircraft:100, ships:65, nu:0, agency:'BIN',
    leader:'Prabowo Subianto', gov:'Democracy', st:70,
    rel:{PAK:58,CHN:55,USA:60,IND:65,SAU:70,AUS:60} },

  AUS: { name:'Australia', flag:'🇦🇺', region:'Oceania',
    pop:27, gdp:1900, growth:2.0, infl:3.0, debtGdp:50, reserves:60,
    fx:1.52, currency:'AUD', exports:400, imports:280, defense:35,
    troops:60, tanks:220, aircraft:100, ships:15, nu:0, agency:'ASIS',
    leader:'Anthony Albanese', gov:'Labor', st:75,
    rel:{PAK:45,USA:85,CHN:50,IND:71,JPN:75} },

  CAN: { name:'Canada', flag:'🇨🇦', region:'North America',
    pop:41, gdp:2300, growth:1.5, infl:2.5, debtGdp:105, reserves:0,
    fx:1.4, currency:'CAD', exports:600, imports:600, defense:29,
    troops:68, tanks:80, aircraft:80, ships:12, nu:0, agency:'CSIS',
    leader:'Mark Carney', gov:'Liberal', st:72,
    rel:{PAK:48,USA:60,CHN:25,IND:35,UKR:75} },

  BRA: { name:'Brazil', flag:'🇧🇷', region:'South America',
    pop:213, gdp:2350, growth:2.3, infl:4.5, debtGdp:85, reserves:350,
    fx:5.4, currency:'BRL', exports:340, imports:250, defense:22,
    troops:360, tanks:440, aircraft:70, ships:35, nu:0, agency:'ABIN',
    leader:'Lula da Silva', gov:'Left Coalition', st:65,
    rel:{PAK:48,USA:50,CHN:75,BRICS:1} },

  SAU2:null, IRN3:null,

  MEX: { name:'Mexico', flag:'🇲🇽', region:'North America',
    pop:130, gdp:1850, growth:1.2, infl:4.0, debtGdp:58, reserves:230,
    fx:18.4, currency:'MXN', exports:620, imports:600, defense:9,
    troops:260, tanks:0, aircraft:20, ships:40, nu:0, agency:'CNI',
    leader:'Claudia Sheinbaum', gov:'Morena Left', st:60,
    un:'Cartel violence — de facto internal war',
    rel:{PAK:42,USA:65,CHN:35} },

  NGA: { name:'Nigeria', flag:'🇳🇬', region:'Africa',
    pop:237, gdp:250, growth:3.5, infl:22, debtGdp:45, reserves:40,
    fx:1500, currency:'NGN', exports:60, imports:55, defense:3,
    troops:230, tanks:350, aircraft:70, ships:20, nu:0, agency:'NIA/DSS',
    leader:'Bola Tinubu', gov:'Democracy', st:45,
    un:'Jihadist insurgencies north/east, banditry',
    rel:{PAK:42,USA:55,CHN:60,SAU:55} },

  ZAF: { name:'South Africa', flag:'🇿🇦', region:'Africa',
    pop:63, gdp:420, growth:1.2, infl:4.5, debtGdp:75, reserves:60,
    fx:17.5, currency:'ZAR', exports:110, imports:120, defense:3,
    troops:74, tanks:200, aircraft:30, ships:15, nu:0, agency:'SSA',
    leader:'Cyril Ramaphosa', gov:'ANC Coalition', st:55,
    rel:{PAK:48,CHN:75,USA:45,RUS:55,BRICS:1} },

  ETH: { name:'Ethiopia', flag:'🇪🇹', region:'Africa',
    pop:130, gdp:220, growth:6.5, infl:20, debtGdp:40, reserves:5,
    fx:130, currency:'ETB', exports:10, imports:20, defense:1,
    troops:160, tanks:400, aircraft:30, ships:0, nu:0, agency:'NISS',
    leader:'Abiy Ahmed', gov:'Authoritarian Democracy', st:40,
    un:'Post-Tigray-war fragmentation risk, Egypt Nile dispute',
    rel:{PAK:45,CHN:70,EGY:15,USA:40} },

  KAZ: { name:'Kazakhstan', flag:'🇰🇿', region:'Central Asia',
    pop:20.5, gdp:300, growth:4.5, infl:10, debtGdp:25, reserves:40,
    fx:510, currency:'KZT', exports:80, imports:50, defense:2,
    troops:39, tanks:350, aircraft:40, ships:5, nu:0, agency:'KNB',
    leader:'Kassym-Jomart Tokayev', gov:'Authoritarian Reformist', st:62,
    rel:{PAK:52,CHN:65,RUS:60,USA:45,TUR:60} },

  UZB: { name:'Uzbekistan', flag:'🇺🇿', region:'Central Asia',
    pop:37, gdp:115, growth:5.5, infl:10, debtGdp:38, reserves:35,
    fx:12700, currency:'UZS', exports:25, imports:35, defense:1.5,
    troops:48, tanks:340, aircraft:30, ships:0, nu:0, agency:'SNB',
    leader:'Shavkat Mirziyoyev', gov:'Authoritarian Reformist', st:60,
    rel:{PAK:50,CHN:60,RUS:55,TUR:60,AFG:30} },

  AZE: { name:'Azerbaijan', flag:'🇦🇿', region:'Caucasus',
    pop:10.3, gdp:80, growth:3.5, infl:6, debtGdp:10, reserves:8,
    fx:1.7, currency:'AZN', exports:25, imports:15, defense:4,
    troops:126, tanks:600, aircraft:30, ships:5, nu:0, agency:'DXTX',
    leader:'Ilham Aliyev', gov:'Dynastic Authoritarian', st:68,
    rel:{PAK:66,TUR:85,IRN:25,ARM:1,RUS:40,ISR:60} },

  OMN: { name:'Oman', flag:'🇴🇲', region:'Middle East',
    pop:5.3, gdp:115, growth:3.0, infl:1.5, debtGdp:35, reserves:20,
    fx:0.385, currency:'OMR', exports:45, imports:35, defense:6,
    troops:43, tanks:120, aircraft:40, ships:10, nu:0, agency:'ISS',
    leader:'Sultan Haitham', gov:'Absolute Monarchy', st:80,
    rel:{PAK:60,IRN:55,SAU:65,USA:60,IND:60} },

  KWT: { name:'Kuwait', flag:'🇰🇼', region:'Middle East',
    pop:4.9, gdp:160, growth:3.0, infl:2.5, debtGdp:8, reserves:50,
    fx:0.307, currency:'KWD', exports:70, imports:30, defense:8,
    troops:17, tanks:150, aircraft:35, ships:5, nu:0, agency:'KSS',
    leader:'Emir Mishal Al-Ahmad', gov:'Emirate', st:80,
    rel:{PAK:58,SAU:70,IRN:35,USA:70} },

  IRQ: { name:'Iraq', flag:'🇮🇶', region:'Middle East',
    pop:46, gdp:265, growth:3.0, infl:4, debtGdp:45, reserves:100,
    fx:1310, currency:'IQD', exports:100, imports:60, defense:6,
    troops:200, tanks:300, aircraft:60, ships:5, nu:0, agency:'INIS',
    leader:'Mohammed al-Sudani', gov:'Consensus Democracy (fragile)', st:45,
    rel:{PAK:45,IRN:60,USA:45,SAU:50} },

  JOR: { name:'Jordan', flag:'🇯🇴', region:'Middle East',
    pop:11.5, gdp:55, growth:2.5, infl:2, debtGdp:90, reserves:20,
    fx:0.709, currency:'JOD', exports:12, imports:28, defense:2,
    troops:100, tanks:1400, aircraft:60, ships:0, nu:0, agency:'GID',
    leader:'King Abdullah II', gov:'Constitutional Monarchy', st:65,
    rel:{PAK:52,USA:75,ISR:40,SAU:55,PSE:70} },

  LKA: { name:'Sri Lanka', flag:'🇱🇰', region:'South Asia',
    pop:22, gdp:85, growth:3.0, infl:5, debtGdp:100, reserves:6,
    fx:300, currency:'LKR', exports:12, imports:19, defense:1.6,
    troops:255, tanks:120, aircraft:30, ships:10, nu:0, agency:'SIS',
    leader:'Anura Dissanayake', gov:'Left Populist', st:58,
    rel:{PAK:55,IND:60,CHN:65,USA:50} },

  NEP: { name:'Nepal', flag:'🇳🇵', region:'South Asia',
    pop:29.5, gdp:45, growth:4.0, infl:5, debtGdp:45, reserves:12,
    fx:140, currency:'NPR', exports:2, imports:12, defense:0.4,
    troops:96, tanks:0, aircraft:2, ships:0, nu:0, agency:'ssb',
    leader:'Interim → elected govt (Mar 2026)', gov:'Democracy (fragile)', st:45,
    un:'Post-Sep-2025 Gen-Z upheaval',
    rel:{PAK:55,IND:65,CHN:60,USA:55} },

  MMR: { name:'Myanmar', flag:'🇲🇲', region:'SE Asia',
    pop:55, gdp:65, growth:1.0, infl:20, debtGdp:60, reserves:5,
    fx:2100, currency:'MMK', exports:15, imports:15, defense:2.5,
    troops:400, tanks:500, aircraft:90, ships:10, nu:0, agency:'military intel',
    leader:'Min Aung Hlaing (junta)', gov:'Military Junta', st:25,
    un:'Civil war — junta losing ground to resistance',
    rel:{PAK:45,CHN:60,IND:50,USA:10} },

  VEN: { name:'Venezuela', flag:'🇻🇪', region:'South America',
    pop:28, gdp:110, growth:3.0, infl:100, debtGdp:150, reserves:1,
    fx:120, currency:'VES', exports:15, imports:10, defense:1,
    troops:123, tanks:300, aircraft:60, ships:10, nu:0, agency:'SEBIN',
    leader:'Nicolás Maduro', gov:'Authoritarian', st:40,
    un:'US pressure/possible intervention 2026',
    rel:{PAK:38,CUB:70,RUS:60,CHN:60,USA:5} },

  TWN: { name:'Taiwan', flag:'🇹🇼', region:'East Asia',
    pop:23.4, gdp:820, growth:3.0, infl:2, debtGdp:30, reserves:580,
    fx:31, currency:'TWD', exports:470, imports:380, defense:20,
    troops:169, tanks:600, aircraft:280, ships:26, nu:0, agency:'NSB',
    leader:'Lai Ching-te', gov:'Democracy (claimed by PRC)', st:75,
    un:'Daily PLA pressure; invasion risk window 2027-2030',
    ai:{doctrine:'porcupine', aggr:0.1},
    rel:{PAK:35,USA:75,JPN:70,CHN:2} },

  SYR: { name:'Syria', flag:'🇸🇾', region:'Middle East',
    pop:24, gdp:35, growth:10, infl:15, debtGdp:30, reserves:1,
    fx:13000, currency:'SYP', exports:3, imports:8, defense:1.5,
    troops:110, tanks:1500, aircraft:40, ships:0, nu:0, agency:'GIS (new)',
    leader:'Ahmed al-Sharaa', gov:'Post-Assad Transition', st:30,
    un:'Rebuilding after civil war, sanctions eased 2025',
    rel:{PAK:20,TUR:70,USA:40,RUS:25,IRN:10,ISR:5,SAU:60} },

  YEM: { name:'Yemen', flag:'🇾🇪', region:'Middle East',
    pop:35, gdp:20, growth:2.0, infl:20, debtGdp:80, reserves:1,
    fx:530, currency:'YER', exports:1, imports:6, defense:0.5,
    troops:80, tanks:600, aircraft:5, ships:5, nu:0, agency:'Houthi security',
    leader:'Houthi SPLC / IRG split', gov:'Divided (Houthi north)', st:20,
    ai:{doctrine:'asymmetric', aggr:0.7},
    rel:{PAK:35,IRN:80,SAU:25,USA:2,ISR:1} },

  SDN: { name:'Sudan', flag:'🇸🇩', region:'Africa',
    pop:50, gdp:30, growth:1.0, infl:60, debtGdp:180, reserves:0.5,
    fx:2000, currency:'SDG', exports:2, imports:6, defense:1,
    troops:120, tanks:600, aircraft:40, ships:0, nu:0, agency:'military intel',
    leader:'Burhan (SAF) vs Hemedti (RSF)', gov:'Collapsed — civil war', st:10,
    un:'World\'s largest hunger crisis, RSF/SAF war ongoing',
    rel:{PAK:45,EGY:55,ARE:35,SAU:45,IRN:40} },

  SOM: { name:'Somalia', flag:'🇸🇴', region:'Africa',
    pop:19, gdp:13, growth:4.0, infl:5, debtGdp:35, reserves:0.5,
    fx:570, currency:'SOS', exports:1, imports:3, defense:0.2,
    troops:20, tanks:0, aircraft:2, ships:2, nu:0, agency:'NISA',
    leader:'Hassan Sheikh Mohamud', gov:'Fragile Federal', st:20,
    un:'Al-Shabaab insurgency; Ethiopia Somaliland deal dispute',
    rel:{PAK:45,TUR:60,ETH:30,EGY:55} },

  PSE: { name:'Palestine', flag:'🇵🇸', region:'Middle East',
    pop:5.5, gdp:15, growth:2.0, infl:20, debtGdp:0, reserves:0,
    fx:3.6, currency:'ILS', exports:1, imports:6, defense:0,
    troops:30, tanks:0, aircraft:0, ships:0, nu:0, agency:'none (security forces)',
    leader:'Abbas (PA) / Gaza technocrats', gov:'Ceasefire administration', st:20,
    un:'Post-war Gaza reconstruction, 2-state talks revived',
    rel:{PAK:75,IRN:30,EGY:60,JOR:70,SAU:45,USA:40,ISR:1} }
};

/* ---- Minor countries: [iso3, name, flag, pop, gdp, troops, rel-to-PAK] ---- */
const MINORS = [
 ['SGP','Singapore','🇸🇬',5.9,530,51,52],['MYS','Malaysia','🇲🇾',35,490,113,60],
 ['THA','Thailand','🇹🇭',71.5,550,360,50],['PHL','Philippines','🇵🇭',115,500,145,48],
 ['VNM','Vietnam','🇻🇳',101,520,470,52],['KHM','Cambodia','🇰🇭',17,48,124,48],
 ['LAO','Laos','🇱🇦',7.6,16,29,45],['BRN','Brunei','🇧🇳',0.46,15,7,48],
 ['PNG','Papua New Guinea','🇵🇬',10.5,33,4,45],['FJI','Fiji','🇫🇯',0.9,5.5,4,45],
 ['MNG','Mongolia','🇲🇳',3.5,21,9,48],['TJK','Tajikistan','🇹🇯',10.5,14,9,48],
 ['TKM','Turkmenistan','🇹🇲',7.5,85,37,45],['KGZ','Kyrgyzstan','🇰🇬',7.2,15,11,48],
 ['GEO','Georgia','🇬🇪',3.7,34,37,48],['ARM','Armenia','🇦🇲',3.0,26,45,30],
 ['BLR','Belarus','🇧🇾',9.1,75,48,35],['MDA','Moldova','🇲🇩',2.4,17,6,45],
 ['ALB','Albania','🇦🇱',2.7,27,7,48],['MKD','North Macedonia','🇲🇰',1.8,16,6,46],
 ['BIH','Bosnia','🇧🇦',3.2,28,9,47],['SRB','Serbia','🇷🇸',6.6,88,28,50],
 ['HRV','Croatia','🇭🇷',3.8,90,14,47],['SVN','Slovenia','🇸🇮',2.1,72,7,47],
 ['SVK','Slovakia','🇸🇰',5.4,135,18,46],['CZE','Czechia','🇨🇿',10.9,345,28,45],
 ['HUN','Hungary','🇭🇺',9.6,225,42,48],['ROU','Romania','🇷🇴',19,380,82,45],
 ['BGR','Bulgaria','🇧🇬',6.4,110,37,45],['GRC','Greece','🇬🇷',10.3,250,143,45],
 ['AUT','Austria','🇦🇹',9.1,525,23,48],['CHE','Switzerland','🇨🇭',8.9,940,21,50],
 ['NLD','Netherlands','🇳🇱',17.9,1230,41,48],['BEL','Belgium','🇧🇪',11.8,680,25,48],
 ['PRT','Portugal','🇵🇹',10.5,300,27,48],['IRL','Ireland','🇮🇪',5.3,570,8,48],
 ['DNK','Denmark','🇩🇰',5.9,420,20,48],['NOR','Norway','🇳🇴',5.5,490,26,48],
 ['SWE','Sweden','🇸🇪',10.6,620,24,48],['FIN','Finland','🇫🇮',5.6,310,24,45],
 ['POL','Poland','🇵🇱',37.5,920,202,45],['ITA','Italy','🇮🇹',58.9,2450,165,52],
 ['ESP','Spain','🇪🇸',48.4,1800,122,50],['ISL','Iceland','🇮🇸',0.39,33,0,48],
 ['LUX','Luxembourg','🇱🇺',0.66,89,1,48],['EST','Estonia','🇪🇪',1.3,43,7,45],
 ['LVA','Latvia','🇱🇻',1.9,48,8,45],['LTU','Lithuania','🇱🇹',2.8,81,23,45],
 ['DZA','Algeria','🇩🇿',46,270,325,50],['MAR','Morocco','🇲🇦',38,160,196,52],
 ['TUN','Tunisia','🇹🇳',12,54,36,48],['LBY','Libya','🇱🇾',7.3,45,30,30],
 ['KEN','Kenya','🇰🇪',56,125,24,45],['TZA','Tanzania','🇹🇿',68,85,27,45],
 ['UGA','Uganda','🇺🇬',49,55,45,44],['GHA','Ghana','🇬🇭',34,80,15,45],
 ['SEN','Senegal','🇸🇳',18,30,19,46],['MLI','Mali','🇲🇱',23,21,30,40],
 ['NER','Niger','🇳🇪',27,18,30,40],['TCD','Chad','🇹🇩',19,13,35,42],
 ['CMR','Cameroon','🇨🇲',29,50,25,44],['COD','DR Congo','🇨🇩',105,75,165,44],
 ['AGO','Angola','🇦🇴',37,95,107,44],['ZMB','Zambia','🇿🇲',21,29,16,44],
 ['ZWE','Zimbabwe','🇿🇼',16.5,26,29,46],['MOZ','Mozambique','🇲🇿',34,23,11,44],
 ['RWA','Rwanda','🇷🇼',14,14,33,44],['ERI','Eritrea','🇪🇷',3.7,2.6,200,42],
 ['DJI','Djibouti','🇩🇯',1.1,4,10,48],['GIN','Guinea','🇬🇳',14,23,12,43],
 ['CIV',"Côte d'Ivoire",'🇨🇮',31,85,25,44],['BFA','Burkina Faso','🇧🇫',23,21,22,40],
 ['MWI','Malawi','🇲🇼',21,13,7,44],['MDG','Madagascar','🇲🇬',31,17,14,44],
 ['NAM','Namibia','🇳🇦',3.0,13,10,44],['BWA','Botswana','🇧🇼',2.5,21,9,44],
 ['ARG','Argentina','🇦🇷',46,690,76,45],['CHL','Chile','🇨🇱',19.5,340,77,45],
 ['COL','Colombia','🇨🇴',52,420,293,44],['PER','Peru','🇵🇪',34,300,95,44],
 ['ECU','Ecuador','🇪🇨',18,120,40,44],['BOL','Bolivia','🇧🇴',12.4,46,34,44],
 ['PRY','Paraguay','🇵🇾',6.9,45,14,44],['URY','Uruguay','🇺🇾',3.4,82,22,45],
 ['GTM','Guatemala','🇬🇹',18,110,18,44],['CUB','Cuba','🇨🇺',11,65,50,40],
 ['HTI','Haiti','🇭🇹',11.7,20,2,44],['NIC','Nicaragua','🇳🇮',7,18,12,44],
 ['SLV','El Salvador','🇸🇻',6.4,38,25,46],['HND','Honduras','🇭🇳',10.6,36,15,44],
 ['CRI','Costa Rica','🇨🇷',5.2,95,0,45],['PAN','Panama','🇵🇦',4.5,88,0,46],
 ['DOM','Dominican Rep.','🇩🇴',11.4,130,56,45],['JAM','Jamaica','🇯🇲',2.8,20,4,45],
 ['TTO','Trinidad & Tobago','🇹🇹',1.5,28,4,45],['GUY','Guyana','🇬🇾',0.82,26,4,45],
 ['SUR','Suriname','🇸🇷',0.63,4.5,2,44],['BLZ','Belize','🇧🇿',0.41,3.5,2,44],
 ['LSO','Lesotho','🇱🇸',2.3,2.5,2,44],['SWZ','Eswatini','🇸🇿',1.2,5,3,44],
 ['MWI2',null,null,0,0,0,0],['COM','Comoros','🇰🇲',0.85,1.4,1,44],
 ['MRT','Mauritania','🇲🇷',5.0,11,16,44],['GAB','Gabon','🇬🇦',2.5,21,5,44],
 ['COG','Congo-Brazzaville','🇨🇬',6.1,15,10,44],['CAF','Central African Rep.','🇨🇫',5.7,2.8,8,42],
 ['SSD','South Sudan','🇸🇸',11.6,6,185,44],['BEN','Benin','🇧🇯',14,22,12,44],
 ['TGO','Togo','🇹🇬',9.3,10,9,44],['SLE','Sierra Leone','🇸🇱',8.8,4.5,9,44],
 ['LBR','Liberia','🇱🇷',5.5,5,2,44],['MUS','Mauritius','🇲🇺',1.3,15,0,46],
 ['MLD','Maldives','🇲🇻',0.52,7,4,52],['BTN','Bhutan','🇧🇹',0.79,3,8,50],
 ['SLB','Solomon Islands','🇸🇧',0.82,1.7,0,44],['VUT','Vanuatu','🇻🇺',0.33,1.1,0,44],
 ['WSM','Samoa','🇼🇸',0.22,0.9,0,44],['TON','Tonga','🇹🇴',0.10,0.5,0,44],
 ['KIR','Kiribati','🇰🇮',0.13,0.25,0,44],['TLS','Timor-Leste','🇹🇱',1.4,2.2,3,46],
 ['NOR2',null,null,0,0,0,0],['CYP','Cyprus','🇨🇾',1.3,34,12,46],
 ['LBN','Lebanon','🇱🇧',5.4,25,80,46],['BHR','Bahrain','🇧🇭',1.6,47,8,58],
 ['GRL','Greenland','🇬🇱',0.056,3.2,0,46],['FRO','Faroe Is.','🇫🇴',0.054,3.5,0,46],
 ['FLK','Falkland Is.','🇫🇰',0.0035,0.2,2,46],['ESH','Western Sahara','🇪🇭',0.6,1,0,30],
 ['NewCaledonia','New Caledonia','🇳🇨',0.27,9.6,2,44],['PRK2',null,null,0,0,0,0]
];

/* Expand minors into full country objects (low detail) */
(function(){
  const seen = new Set(Object.keys(COUNTRIES));
  const hash = str => { let h=0; for (let i=0;i<str.length;i++) h = (h*31 + str.charCodeAt(i))>>>0; return h; };
  const clampL = (v,a,b) => Math.max(a, Math.min(b, v));
  for (const m of MINORS) {
    const [iso,name,flag,pop,gdp,troops,rel] = m;
    if (!name || seen.has(iso)) continue;
    const h = hash(iso);
    const gdpPc = gdp*1000/pop; // $k per capita
    COUNTRIES[iso] = { name, flag, region:'World', minor:true,
      pop, gdp, growth: 2.5, infl: 4, debtGdp: 50, extDebt: gdp*0.35, reserves: gdp*0.1,
      fx: 100, currency: iso, remit: gdp*0.08, exports: gdp*0.3, imports: gdp*0.32,
      taxGdp: 14, deficit: 3, defense: gdp*0.015, troops, tanks: troops*0.6, aircraft: troops*0.12,
      ships: 5, artillery: troops*1.2, nu:0, agency:'National agency', leader:'Government of '+name, gov:'Sovereign state', st:55,
      gold: h%45, tax: clampL(10 + gdpPc/4, 10, 38), def: 3+(h%4),
      partners:'Regional trade 60%, Global 40%', expGoods:'Local produce & resources', impGoods:'Machinery & fuel',
      rel:{ PAK: rel } };
  }
  // cleanup null placeholder keys
  for (const k of Object.keys(COUNTRIES)) if (COUNTRIES[k]===null) delete COUNTRIES[k];
})();

/* ---- Pakistan deep state (provinces, factions, advisors, forces) ---- */
const PAK_STATE = {
  provinces: [
    {id:'punjab', name:'Punjab', pop:128, gdpShare:0.54, mood:55, note:'Economic heartland; Lahore political battleground'},
    {id:'sindh', name:'Sindh', pop:56, gdpShare:0.26, mood:48, note:'Karachi — financial hub, ethnic politics, MQM factor'},
    {id:'kp', name:'Khyber Pakhtunkhwa', pop:41, gdpShare:0.09, mood:42, note:'TTP insurgency; PTI heartland; Pashtun grievance politics'},
    {id:'balochistan', name:'Balochistan', pop:15, gdpShare:0.04, mood:30, note:'BLA insurgency; Reko Diq & Saindak minerals; CPEC corridors'},
    {id:'gb', name:'Gilgit-Baltistan', pop:1.6, gdpShare:0.01, mood:55, note:'CPEC gateway; constitutional status dispute'},
    {id:'ajk', name:'Azad Jammu & Kashmir', pop:4.5, gdpShare:0.01, mood:52, note:'Line of Control frontline'}
  ],
  factions: {
    TTP:  {name:'Tehrik-i-Taliban Pakistan', power:34, note:'Kharjari insurgency from Afghan soil, attacks in KP'},
    BLA:  {name:'Baloch Liberation Army', power:30, note:'Bombings, hijackings, Jaffar Express-style attacks'},
    PTI:  {name:'PTI street movement', power:58, note:'Imran Khan behind bars; mass-mobilization capacity'},
    SECT: {name:'Sectarian networks', power:26, note:'Kurram, Jhang, anti-Shia/Ahmadi/ Hazara violence'}
  },
  advisors: [
    {id:'coas', name:'Field Marshal Asim Munir', role:'Chief of Army Staff', bias:'military', note:'Most powerful man in the country. Watches Kashmir, hates TTP, guards the establishment\'s turf.'},
    {id:'isi', name:'Lt Gen Asim Malik', role:'DG ISI', bias:'intel', note:'Runs the invisible war. Wants expansion of foreign networks.'},
    {id:'fin', name:'Muhammad Aurangzeb', role:'Finance Minister', bias:'markets', note:'Ex-banker. Fixated on IMF program, tax base, reserves.'},
    {id:'dpm', name:'Ishaq Dar', role:'DPM / Foreign Minister', bias:'diplomacy', note:'Old Sharif loyalist. Backchannels are his art.'},
    {id:'sbp', name:'Jameel Ahmad', role:'SBP Governor', bias:'monetary', note:'Guards the rupee with his life. Reserves below $10B = alarm bells.'}
  ],
  forces: {
    army:  {label:'Army', strength:78, note:'9 corps, 2 armored + strike corps, Rocket force command (new 2025)'},
    air:   {label:'Air Force', strength:82, note:'JF-17 Block III, J-10CE, F-16 MLU — battle-tested May 2025'},
    navy:  {label:'Navy', strength:45, note:'Frigates, Hangor subs coming 2027-28; weakest service'},
    strat: {label:'Strategic Force (Nuclear)', strength:88, note:'~170 warheads, Shaheen-III, Ababeel MIRV, Nasr TNW'},
    param: {label:'Paramilitary/Rangers/FC', strength:60, note:'Frontier Corps Balochistan/KP, Rangers Sindh/Punjab'}
  },
  econNotes: 'IT exports ~$3.8B/yr growing 20%; textiles 55% of exports; remittances $34B; informal economy 35% of GDP',
  programs: {
    imf: {active:true, tranchesLeft:4, reviewDue:'Mar 2027', eff: 'Rescue program ($7B EFF). Reviews every 6 months. Conditions: taxes, no subsidies.',},
    cpec: {phase:2, note:'Phase 2.0: agriculture, IT, industrial relocation. ML-1 railway $6.7B being finalized'},
    saud_pact: {signed:true, note:'Strategic Mutual Defense Agreement (Sep 2025): aggression against either = aggression against both'}
  }
};

/* ---- Country extras: gold reserves (tonnes, est. WGC 2025), tax %GDP,
   deficit %GDP, trade partners & goods, military notes ---- */
const EXTRA = {
 PAK:{gold:65,tax:10.5,def:6,partners:'US 16%,China 12%,UK 8%,UAE 8%',expGoods:'Textiles 55%, rice, IT services, surgical goods',impGoods:'Petroleum, machinery, chemicals, edible oil',milNote:'Battle-hardened; PAF elite; largest Muslim nuclear arsenal'},
 IND:{gold:880,tax:12,def:5,partners:'US 18%,UAE 7%,EU 15%',expGoods:'Petroleum products, pharma, IT services, gems',impGoods:'Crude oil, gold, electronics',milNote:'2nd largest army; 2 carriers; Agni-V MIRV missiles'},
 CHN:{gold:2280,tax:20,def:5,partners:'US 15%,EU 15%,ASEAN 16%',expGoods:'Electronics, machinery, EVs, steel',impGoods:'Oil, iron ore, semiconductors, food',milNote:'Largest navy by hulls; rocket force; massive shipbuilding'},
 USA:{gold:8133,tax:17,def:7,partners:'Canada 17%,Mexico 16%,China 13%',expGoods:'Tech, services, weapons, agriculture',impGoods:'Electronics, vehicles, oil',milNote:'11 carrier groups, stealth fleet, 750+ overseas bases'},
 RUS:{gold:2330,tax:25,def:2,partners:'China 30%,India 10%,Türkiye 8%',expGoods:'Oil, gas, arms, wheat, fertilizer',impGoods:'Machinery, vehicles, electronics',milNote:'Largest nuclear arsenal; sub fleet; war-hardened in Ukraine'},
 SAU:{gold:323,tax:28,def:2,partners:'China 18%,Japan 12%,India 10%',expGoods:'Crude oil 70%, petrochemicals, dates',impGoods:'Machinery, food, vehicles',milNote:'Vision-2030 modernization; Pakistani-trained forces'},
 ARE:{gold:6,tax:20,def:2,partners:'India 12%,China 10%,Japan 6%',expGoods:'Oil, re-exports, gold, aluminum',impGoods:'Machinery, gold, food',milNote:'Small elite force; big defense deals with US/France'},
 TUR:{gold:615,tax:22,def:5,partners:'Germany 8%,US 6%,UK 6%',expGoods:'Autos, textiles, drones, steel, appliances',impGoods:'Oil, gas, machinery, electronics',milNote:'NATO 2nd largest army; Bayraktar drone pioneer'},
 QAT:{gold:5,tax:25,def:2,partners:'Japan 12%,China 10%,India 9%',expGoods:'LNG 60%, oil, petrochemicals',impGoods:'Machinery, food, vehicles',milNote:'Tiny force; hosts CENTCOM; Al-Udeid air base'},
 IRN:{gold:90,tax:10,def:4,partners:'China 80%,Türkiye 5%',expGoods:'Oil to China, petrochemicals, pistachios',impGoods:'Machinery, rice, electronics',milNote:'Big missile/drone arsenal; proxy networks; weakened air force'},
 ISR:{gold:0,tax:32,def:5,partners:'US 28%,EU 20%,China 6%',expGoods:'Tech, weapons, diamonds, pharma',impGoods:'Oil, diamonds, machinery',milNote:'Most advanced air force in region; undeclared nuclear power; Iron Dome'},
 AFG:{gold:2,tax:6,def:8,partners:'Pakistan 40%,Iran 15%,China 10%',expGoods:'Coal, dry fruits, carpets, gems',impGoods:'Fuel, wheat, machinery, medicine',milNote:'GDI intelligence; captured US equipment; insurgency-hardened'},
 EGY:{gold:126,tax:14,def:8,partners:'EU 25%,Saudi 9%,US 7%',expGoods:'Gas, Suez Canal services, textiles, citrus',impGoods:'Wheat, machinery, oil',milNote:'Largest Arab army; Russian-French mixed hardware'},
 GBR:{gold:310,tax:35,def:5,partners:'US 20%,EU 42%',expGoods:'Services, pharma, autos, whisky',impGoods:'Machinery, food, electronics',milNote:'2 carriers, nuclear subs, Five Eyes intel hub'},
 FRA:{gold:2437,tax:45,def:6,partners:'EU 55%,US 8%',expGoods:'Luxury goods, aerospace, wine, machinery',impGoods:'Machinery, oil, electronics',milNote:'Only EU nuclear+carrier power; arms exporter'},
 DEU:{gold:3350,tax:39,def:3,partners:'US 10%,France 8%,China 6%',expGoods:'Autos, machinery, chemicals',impGoods:'Gas, electronics, raw materials',milNote:'Rearming under Zeitenwende; Leopard tanks, Eurofighters'},
 JPN:{gold:846,tax:34,def:4,partners:'US 20%,China 18%',expGoods:'Autos, machinery, electronics',impGoods:'Oil, gas, food, semiconductors',milNote:'Pacifist constitution; upgrading to counterstrike doctrine'},
 KOR:{gold:104,tax:29,def:3,partners:'China 20%,US 18%',expGoods:'Semiconductors, autos, ships, K-pop exports',impGoods:'Oil, gas, machinery',milNote:'US joint command; K9 howitzers, Aegis destroyers'},
 PRK:{gold:10,tax:40,def:5,partners:'China 90%',expGoods:'Minerals, textiles, arms to Russia',impGoods:'Oil, food, fertilizer',milNote:'Huge artillery, ICBMs, 50 warheads, 1.2M troops'},
 UKR:{gold:25,tax:25,def:20,partners:'EU 55%,US 12%',expGoods:'Grain, iron, drones (battle-proven)',impGoods:'Fuel, machinery, weapons',milNote:'Largest drone warfare innovator; NATO-standard now'},
 BGD:{gold:14,tax:9,def:5,partners:'US 15%,Germany 12%,India 8%',expGoods:'Garments 84%, jute, shrimp',impGoods:'Cotton, machinery, oil',milNote:'UN peacekeeping powerhouse (top troop contributor)'},
 IDN:{gold:87,tax:13,def:3,partners:'China 22%,US 10%',expGoods:'Coal, palm oil, nickel',impGoods:'Machinery, oil, wheat',milNote:'Largest SE Asian military; green-water navy focus'},
 AUS:{gold:80,tax:30,def:2,partners:'China 35%,Japan 15%',expGoods:'Iron ore, coal, gas, agriculture',impGoods:'Machinery, vehicles, electronics',milNote:'AUKUS subs incoming; joint exercises with US'},
 CAN:{gold:0,tax:33,def:2,partners:'US 75%,EU 8%',expGoods:'Oil, autos, timber, wheat',impGoods:'Machinery, electronics',milNote:'NORAD member; Arctic focus; small but modern'},
 BRA:{gold:130,tax:33,def:6,partners:'China 30%,US 11%',expGoods:'Soy, iron ore, beef, coffee, planes (Embraer)',impGoods:'Fertilizer, machinery, oil',milNote:'Largest Latin American military; peacekeeping tradition'},
 MEX:{gold:120,tax:17,def:5,partners:'US 80%',expGoods:'Autos, electronics, oil, avocados',impGoods:'Machinery, chemicals, grain',milNote:'Focused on cartels, not foreign war'},
 NGA:{gold:21,tax:8,def:5,partners:'India 15%,EU 20%,US 8%',expGoods:'Oil 80%, cocoa, gas',impGoods:'Machinery, food, chemicals',milNote:'Fighting jihadist insurgency; regional ECOWAS leader'},
 ZAF:{gold:125,tax:26,def:5,partners:'China 20%,EU 25%',expGoods:'Gold, platinum, coal, autos',impGoods:'Oil, machinery, electronics',milNote:'BRICS member; most industrial African military'},
 ETH:{gold:8,tax:10,def:4,partners:'China 25%,EU 20%',expGoods:'Coffee, gold, flowers',impGoods:'Machinery, fuel, food',milNote:'Battle-tested in Tigray war; Red Sea access ambitions'},
 KAZ:{gold:290,tax:20,def:2,partners:'China 15%,Russia 25%,EU 30%',expGoods:'Uranium 40% of world, oil, wheat',impGoods:'Machinery, consumer goods',milNote:'CSTO member; balances Russia and China'},
 UZB:{gold:10,tax:20,def:4,partners:'China 25%,Russia 18%',expGoods:'Gold, cotton, gas, uranium',impGoods:'Machinery, food',milNote:'Strongest Central Asian military'},
 AZE:{gold:15,tax:22,def:1,partners:'Italy 20%,Israel 15%',expGoods:'Oil, gas, tomatoes, cotton',impGoods:'Machinery, weapons from Israel/Türkiye',milNote:'Drone-warfare winner of 2020 Nagorno-Karabakh war'},
 OMN:{gold:0,tax:15,def:2,partners:'China 30%,India 15%',expGoods:'Oil, fish, re-exports',impGoods:'Machinery, food',milNote:'Quiet mediator; hosts US base, good Iran ties'},
 KWT:{gold:79,tax:20,def:5,partners:'China 15%,India 12%',expGoods:'Oil, gas',impGoods:'Machinery, food, cars',milNote:'US-majority defense agreements'},
 IRQ:{gold:96,tax:15,def:5,partners:'China 25%,India 20%',expGoods:'Oil 95%',impGoods:'Machinery, food, medicine',milNote:'Rebuilding; Iranian-backed militias active'},
 JOR:{gold:12,tax:20,def:5,partners:'US 25%,Saudi 10%',expGoods:'Phosphates, textiles, fertilizer',impGoods:'Oil, machinery, food',milNote:'Superb intelligence (GID); borders all flashpoints'},
 LKA:{gold:12,tax:11,def:4,partners:'US 25%,India 15%',expGoods:'Tea, garments, spices',impGoods:'Oil, machinery, medicine',milNote:'IMF restructure after 2022 default'},
 NEP:{gold:2,tax:11,def:5,partners:'India 65%,China 15%',expGoods:'Hydropower, carpets, tourism',impGoods:'Fuel, machinery from India',milNote:'Gurkha soldiers famous worldwide'},
 MMR:{gold:8,tax:8,def:6,partners:'China 40%,Thailand 15%',expGoods:'Gas, jade, rice',impGoods:'Oil, machinery',milNote:'Junta losing civil war; airstrike-dependent'},
 VEN:{gold:155,tax:12,def:8,partners:'China 40%,Turkey 10%',expGoods:'Oil (sanctioned), gold',impGoods:'Food, medicine',milNote:'Oil riches in decay; Russian equipment'},
 TWN:{gold:424,tax:20,def:2,partners:'China 30%,US 15%',expGoods:'Semiconductors 40% (TSMC), electronics',impGoods:'Oil, machinery, food',milNote:'Porcupine strategy vs China; chip shield'},
 SYR:{gold:25,tax:8,def:6,partners:'Turkey 25%,UAE 15%',expGoods:'Olives, cotton, phosphates',impGoods:'Fuel, wheat, machinery',milNote:'Post-Assad army rebuilding from rubble'},
 YEM:{gold:15,tax:5,def:10,partners:'China 20%,Saudi 15%',expGoods:'Oil, fish, qat',impGoods:'Food, fuel',milNote:'Houthi missile/drone threat to Red Sea shipping'},
 SDN:{gold:5,tax:6,def:8,partners:'UAE 30%,Egypt 15%',expGoods:'Gold, gum arabic',impGoods:'Food, fuel',milNote:'Army vs RSF civil war; gold smuggling economy'},
 SOM:{gold:0,tax:4,def:6,partners:'UAE 25%,Turkey 20%',expGoods:'Livestock, bananas',impGoods:'Food, khat, fuel',milNote:'ATMIS era ending; Al-Shabaab insurgency'},
 PSE:{gold:0,tax:8,def:10,partners:'Israel (transit),Jordan',expGoods:'Stone, textiles, agriculture',impGoods:'Food, fuel, cement',milNote:'Ceasefire administration; security forces rebuilding'}
};

/* Merge extras into deep countries */
for (const k in EXTRA) if (COUNTRIES[k]) Object.assign(COUNTRIES[k], EXTRA[k]);

/* Merge Pakistan deep state into its country object */
Object.assign(COUNTRIES.PAK, PAK_STATE);

/* Relations color helper for map — refined emerald→red scale */
const relColor = r => {
  if (r === undefined) return '#242b37';
  if (r >= 80) return '#059669';
  if (r >= 60) return '#10b981';
  if (r >= 40) return '#65a30d';
  if (r >= 20) return '#ca8a04';
  if (r >= 0)  return '#7c7f87';
  if (r >= -30) return '#ea580c';
  return '#dc2626';
};
