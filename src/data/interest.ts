/**
 * DEMO popularity ("interest") weights per neighbourhood, 0–100, separately for
 * people looking to buy and to rent. These numbers are invented for the demo:
 * they are NOT real search or visitor data and must be labelled as illustrative
 * wherever they are shown.
 *
 * The shape mirrors what a real, privacy-safe source would provide later:
 * aggregated, per-area counts (never per-person events), e.g. a nightly job
 * that buckets anonymous searches by neighbourhood. Swap `DEMO_INTEREST` for
 * that feed and keep `source` truthful.
 */
export interface AreaInterest {
  city: string;
  neighborhood: string;
  buy: number;
  rent: number;
}

export const INTEREST_SOURCE = 'demo' as const;

const rows: [city: string, neighborhood: string, buy: number, rent: number][] = [
  ['London', 'Shoreditch', 70, 95], ['London', 'Hackney', 75, 90], ['London', 'Islington', 85, 85],
  ['London', 'Clapham', 80, 92], ['London', 'Camden', 70, 88], ['London', 'Chelsea', 80, 60],
  ['London', 'Kensington', 82, 62], ['London', 'Mayfair', 55, 40], ['London', 'Notting Hill', 78, 70],
  ['London', 'Marylebone', 65, 60], ['London', 'Westminster', 50, 55], ['London', 'Pimlico', 55, 58],
  ['London', 'Fulham', 80, 75], ['London', 'Battersea', 85, 85], ['London', 'Canary Wharf', 60, 90],
  ['London', 'Brixton', 65, 85], ['London', 'Peckham', 68, 82], ['London', 'Dulwich', 82, 55],
  ['London', 'Greenwich', 75, 70], ['London', 'Hampstead', 80, 55], ['London', 'Angel', 70, 80],
  ['London', 'Walthamstow', 85, 72], ['London', 'Wandsworth', 84, 70], ['London', 'Wimbledon', 80, 60],
  ['London', 'Richmond', 86, 62], ['London', 'Putney', 78, 68], ['London', 'Stratford', 62, 80],
  ['Manchester', 'Northern Quarter', 55, 85], ['Manchester', 'Ancoats', 70, 90], ['Manchester', 'Didsbury', 85, 70],
  ['Manchester', 'Castlefield', 60, 75], ['Manchester', 'Deansgate', 58, 80], ['Manchester', 'Chorlton', 80, 65],
  ['Manchester', 'Fallowfield', 30, 88], ['Manchester', 'Salford Quays', 55, 78], ['Manchester', 'Spinningfields', 45, 72],
  ['Manchester', 'MediaCityUK', 50, 70],
  ['Birmingham', 'Jewellery Quarter', 70, 85], ['Birmingham', 'Edgbaston', 65, 70], ['Birmingham', 'Harborne', 82, 65],
  ['Birmingham', 'Digbeth', 50, 75], ['Birmingham', 'Moseley', 78, 60], ['Birmingham', 'Kings Heath', 75, 58],
  ['Birmingham', 'Bournville', 72, 45], ['Birmingham', 'Selly Oak', 35, 86],
  ['Bristol', 'Clifton', 85, 80], ['Bristol', 'Redland', 80, 75], ['Bristol', 'Bedminster', 72, 70],
  ['Bristol', 'Southville', 78, 68], ['Bristol', 'Easton', 62, 65], ['Bristol', 'Montpelier', 70, 66],
  ['Bristol', 'Totterdown', 74, 55], ['Bristol', 'Stokes Croft', 50, 78],
  ['Edinburgh', 'New Town', 82, 78], ['Edinburgh', 'Leith', 75, 85], ['Edinburgh', 'Stockbridge', 84, 70],
  ['Edinburgh', 'Marchmont', 60, 88], ['Edinburgh', 'Morningside', 85, 55], ['Edinburgh', 'Bruntsfield', 80, 66],
  ['Leeds', 'Headingley', 50, 90], ['Leeds', 'City Centre', 55, 80], ['Leeds', 'Hyde Park', 40, 92],
  ['Leeds', 'Chapel Allerton', 78, 65], ['Leeds', 'Roundhay', 82, 55], ['Leeds', 'Horsforth', 72, 50],
  ['Liverpool', 'Baltic Triangle', 55, 82], ['Liverpool', 'Ropewalks', 50, 78], ['Liverpool', 'Georgian Quarter', 70, 72],
  ['Liverpool', 'Toxteth', 48, 65], ['Liverpool', 'Allerton', 78, 60],
  ['Newcastle', 'Jesmond', 70, 90], ['Newcastle', 'Heaton', 55, 80], ['Newcastle', 'Gosforth', 80, 60],
  ['Newcastle', 'Ouseburn', 48, 72], ['Newcastle', 'City Centre', 52, 78],
  ['Nottingham', 'Lace Market', 55, 78], ['Nottingham', 'The Park', 82, 50], ['Nottingham', 'West Bridgford', 80, 65],
  ['Nottingham', 'Beeston', 45, 85], ['Nottingham', 'Mapperley', 70, 55], ['Nottingham', 'Hockley', 50, 72],
  ['Sheffield', 'Kelham Island', 58, 80], ['Sheffield', 'Nether Edge', 76, 60], ['Sheffield', 'Walkley', 40, 85],
  ['Sheffield', 'Hillsborough', 65, 55], ['Sheffield', 'Ecclesall', 80, 55], ['Sheffield', 'Crookes', 42, 82],
  ['Brighton', 'North Laine', 62, 85], ['Brighton', 'Kemptown', 70, 72], ['Brighton', 'Hove', 82, 70],
  ['Brighton', 'Seven Dials', 72, 65], ['Brighton', 'Preston Park', 68, 60],
  ['Oxford', 'Jericho', 65, 88], ['Oxford', 'Summertown', 82, 65], ['Oxford', 'Headington', 60, 82],
  ['Oxford', 'Cowley', 50, 78], ['Oxford', 'Iffley', 75, 58],
  ['Cambridge', 'Mill Road', 55, 85], ['Cambridge', 'Chesterton', 78, 68], ['Cambridge', 'Trumpington', 80, 60],
  ['Cambridge', 'Newnham', 82, 55], ['Cambridge', 'Cherry Hinton', 70, 62],
];

export const DEMO_INTEREST: readonly AreaInterest[] = rows.map(([city, neighborhood, buy, rent]) => ({ city, neighborhood, buy, rent }));
