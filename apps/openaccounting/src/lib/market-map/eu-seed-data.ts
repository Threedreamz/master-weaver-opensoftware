export interface EUCountrySeed {
  code: string;
  name: string;
  nativeName: string;
  region: "Western" | "Eastern" | "Nordic" | "Southern";
  population: number;
  gdpEur: number;
  smeCount: number;
  smeEmployees: number;
  vatPrefix: string;
  marketScore: number;
}

export const EU_COUNTRIES: EUCountrySeed[] = [
  { code: "DE", name: "Germany", nativeName: "Deutschland", region: "Western", population: 84400000, gdpEur: 4121, smeCount: 3148000, smeEmployees: 20800000, vatPrefix: "DE", marketScore: 85 },
  { code: "FR", name: "France", nativeName: "France", region: "Western", population: 68200000, gdpEur: 2803, smeCount: 3067000, smeEmployees: 13200000, vatPrefix: "FR", marketScore: 80 },
  { code: "IT", name: "Italy", nativeName: "Italia", region: "Southern", population: 58850000, gdpEur: 2086, smeCount: 3718000, smeEmployees: 11600000, vatPrefix: "IT", marketScore: 72 },
  { code: "ES", name: "Spain", nativeName: "España", region: "Southern", population: 48060000, gdpEur: 1462, smeCount: 2863000, smeEmployees: 9400000, vatPrefix: "ES", marketScore: 70 },
  { code: "NL", name: "Netherlands", nativeName: "Nederland", region: "Western", population: 17800000, gdpEur: 1009, smeCount: 1185000, smeEmployees: 4800000, vatPrefix: "NL", marketScore: 82 },
  { code: "PL", name: "Poland", nativeName: "Polska", region: "Eastern", population: 37700000, gdpEur: 748, smeCount: 2083000, smeEmployees: 6700000, vatPrefix: "PL", marketScore: 68 },
  { code: "BE", name: "Belgium", nativeName: "België", region: "Western", population: 11700000, gdpEur: 578, smeCount: 591000, smeEmployees: 2300000, vatPrefix: "BE", marketScore: 76 },
  { code: "SE", name: "Sweden", nativeName: "Sverige", region: "Nordic", population: 10500000, gdpEur: 585, smeCount: 741000, smeEmployees: 2600000, vatPrefix: "SE", marketScore: 78 },
  { code: "AT", name: "Austria", nativeName: "Österreich", region: "Western", population: 9100000, gdpEur: 471, smeCount: 354000, smeEmployees: 1900000, vatPrefix: "ATU", marketScore: 77 },
  { code: "IE", name: "Ireland", nativeName: "Éire", region: "Western", population: 5200000, gdpEur: 502, smeCount: 284000, smeEmployees: 1100000, vatPrefix: "IE", marketScore: 75 },
  { code: "DK", name: "Denmark", nativeName: "Danmark", region: "Nordic", population: 5900000, gdpEur: 395, smeCount: 296000, smeEmployees: 1200000, vatPrefix: "DK", marketScore: 79 },
  { code: "FI", name: "Finland", nativeName: "Suomi", region: "Nordic", population: 5600000, gdpEur: 280, smeCount: 283000, smeEmployees: 930000, vatPrefix: "FI", marketScore: 74 },
  { code: "PT", name: "Portugal", nativeName: "Portugal", region: "Southern", population: 10300000, gdpEur: 268, smeCount: 845000, smeEmployees: 2700000, vatPrefix: "PT", marketScore: 65 },
  { code: "CZ", name: "Czechia", nativeName: "Česko", region: "Eastern", population: 10900000, gdpEur: 291, smeCount: 1084000, smeEmployees: 3300000, vatPrefix: "CZ", marketScore: 66 },
  { code: "RO", name: "Romania", nativeName: "România", region: "Eastern", population: 19000000, gdpEur: 315, smeCount: 536000, smeEmployees: 2600000, vatPrefix: "RO", marketScore: 55 },
  { code: "GR", name: "Greece", nativeName: "Ελλάδα", region: "Southern", population: 10400000, gdpEur: 220, smeCount: 714000, smeEmployees: 1700000, vatPrefix: "EL", marketScore: 52 },
  { code: "HU", name: "Hungary", nativeName: "Magyarország", region: "Eastern", population: 9600000, gdpEur: 184, smeCount: 577000, smeEmployees: 2000000, vatPrefix: "HU", marketScore: 58 },
  { code: "SK", name: "Slovakia", nativeName: "Slovensko", region: "Eastern", population: 5400000, gdpEur: 115, smeCount: 416000, smeEmployees: 1100000, vatPrefix: "SK", marketScore: 55 },
  { code: "BG", name: "Bulgaria", nativeName: "България", region: "Eastern", population: 6500000, gdpEur: 100, smeCount: 347000, smeEmployees: 1200000, vatPrefix: "BG", marketScore: 48 },
  { code: "HR", name: "Croatia", nativeName: "Hrvatska", region: "Eastern", population: 3900000, gdpEur: 73, smeCount: 150000, smeEmployees: 510000, vatPrefix: "HR", marketScore: 50 },
  { code: "LT", name: "Lithuania", nativeName: "Lietuva", region: "Eastern", population: 2800000, gdpEur: 67, smeCount: 86000, smeEmployees: 530000, vatPrefix: "LT", marketScore: 56 },
  { code: "SI", name: "Slovenia", nativeName: "Slovenija", region: "Eastern", population: 2100000, gdpEur: 62, smeCount: 143000, smeEmployees: 450000, vatPrefix: "SI", marketScore: 60 },
  { code: "LV", name: "Latvia", nativeName: "Latvija", region: "Eastern", population: 1800000, gdpEur: 41, smeCount: 93000, smeEmployees: 370000, vatPrefix: "LV", marketScore: 52 },
  { code: "EE", name: "Estonia", nativeName: "Eesti", region: "Eastern", population: 1300000, gdpEur: 38, smeCount: 83000, smeEmployees: 310000, vatPrefix: "EE", marketScore: 62 },
  { code: "CY", name: "Cyprus", nativeName: "Κύπρος", region: "Southern", population: 920000, gdpEur: 28, smeCount: 52000, smeEmployees: 170000, vatPrefix: "CY", marketScore: 50 },
  { code: "LU", name: "Luxembourg", nativeName: "Luxembourg", region: "Western", population: 660000, gdpEur: 80, smeCount: 32000, smeEmployees: 180000, vatPrefix: "LU", marketScore: 73 },
  { code: "MT", name: "Malta", nativeName: "Malta", region: "Southern", population: 530000, gdpEur: 18, smeCount: 28000, smeEmployees: 95000, vatPrefix: "MT", marketScore: 45 },
];
