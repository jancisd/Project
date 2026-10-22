// Municipal neighbourhood snapshot for local, city-scoped matching.
// Coordinates are interior representative points, not business addresses.
// Source/licence/coverage notes: public/locations/README.md.
export type NeighbourhoodRecord = {
  id: string;
  name: string;
  city: 'Edmonton' | 'Calgary' | 'Canmore';
  coordinates: { lat: number; lng: number };
  aliases?: string[];
  description?: string;
};

export const neighbourhoodRecords: NeighbourhoodRecord[] = [
  {
    id: 'calgary-228-abbeydale',
    name: 'Abbeydale',
    city: 'Calgary',
    coordinates: {
      lat: 51.05694,
      lng: -113.9278,
    },
  },
  {
    id: 'calgary-107-acadia',
    name: 'Acadia',
    city: 'Calgary',
    coordinates: {
      lat: 50.972421,
      lng: -114.053707,
    },
  },
  {
    id: 'calgary-39-albert-park-radisson-heights',
    name: 'Albert Park/Radisson Heights',
    city: 'Calgary',
    coordinates: {
      lat: 51.044404,
      lng: -113.996795,
    },
  },
  {
    id: 'calgary-54-altadore',
    name: 'Altadore',
    city: 'Calgary',
    coordinates: {
      lat: 51.015979,
      lng: -114.10513,
    },
  },
  {
    id: 'calgary-137-alyth-bonnybrook',
    name: 'Alyth/Bonnybrook',
    city: 'Calgary',
    coordinates: {
      lat: 51.02286,
      lng: -114.022482,
    },
  },
  {
    id: 'calgary-231-applewood-park',
    name: 'Applewood Park',
    city: 'Calgary',
    coordinates: {
      lat: 51.047135,
      lng: -113.928061,
    },
  },
  {
    id: 'calgary-212-arbour-lake',
    name: 'Arbour Lake',
    city: 'Calgary',
    coordinates: {
      lat: 51.132541,
      lng: -114.206801,
    },
  },
  {
    id: 'calgary-284-aspen-woods',
    name: 'Aspen Woods',
    city: 'Calgary',
    coordinates: {
      lat: 51.045121,
      lng: -114.207877,
    },
  },
  {
    id: 'calgary-41-auburn-bay',
    name: 'Auburn Bay',
    city: 'Calgary',
    coordinates: {
      lat: 50.892981,
      lng: -113.957952,
    },
  },
  {
    id: 'calgary-273-aurora-business-park',
    name: 'Aurora Business Park',
    city: 'Calgary',
    coordinates: {
      lat: 51.136136,
      lng: -114.058504,
    },
  },
  {
    id: 'calgary-99-banff-trail',
    name: 'Banff Trail',
    city: 'Calgary',
    coordinates: {
      lat: 51.075239,
      lng: -114.112644,
    },
  },
  {
    id: 'calgary-90-bankview',
    name: 'Bankview',
    city: 'Calgary',
    coordinates: {
      lat: 51.034166,
      lng: -114.100489,
    },
  },
  {
    id: 'calgary-78-bayview',
    name: 'Bayview',
    city: 'Calgary',
    coordinates: {
      lat: 50.974723,
      lng: -114.114097,
    },
  },
  {
    id: 'calgary-289-beddington-heights',
    name: 'Beddington Heights',
    city: 'Calgary',
    coordinates: {
      lat: 51.131833,
      lng: -114.084364,
    },
  },
  {
    id: 'calgary-36-bel-aire',
    name: 'Bel-Aire',
    city: 'Calgary',
    coordinates: {
      lat: 50.999415,
      lng: -114.088941,
    },
  },
  {
    id: 'calgary-68-beltline',
    name: 'Beltline',
    city: 'Calgary',
    coordinates: {
      lat: 51.03745,
      lng: -114.055186,
    },
  },
  {
    id: 'calgary-116-bonavista-downs',
    name: 'Bonavista Downs',
    city: 'Calgary',
    coordinates: {
      lat: 50.943335,
      lng: -114.031107,
    },
  },
  {
    id: 'calgary-114-bowness',
    name: 'Bowness',
    city: 'Calgary',
    coordinates: {
      lat: 51.083357,
      lng: -114.187821,
    },
  },
  {
    id: 'calgary-132-braeside',
    name: 'Braeside',
    city: 'Calgary',
    coordinates: {
      lat: 50.955938,
      lng: -114.106353,
    },
  },
  {
    id: 'calgary-33-brentwood',
    name: 'Brentwood',
    city: 'Calgary',
    coordinates: {
      lat: 51.096227,
      lng: -114.136027,
    },
  },
  {
    id: 'calgary-86-bridgeland-riverside',
    name: 'Bridgeland/Riverside',
    city: 'Calgary',
    coordinates: {
      lat: 51.050565,
      lng: -114.035073,
    },
  },
  {
    id: 'calgary-70-bridlewood',
    name: 'Bridlewood',
    city: 'Calgary',
    coordinates: {
      lat: 50.899503,
      lng: -114.109761,
    },
  },
  {
    id: 'calgary-144-britannia',
    name: 'Britannia',
    city: 'Calgary',
    coordinates: {
      lat: 51.012672,
      lng: -114.086318,
    },
  },
  {
    id: 'calgary-3-burns-industrial',
    name: 'Burns Industrial',
    city: 'Calgary',
    coordinates: {
      lat: 50.998677,
      lng: -114.039681,
    },
  },
  {
    id: 'calgary-274-calgary-international-airport',
    name: 'Calgary International Airport',
    city: 'Calgary',
    coordinates: {
      lat: 51.123677,
      lng: -114.011775,
    },
  },
  {
    id: 'calgary-142-cambrian-heights',
    name: 'Cambrian Heights',
    city: 'Calgary',
    coordinates: {
      lat: 51.084036,
      lng: -114.089452,
    },
  },
  {
    id: 'calgary-192-canada-olympic-park',
    name: 'Canada Olympic Park',
    city: 'Calgary',
    coordinates: {
      lat: 51.080379,
      lng: -114.216718,
    },
  },
  {
    id: 'calgary-139-canyon-meadows',
    name: 'Canyon Meadows',
    city: 'Calgary',
    coordinates: {
      lat: 50.941178,
      lng: -114.082204,
    },
  },
  {
    id: 'calgary-46-capitol-hill',
    name: 'Capitol Hill',
    city: 'Calgary',
    coordinates: {
      lat: 51.072561,
      lng: -114.094664,
    },
  },
  {
    id: 'calgary-133-castleridge',
    name: 'Castleridge',
    city: 'Calgary',
    coordinates: {
      lat: 51.105439,
      lng: -113.960866,
    },
  },
  {
    id: 'calgary-83-cedarbrae',
    name: 'Cedarbrae',
    city: 'Calgary',
    coordinates: {
      lat: 50.955919,
      lng: -114.129615,
    },
  },
  {
    id: 'calgary-67-cfb-currie',
    name: 'Cfb - Currie',
    city: 'Calgary',
    coordinates: {
      lat: 51.016689,
      lng: -114.126,
    },
  },
  {
    id: 'calgary-112-cfb-lincoln-park-pmq',
    name: 'Cfb - Lincoln Park Pmq',
    city: 'Calgary',
    coordinates: {
      lat: 51.00309,
      lng: -114.124745,
    },
  },
  {
    id: 'calgary-31-chaparral',
    name: 'Chaparral',
    city: 'Calgary',
    coordinates: {
      lat: 50.882411,
      lng: -114.024979,
    },
  },
  {
    id: 'calgary-49-charleswood',
    name: 'Charleswood',
    city: 'Calgary',
    coordinates: {
      lat: 51.090042,
      lng: -114.112242,
    },
  },
  {
    id: 'calgary-176-chinatown',
    name: 'Chinatown',
    city: 'Calgary',
    coordinates: {
      lat: 51.052823,
      lng: -114.065511,
    },
  },
  {
    id: 'calgary-94-chinook-park',
    name: 'Chinook Park',
    city: 'Calgary',
    coordinates: {
      lat: 50.983138,
      lng: -114.088993,
    },
  },
  {
    id: 'calgary-288-christie-park',
    name: 'Christie Park',
    city: 'Calgary',
    coordinates: {
      lat: 51.040792,
      lng: -114.175901,
    },
  },
  {
    id: 'calgary-213-citadel',
    name: 'Citadel',
    city: 'Calgary',
    coordinates: {
      lat: 51.144362,
      lng: -114.183678,
    },
  },
  {
    id: 'calgary-253-cityscape',
    name: 'Cityscape',
    city: 'Calgary',
    coordinates: {
      lat: 51.150582,
      lng: -113.961257,
    },
  },
  {
    id: 'calgary-172-cliff-bungalow',
    name: 'Cliff Bungalow',
    city: 'Calgary',
    coordinates: {
      lat: 51.033155,
      lng: -114.074226,
    },
  },
  {
    id: 'calgary-247-coach-hill',
    name: 'Coach Hill',
    city: 'Calgary',
    coordinates: {
      lat: 51.058371,
      lng: -114.182957,
    },
  },
  {
    id: 'calgary-196-collingwood',
    name: 'Collingwood',
    city: 'Calgary',
    coordinates: {
      lat: 51.083311,
      lng: -114.102325,
    },
  },
  {
    id: 'calgary-168-copperfield',
    name: 'Copperfield',
    city: 'Calgary',
    coordinates: {
      lat: 50.916947,
      lng: -113.923007,
    },
  },
  {
    id: 'calgary-229-coral-springs',
    name: 'Coral Springs',
    city: 'Calgary',
    coordinates: {
      lat: 51.103459,
      lng: -113.926957,
    },
  },
  {
    id: 'calgary-57-cougar-ridge',
    name: 'Cougar Ridge',
    city: 'Calgary',
    coordinates: {
      lat: 51.071629,
      lng: -114.209088,
    },
  },
  {
    id: 'calgary-281-country-hills',
    name: 'Country Hills',
    city: 'Calgary',
    coordinates: {
      lat: 51.143644,
      lng: -114.079913,
    },
  },
  {
    id: 'calgary-91-country-hills-village',
    name: 'Country Hills Village',
    city: 'Calgary',
    coordinates: {
      lat: 51.158294,
      lng: -114.061415,
    },
  },
  {
    id: 'calgary-206-coventry-hills',
    name: 'Coventry Hills',
    city: 'Calgary',
    coordinates: {
      lat: 51.164804,
      lng: -114.053245,
    },
  },
  {
    id: 'calgary-117-cranston',
    name: 'Cranston',
    city: 'Calgary',
    coordinates: {
      lat: 50.87698,
      lng: -113.979066,
    },
  },
  {
    id: 'calgary-156-crescent-heights',
    name: 'Crescent Heights',
    city: 'Calgary',
    coordinates: {
      lat: 51.058278,
      lng: -114.059959,
    },
  },
  {
    id: 'calgary-179-crestmont',
    name: 'Crestmont',
    city: 'Calgary',
    coordinates: {
      lat: 51.084238,
      lng: -114.263275,
    },
  },
  {
    id: 'calgary-42-dalhousie',
    name: 'Dalhousie',
    city: 'Calgary',
    coordinates: {
      lat: 51.109839,
      lng: -114.159186,
    },
  },
  {
    id: 'calgary-183-deer-ridge',
    name: 'Deer Ridge',
    city: 'Calgary',
    coordinates: {
      lat: 50.926536,
      lng: -114.02021,
    },
  },
  {
    id: 'calgary-35-deer-run',
    name: 'Deer Run',
    city: 'Calgary',
    coordinates: {
      lat: 50.922507,
      lng: -114.006762,
    },
  },
  {
    id: 'calgary-293-deerfoot-business-centre',
    name: 'Deerfoot Business Centre',
    city: 'Calgary',
    coordinates: {
      lat: 51.118344,
      lng: -114.041628,
    },
  },
  {
    id: 'calgary-277-diamond-cove',
    name: 'Diamond Cove',
    city: 'Calgary',
    coordinates: {
      lat: 50.945814,
      lng: -114.022448,
    },
  },
  {
    id: 'calgary-63-discovery-ridge',
    name: 'Discovery Ridge',
    city: 'Calgary',
    coordinates: {
      lat: 51.015056,
      lng: -114.215939,
    },
  },
  {
    id: 'calgary-257-douglasdale-glen',
    name: 'Douglasdale/Glen',
    city: 'Calgary',
    coordinates: {
      lat: 50.948439,
      lng: -114.011888,
    },
  },
  {
    id: 'calgary-154-dover',
    name: 'Dover',
    city: 'Calgary',
    coordinates: {
      lat: 51.022475,
      lng: -113.99314,
    },
  },
  {
    id: 'calgary-59-downtown-commercial-core',
    name: 'Downtown Commercial Core',
    city: 'Calgary',
    coordinates: {
      lat: 51.047266,
      lng: -114.069593,
    },
    aliases: ['Downtown'],
  },
  {
    id: 'calgary-143-downtown-east-village',
    name: 'Downtown East Village',
    city: 'Calgary',
    coordinates: {
      lat: 51.047066,
      lng: -114.050817,
    },
    aliases: ['Downtown'],
  },
  {
    id: 'calgary-194-downtown-west-end',
    name: 'Downtown West End',
    city: 'Calgary',
    coordinates: {
      lat: 51.04797,
      lng: -114.087779,
    },
    aliases: ['Downtown'],
  },
  {
    id: 'calgary-152-eagle-ridge',
    name: 'Eagle Ridge',
    city: 'Calgary',
    coordinates: {
      lat: 50.98868,
      lng: -114.096802,
    },
  },
  {
    id: 'calgary-217-east-fairview-industrial',
    name: 'East Fairview Industrial',
    city: 'Calgary',
    coordinates: {
      lat: 50.984061,
      lng: -114.038614,
    },
  },
  {
    id: 'calgary-278-east-shepard-industrial',
    name: 'East Shepard Industrial',
    city: 'Calgary',
    coordinates: {
      lat: 50.954239,
      lng: -113.950858,
    },
  },
  {
    id: 'calgary-2-eastfield',
    name: 'Eastfield',
    city: 'Calgary',
    coordinates: {
      lat: 51.01144,
      lng: -113.970041,
    },
  },
  {
    id: 'calgary-103-eau-claire',
    name: 'Eau Claire',
    city: 'Calgary',
    coordinates: {
      lat: 51.053674,
      lng: -114.072742,
    },
  },
  {
    id: 'calgary-286-edgemont',
    name: 'Edgemont',
    city: 'Calgary',
    coordinates: {
      lat: 51.125866,
      lng: -114.147643,
    },
  },
  {
    id: 'calgary-127-elbow-park',
    name: 'Elbow Park',
    city: 'Calgary',
    coordinates: {
      lat: 51.021388,
      lng: -114.083861,
    },
  },
  {
    id: 'calgary-28-elboya',
    name: 'Elboya',
    city: 'Calgary',
    coordinates: {
      lat: 51.013272,
      lng: -114.075551,
    },
  },
  {
    id: 'calgary-58-erin-woods',
    name: 'Erin Woods',
    city: 'Calgary',
    coordinates: {
      lat: 51.0203,
      lng: -113.968205,
    },
  },
  {
    id: 'calgary-43-erlton',
    name: 'Erlton',
    city: 'Calgary',
    coordinates: {
      lat: 51.029313,
      lng: -114.06146,
    },
  },
  {
    id: 'calgary-285-evanston',
    name: 'Evanston',
    city: 'Calgary',
    coordinates: {
      lat: 51.170092,
      lng: -114.113025,
    },
  },
  {
    id: 'calgary-98-evergreen',
    name: 'Evergreen',
    city: 'Calgary',
    coordinates: {
      lat: 50.918723,
      lng: -114.115327,
    },
  },
  {
    id: 'calgary-124-fairview',
    name: 'Fairview',
    city: 'Calgary',
    coordinates: {
      lat: 50.985493,
      lng: -114.060324,
    },
  },
  {
    id: 'calgary-163-fairview-industrial',
    name: 'Fairview Industrial',
    city: 'Calgary',
    coordinates: {
      lat: 50.986759,
      lng: -114.068925,
    },
  },
  {
    id: 'calgary-184-falconridge',
    name: 'Falconridge',
    city: 'Calgary',
    coordinates: {
      lat: 51.103223,
      lng: -113.945443,
    },
  },
  {
    id: 'calgary-204-fish-creek-park',
    name: 'Fish Creek Park',
    city: 'Calgary',
    coordinates: {
      lat: 50.9096,
      lng: -114.026521,
    },
  },
  {
    id: 'calgary-166-foothills',
    name: 'Foothills',
    city: 'Calgary',
    coordinates: {
      lat: 50.995255,
      lng: -113.972969,
    },
  },
  {
    id: 'calgary-88-forest-heights',
    name: 'Forest Heights',
    city: 'Calgary',
    coordinates: {
      lat: 51.049219,
      lng: -113.968777,
    },
  },
  {
    id: 'calgary-30-forest-lawn',
    name: 'Forest Lawn',
    city: 'Calgary',
    coordinates: {
      lat: 51.037842,
      lng: -113.971304,
    },
  },
  {
    id: 'calgary-136-forest-lawn-industrial',
    name: 'Forest Lawn Industrial',
    city: 'Calgary',
    coordinates: {
      lat: 51.027007,
      lng: -113.959798,
    },
  },
  {
    id: 'calgary-190-franklin',
    name: 'Franklin',
    city: 'Calgary',
    coordinates: {
      lat: 51.057562,
      lng: -113.987516,
    },
  },
  {
    id: 'calgary-121-glamorgan',
    name: 'Glamorgan',
    city: 'Calgary',
    coordinates: {
      lat: 51.015605,
      lng: -114.152863,
    },
  },
  {
    id: 'calgary-138-glenbrook',
    name: 'Glenbrook',
    city: 'Calgary',
    coordinates: {
      lat: 51.0234,
      lng: -114.152693,
    },
  },
  {
    id: 'calgary-153-glendale',
    name: 'Glendale',
    city: 'Calgary',
    coordinates: {
      lat: 51.033928,
      lng: -114.15274,
    },
  },
  {
    id: 'calgary-4-glendeer-business-park',
    name: 'Glendeer Business Park',
    city: 'Calgary',
    coordinates: {
      lat: 50.990145,
      lng: -114.032071,
    },
  },
  {
    id: 'calgary-191-glenmore-park',
    name: 'Glenmore Park',
    city: 'Calgary',
    coordinates: {
      lat: 50.990384,
      lng: -114.131525,
    },
  },
  {
    id: 'calgary-1-golden-triangle',
    name: 'Golden Triangle',
    city: 'Calgary',
    coordinates: {
      lat: 51.013192,
      lng: -113.985438,
    },
  },
  {
    id: 'calgary-8-great-plains',
    name: 'Great Plains',
    city: 'Calgary',
    coordinates: {
      lat: 50.988287,
      lng: -113.939378,
    },
  },
  {
    id: 'calgary-80-greenview',
    name: 'Greenview',
    city: 'Calgary',
    coordinates: {
      lat: 51.097123,
      lng: -114.055971,
    },
  },
  {
    id: 'calgary-198-greenview-industrial-park',
    name: 'Greenview Industrial Park',
    city: 'Calgary',
    coordinates: {
      lat: 51.086483,
      lng: -114.049043,
    },
  },
  {
    id: 'calgary-85-greenwood-greenbriar',
    name: 'Greenwood/Greenbriar',
    city: 'Calgary',
    coordinates: {
      lat: 51.090179,
      lng: -114.223821,
    },
  },
  {
    id: 'calgary-255-hamptons',
    name: 'Hamptons',
    city: 'Calgary',
    coordinates: {
      lat: 51.145111,
      lng: -114.146712,
    },
  },
  {
    id: 'calgary-279-harvest-hills',
    name: 'Harvest Hills',
    city: 'Calgary',
    coordinates: {
      lat: 51.147619,
      lng: -114.052797,
    },
  },
  {
    id: 'calgary-151-hawkwood',
    name: 'Hawkwood',
    city: 'Calgary',
    coordinates: {
      lat: 51.13102,
      lng: -114.175583,
    },
  },
  {
    id: 'calgary-89-haysboro',
    name: 'Haysboro',
    city: 'Calgary',
    coordinates: {
      lat: 50.968667,
      lng: -114.083387,
    },
  },
  {
    id: 'calgary-290-hidden-valley',
    name: 'Hidden Valley',
    city: 'Calgary',
    coordinates: {
      lat: 51.15194,
      lng: -114.119608,
    },
  },
  {
    id: 'calgary-162-highfield',
    name: 'Highfield',
    city: 'Calgary',
    coordinates: {
      lat: 51.017933,
      lng: -114.039777,
    },
  },
  {
    id: 'calgary-93-highland-park',
    name: 'Highland Park',
    city: 'Calgary',
    coordinates: {
      lat: 51.088774,
      lng: -114.065768,
    },
  },
  {
    id: 'calgary-122-highwood',
    name: 'Highwood',
    city: 'Calgary',
    coordinates: {
      lat: 51.092303,
      lng: -114.079933,
    },
  },
  {
    id: 'calgary-150-hillhurst',
    name: 'Hillhurst',
    city: 'Calgary',
    coordinates: {
      lat: 51.057338,
      lng: -114.094198,
    },
    aliases: ['Kensington'],
    description: 'The west side of the Kensington area, west of 10 Street NW.',
  },
  {
    id: 'calgary-186-horizon',
    name: 'Horizon',
    city: 'Calgary',
    coordinates: {
      lat: 51.089757,
      lng: -113.991711,
    },
  },
  {
    id: 'calgary-111-hounsfield-heights-briar-hill',
    name: 'Hounsfield Heights/Briar Hill',
    city: 'Calgary',
    coordinates: {
      lat: 51.063217,
      lng: -114.10572,
    },
  },
  {
    id: 'calgary-205-huntington-hills',
    name: 'Huntington Hills',
    city: 'Calgary',
    coordinates: {
      lat: 51.117579,
      lng: -114.066707,
    },
  },
  {
    id: 'calgary-118-inglewood',
    name: 'Inglewood',
    city: 'Calgary',
    coordinates: {
      lat: 51.034148,
      lng: -114.019121,
    },
  },
  {
    id: 'calgary-74-kelvin-grove',
    name: 'Kelvin Grove',
    city: 'Calgary',
    coordinates: {
      lat: 50.99007,
      lng: -114.089043,
    },
  },
  {
    id: 'calgary-104-killarney-glengarry',
    name: 'Killarney/Glengarry',
    city: 'Calgary',
    coordinates: {
      lat: 51.030295,
      lng: -114.131721,
    },
  },
  {
    id: 'calgary-276-kincora',
    name: 'Kincora',
    city: 'Calgary',
    coordinates: {
      lat: 51.160302,
      lng: -114.132897,
    },
  },
  {
    id: 'calgary-134-kingsland',
    name: 'Kingsland',
    city: 'Calgary',
    coordinates: {
      lat: 50.986481,
      lng: -114.077332,
    },
  },
  {
    id: 'calgary-96-lake-bonavista',
    name: 'Lake Bonavista',
    city: 'Calgary',
    coordinates: {
      lat: 50.939937,
      lng: -114.051347,
    },
  },
  {
    id: 'calgary-62-lakeview',
    name: 'Lakeview',
    city: 'Calgary',
    coordinates: {
      lat: 50.999763,
      lng: -114.129633,
    },
  },
  {
    id: 'calgary-225-legacy',
    name: 'Legacy',
    city: 'Calgary',
    coordinates: {
      lat: 50.857548,
      lng: -114.005888,
    },
  },
  {
    id: 'calgary-110-lincoln-park',
    name: 'Lincoln Park',
    city: 'Calgary',
    coordinates: {
      lat: 51.010708,
      lng: -114.13042,
    },
  },
  {
    id: 'calgary-32-lower-mount-royal',
    name: 'Lower Mount Royal',
    city: 'Calgary',
    coordinates: {
      lat: 51.036513,
      lng: -114.086502,
    },
  },
  {
    id: 'calgary-283-macewan-glen',
    name: 'Macewan Glen',
    city: 'Calgary',
    coordinates: {
      lat: 51.137622,
      lng: -114.114638,
    },
  },
  {
    id: 'calgary-26-mahogany',
    name: 'Mahogany',
    city: 'Calgary',
    coordinates: {
      lat: 50.897407,
      lng: -113.924678,
    },
  },
  {
    id: 'calgary-108-manchester',
    name: 'Manchester',
    city: 'Calgary',
    coordinates: {
      lat: 51.007454,
      lng: -114.066382,
    },
  },
  {
    id: 'calgary-165-manchester-industrial',
    name: 'Manchester Industrial',
    city: 'Calgary',
    coordinates: {
      lat: 51.014033,
      lng: -114.05592,
    },
  },
  {
    id: 'calgary-256-maple-ridge',
    name: 'Maple Ridge',
    city: 'Calgary',
    coordinates: {
      lat: 50.957993,
      lng: -114.033013,
    },
  },
  {
    id: 'calgary-27-marlborough',
    name: 'Marlborough',
    city: 'Calgary',
    coordinates: {
      lat: 51.059392,
      lng: -113.969971,
    },
  },
  {
    id: 'calgary-178-marlborough-park',
    name: 'Marlborough Park',
    city: 'Calgary',
    coordinates: {
      lat: 51.059855,
      lng: -113.94673,
    },
  },
  {
    id: 'calgary-269-martindale',
    name: 'Martindale',
    city: 'Calgary',
    coordinates: {
      lat: 51.118121,
      lng: -113.958369,
    },
  },
  {
    id: 'calgary-129-mayfair',
    name: 'Mayfair',
    city: 'Calgary',
    coordinates: {
      lat: 50.9959,
      lng: -114.088959,
    },
  },
  {
    id: 'calgary-164-mayland',
    name: 'Mayland',
    city: 'Calgary',
    coordinates: {
      lat: 51.052382,
      lng: -114.010295,
    },
  },
  {
    id: 'calgary-51-mayland-heights',
    name: 'Mayland Heights',
    city: 'Calgary',
    coordinates: {
      lat: 51.060757,
      lng: -114.013299,
    },
  },
  {
    id: 'calgary-197-mccall',
    name: 'Mccall',
    city: 'Calgary',
    coordinates: {
      lat: 51.089151,
      lng: -114.027115,
    },
  },
  {
    id: 'calgary-201-mckenzie-lake',
    name: 'Mckenzie Lake',
    city: 'Calgary',
    coordinates: {
      lat: 50.914365,
      lng: -113.984721,
    },
  },
  {
    id: 'calgary-200-mckenzie-towne',
    name: 'Mckenzie Towne',
    city: 'Calgary',
    coordinates: {
      lat: 50.916003,
      lng: -113.966379,
    },
  },
  {
    id: 'calgary-69-meadowlark-park',
    name: 'Meadowlark Park',
    city: 'Calgary',
    coordinates: {
      lat: 50.997965,
      lng: -114.077356,
    },
  },
  {
    id: 'calgary-5-meridian',
    name: 'Meridian',
    city: 'Calgary',
    coordinates: {
      lat: 51.056152,
      lng: -113.997505,
    },
  },
  {
    id: 'calgary-60-midnapore',
    name: 'Midnapore',
    city: 'Calgary',
    coordinates: {
      lat: 50.916095,
      lng: -114.057727,
    },
  },
  {
    id: 'calgary-155-millrise',
    name: 'Millrise',
    city: 'Calgary',
    coordinates: {
      lat: 50.916055,
      lng: -114.0846,
    },
  },
  {
    id: 'calgary-170-mission',
    name: 'Mission',
    city: 'Calgary',
    coordinates: {
      lat: 51.033156,
      lng: -114.068081,
    },
  },
  {
    id: 'calgary-230-monterey-park',
    name: 'Monterey Park',
    city: 'Calgary',
    coordinates: {
      lat: 51.081436,
      lng: -113.927889,
    },
  },
  {
    id: 'calgary-72-montgomery',
    name: 'Montgomery',
    city: 'Calgary',
    coordinates: {
      lat: 51.071106,
      lng: -114.162274,
    },
  },
  {
    id: 'calgary-100-mount-pleasant',
    name: 'Mount Pleasant',
    city: 'Calgary',
    coordinates: {
      lat: 51.074477,
      lng: -114.076028,
    },
  },
  {
    id: 'calgary-50-new-brighton',
    name: 'New Brighton',
    city: 'Calgary',
    coordinates: {
      lat: 50.921974,
      lng: -113.945306,
    },
  },
  {
    id: 'calgary-37-nolan-hill',
    name: 'Nolan Hill',
    city: 'Calgary',
    coordinates: {
      lat: 51.175399,
      lng: -114.166351,
    },
  },
  {
    id: 'calgary-188-north-airways',
    name: 'North Airways',
    city: 'Calgary',
    coordinates: {
      lat: 51.087175,
      lng: -114.007526,
    },
  },
  {
    id: 'calgary-82-north-glenmore-park',
    name: 'North Glenmore Park',
    city: 'Calgary',
    coordinates: {
      lat: 51.001131,
      lng: -114.11362,
    },
  },
  {
    id: 'calgary-182-north-haven',
    name: 'North Haven',
    city: 'Calgary',
    coordinates: {
      lat: 51.095852,
      lng: -114.089453,
    },
  },
  {
    id: 'calgary-29-north-haven-upper',
    name: 'North Haven Upper',
    city: 'Calgary',
    coordinates: {
      lat: 51.104403,
      lng: -114.085353,
    },
  },
  {
    id: 'calgary-157-nose-hill-park',
    name: 'Nose Hill Park',
    city: 'Calgary',
    coordinates: {
      lat: 51.111399,
      lng: -114.11062,
    },
  },
  {
    id: 'calgary-128-oakridge',
    name: 'Oakridge',
    city: 'Calgary',
    coordinates: {
      lat: 50.970836,
      lng: -114.129612,
    },
  },
  {
    id: 'calgary-73-ogden',
    name: 'Ogden',
    city: 'Calgary',
    coordinates: {
      lat: 50.992112,
      lng: -114.012597,
    },
  },
  {
    id: 'calgary-167-ogden-shops',
    name: 'Ogden Shops',
    city: 'Calgary',
    coordinates: {
      lat: 50.991232,
      lng: -113.993208,
    },
  },
  {
    id: 'calgary-75-palliser',
    name: 'Palliser',
    city: 'Calgary',
    coordinates: {
      lat: 50.967053,
      lng: -114.112151,
    },
  },
  {
    id: 'calgary-258-panorama-hills',
    name: 'Panorama Hills',
    city: 'Calgary',
    coordinates: {
      lat: 51.158371,
      lng: -114.082456,
    },
  },
  {
    id: 'calgary-38-parkdale',
    name: 'Parkdale',
    city: 'Calgary',
    coordinates: {
      lat: 51.059845,
      lng: -114.135335,
    },
  },
  {
    id: 'calgary-109-parkhill',
    name: 'Parkhill',
    city: 'Calgary',
    coordinates: {
      lat: 51.018294,
      lng: -114.066204,
    },
  },
  {
    id: 'calgary-106-parkland',
    name: 'Parkland',
    city: 'Calgary',
    coordinates: {
      lat: 50.921343,
      lng: -114.02872,
    },
  },
  {
    id: 'calgary-266-patterson',
    name: 'Patterson',
    city: 'Calgary',
    coordinates: {
      lat: 51.064054,
      lng: -114.177347,
    },
  },
  {
    id: 'calgary-187-pegasus',
    name: 'Pegasus',
    city: 'Calgary',
    coordinates: {
      lat: 51.094516,
      lng: -114.006495,
    },
  },
  {
    id: 'calgary-79-penbrooke-meadows',
    name: 'Penbrooke Meadows',
    city: 'Calgary',
    coordinates: {
      lat: 51.046509,
      lng: -113.94699,
    },
  },
  {
    id: 'calgary-92-pineridge',
    name: 'Pineridge',
    city: 'Calgary',
    coordinates: {
      lat: 51.075049,
      lng: -113.946766,
    },
  },
  {
    id: 'calgary-48-point-mckay',
    name: 'Point Mckay',
    city: 'Calgary',
    coordinates: {
      lat: 51.05954,
      lng: -114.146145,
    },
  },
  {
    id: 'calgary-87-pump-hill',
    name: 'Pump Hill',
    city: 'Calgary',
    coordinates: {
      lat: 50.96763,
      lng: -114.100774,
    },
  },
  {
    id: 'calgary-56-queens-park-village',
    name: 'Queens Park Village',
    city: 'Calgary',
    coordinates: {
      lat: 51.085346,
      lng: -114.077562,
    },
  },
  {
    id: 'calgary-125-queensland',
    name: 'Queensland',
    city: 'Calgary',
    coordinates: {
      lat: 50.938094,
      lng: -114.022608,
    },
  },
  {
    id: 'calgary-44-ramsay',
    name: 'Ramsay',
    city: 'Calgary',
    coordinates: {
      lat: 51.036407,
      lng: -114.042533,
    },
  },
  {
    id: 'calgary-113-ranchlands',
    name: 'Ranchlands',
    city: 'Calgary',
    coordinates: {
      lat: 51.119021,
      lng: -114.183573,
    },
  },
  {
    id: 'calgary-126-red-carpet',
    name: 'Red Carpet',
    city: 'Calgary',
    coordinates: {
      lat: 51.042671,
      lng: -113.93876,
    },
  },
  {
    id: 'calgary-210-redstone',
    name: 'Redstone',
    city: 'Calgary',
    coordinates: {
      lat: 51.170451,
      lng: -113.957935,
    },
  },
  {
    id: 'calgary-97-renfrew',
    name: 'Renfrew',
    city: 'Calgary',
    coordinates: {
      lat: 51.059541,
      lng: -114.039117,
    },
  },
  {
    id: 'calgary-105-richmond',
    name: 'Richmond',
    city: 'Calgary',
    coordinates: {
      lat: 51.030933,
      lng: -114.114732,
    },
  },
  {
    id: 'calgary-149-rideau-park',
    name: 'Rideau Park',
    city: 'Calgary',
    coordinates: {
      lat: 51.02486,
      lng: -114.074159,
    },
  },
  {
    id: 'calgary-202-riverbend',
    name: 'Riverbend',
    city: 'Calgary',
    coordinates: {
      lat: 50.975971,
      lng: -114.0179,
    },
  },
  {
    id: 'calgary-84-rocky-ridge',
    name: 'Rocky Ridge',
    city: 'Calgary',
    coordinates: {
      lat: 51.144069,
      lng: -114.245899,
    },
  },
  {
    id: 'calgary-135-rosedale',
    name: 'Rosedale',
    city: 'Calgary',
    coordinates: {
      lat: 51.06268,
      lng: -114.078214,
    },
  },
  {
    id: 'calgary-77-rosemont',
    name: 'Rosemont',
    city: 'Calgary',
    coordinates: {
      lat: 51.078242,
      lng: -114.089971,
    },
  },
  {
    id: 'calgary-25-rosscarrock',
    name: 'Rosscarrock',
    city: 'Calgary',
    coordinates: {
      lat: 51.043101,
      lng: -114.14547,
    },
  },
  {
    id: 'calgary-195-roxboro',
    name: 'Roxboro',
    city: 'Calgary',
    coordinates: {
      lat: 51.026167,
      lng: -114.067633,
    },
  },
  {
    id: 'calgary-66-royal-oak',
    name: 'Royal Oak',
    city: 'Calgary',
    coordinates: {
      lat: 51.14233,
      lng: -114.220135,
    },
  },
  {
    id: 'calgary-211-royal-vista',
    name: 'Royal Vista',
    city: 'Calgary',
    coordinates: {
      lat: 51.149488,
      lng: -114.204182,
    },
  },
  {
    id: 'calgary-95-rundle',
    name: 'Rundle',
    city: 'Calgary',
    coordinates: {
      lat: 51.075114,
      lng: -113.97006,
    },
  },
  {
    id: 'calgary-81-rutland-park',
    name: 'Rutland Park',
    city: 'Calgary',
    coordinates: {
      lat: 51.018979,
      lng: -114.137367,
    },
  },
  {
    id: 'calgary-272-saddle-ridge',
    name: 'Saddle Ridge',
    city: 'Calgary',
    coordinates: {
      lat: 51.130657,
      lng: -113.945623,
    },
  },
  {
    id: 'calgary-270-saddle-ridge-industrial',
    name: 'Saddle Ridge Industrial',
    city: 'Calgary',
    coordinates: {
      lat: 51.12518,
      lng: -113.975829,
    },
  },
  {
    id: 'calgary-267-sage-hill',
    name: 'Sage Hill',
    city: 'Calgary',
    coordinates: {
      lat: 51.175689,
      lng: -114.140759,
    },
  },
  {
    id: 'calgary-282-sandstone-valley',
    name: 'Sandstone Valley',
    city: 'Calgary',
    coordinates: {
      lat: 51.13783,
      lng: -114.094939,
    },
  },
  {
    id: 'calgary-47-scarboro',
    name: 'Scarboro',
    city: 'Calgary',
    coordinates: {
      lat: 51.040709,
      lng: -114.107142,
    },
  },
  {
    id: 'calgary-102-scarboro-sunalta-west',
    name: 'Scarboro/ Sunalta West',
    city: 'Calgary',
    coordinates: {
      lat: 51.042366,
      lng: -114.114853,
    },
  },
  {
    id: 'calgary-119-scenic-acres',
    name: 'Scenic Acres',
    city: 'Calgary',
    coordinates: {
      lat: 51.114219,
      lng: -114.218095,
    },
  },
  {
    id: 'calgary-218-section-23',
    name: 'Section 23',
    city: 'Calgary',
    coordinates: {
      lat: 50.970932,
      lng: -113.947813,
    },
  },
  {
    id: 'calgary-64-seton',
    name: 'Seton',
    city: 'Calgary',
    coordinates: {
      lat: 50.878193,
      lng: -113.951893,
    },
  },
  {
    id: 'calgary-169-shaganappi',
    name: 'Shaganappi',
    city: 'Calgary',
    coordinates: {
      lat: 51.045536,
      lng: -114.123725,
    },
  },
  {
    id: 'calgary-145-shawnee-slopes',
    name: 'Shawnee Slopes',
    city: 'Calgary',
    coordinates: {
      lat: 50.926195,
      lng: -114.08581,
    },
  },
  {
    id: 'calgary-177-shawnessy',
    name: 'Shawnessy',
    city: 'Calgary',
    coordinates: {
      lat: 50.903371,
      lng: -114.073961,
    },
  },
  {
    id: 'calgary-203-shepard-industrial',
    name: 'Shepard Industrial',
    city: 'Calgary',
    coordinates: {
      lat: 50.962,
      lng: -113.991609,
    },
  },
  {
    id: 'calgary-275-sherwood',
    name: 'Sherwood',
    city: 'Calgary',
    coordinates: {
      lat: 51.160002,
      lng: -114.152025,
    },
  },
  {
    id: 'calgary-207-signal-hill',
    name: 'Signal Hill',
    city: 'Calgary',
    coordinates: {
      lat: 51.024892,
      lng: -114.175919,
    },
  },
  {
    id: 'calgary-123-silver-springs',
    name: 'Silver Springs',
    city: 'Calgary',
    coordinates: {
      lat: 51.104284,
      lng: -114.196278,
    },
  },
  {
    id: 'calgary-141-silverado',
    name: 'Silverado',
    city: 'Calgary',
    coordinates: {
      lat: 50.886684,
      lng: -114.072434,
    },
  },
  {
    id: 'calgary-10-skyline-east',
    name: 'Skyline East',
    city: 'Calgary',
    coordinates: {
      lat: 51.100205,
      lng: -114.040285,
    },
  },
  {
    id: 'calgary-220-skyline-west',
    name: 'Skyline West',
    city: 'Calgary',
    coordinates: {
      lat: 51.103258,
      lng: -114.049655,
    },
  },
  {
    id: 'calgary-245-skyview-ranch',
    name: 'Skyview Ranch',
    city: 'Calgary',
    coordinates: {
      lat: 51.158046,
      lng: -113.958305,
    },
  },
  {
    id: 'calgary-147-somerset',
    name: 'Somerset',
    city: 'Calgary',
    coordinates: {
      lat: 50.898643,
      lng: -114.081276,
    },
  },
  {
    id: 'calgary-199-south-airways',
    name: 'South Airways',
    city: 'Calgary',
    coordinates: {
      lat: 51.074212,
      lng: -114.005282,
    },
  },
  {
    id: 'calgary-148-south-calgary',
    name: 'South Calgary',
    city: 'Calgary',
    coordinates: {
      lat: 51.026983,
      lng: -114.102064,
    },
  },
  {
    id: 'calgary-219-south-foothills',
    name: 'South Foothills',
    city: 'Calgary',
    coordinates: {
      lat: 50.971283,
      lng: -113.973649,
    },
  },
  {
    id: 'calgary-65-southview',
    name: 'Southview',
    city: 'Calgary',
    coordinates: {
      lat: 51.034148,
      lng: -113.997333,
    },
  },
  {
    id: 'calgary-131-southwood',
    name: 'Southwood',
    city: 'Calgary',
    coordinates: {
      lat: 50.958544,
      lng: -114.0832,
    },
  },
  {
    id: 'calgary-291-springbank-hill',
    name: 'Springbank Hill',
    city: 'Calgary',
    coordinates: {
      lat: 51.026727,
      lng: -114.208443,
    },
  },
  {
    id: 'calgary-175-spruce-cliff',
    name: 'Spruce Cliff',
    city: 'Calgary',
    coordinates: {
      lat: 51.048411,
      lng: -114.136282,
    },
  },
  {
    id: 'calgary-174-st-andrews-heights',
    name: 'St. Andrews Heights',
    city: 'Calgary',
    coordinates: {
      lat: 51.064768,
      lng: -114.128304,
    },
  },
  {
    id: 'calgary-7-starfield',
    name: 'Starfield',
    city: 'Calgary',
    coordinates: {
      lat: 51.001379,
      lng: -113.939367,
    },
  },
  {
    id: 'calgary-259-stonegate-landing',
    name: 'Stonegate Landing',
    city: 'Calgary',
    coordinates: {
      lat: 51.164592,
      lng: -113.986632,
    },
  },
  {
    id: 'calgary-261-stoney-1',
    name: 'Stoney 1',
    city: 'Calgary',
    coordinates: {
      lat: 51.150892,
      lng: -114.032191,
    },
  },
  {
    id: 'calgary-292-stoney-2',
    name: 'Stoney 2',
    city: 'Calgary',
    coordinates: {
      lat: 51.142232,
      lng: -114.017825,
    },
  },
  {
    id: 'calgary-251-stoney-3',
    name: 'Stoney 3',
    city: 'Calgary',
    coordinates: {
      lat: 51.150582,
      lng: -113.975834,
    },
  },
  {
    id: 'calgary-260-stoney-4',
    name: 'Stoney 4',
    city: 'Calgary',
    coordinates: {
      lat: 51.173102,
      lng: -114.030721,
    },
  },
  {
    id: 'calgary-287-strathcona-park',
    name: 'Strathcona Park',
    city: 'Calgary',
    coordinates: {
      lat: 51.04759,
      lng: -114.177713,
    },
  },
  {
    id: 'calgary-52-sunalta',
    name: 'Sunalta',
    city: 'Calgary',
    coordinates: {
      lat: 51.042948,
      lng: -114.101453,
    },
  },
  {
    id: 'calgary-180-sundance',
    name: 'Sundance',
    city: 'Calgary',
    coordinates: {
      lat: 50.901578,
      lng: -114.042059,
    },
  },
  {
    id: 'calgary-40-sunnyside',
    name: 'Sunnyside',
    city: 'Calgary',
    coordinates: {
      lat: 51.056418,
      lng: -114.079028,
    },
    aliases: ['Kensington'],
    description: 'The east side of the Kensington area, east of 10 Street NW.',
  },
  {
    id: 'calgary-189-sunridge',
    name: 'Sunridge',
    city: 'Calgary',
    coordinates: {
      lat: 51.075385,
      lng: -113.991704,
    },
  },
  {
    id: 'calgary-252-taradale',
    name: 'Taradale',
    city: 'Calgary',
    coordinates: {
      lat: 51.118247,
      lng: -113.934004,
    },
  },
  {
    id: 'calgary-130-temple',
    name: 'Temple',
    city: 'Calgary',
    coordinates: {
      lat: 51.088954,
      lng: -113.946767,
    },
  },
  {
    id: 'calgary-53-thorncliffe',
    name: 'Thorncliffe',
    city: 'Calgary',
    coordinates: {
      lat: 51.103091,
      lng: -114.068777,
    },
  },
  {
    id: 'calgary-55-tuscany',
    name: 'Tuscany',
    city: 'Calgary',
    coordinates: {
      lat: 51.124915,
      lng: -114.244382,
    },
  },
  {
    id: 'calgary-173-tuxedo-park',
    name: 'Tuxedo Park',
    city: 'Calgary',
    coordinates: {
      lat: 51.074472,
      lng: -114.061802,
    },
  },
  {
    id: 'calgary-71-university-heights',
    name: 'University Heights',
    city: 'Calgary',
    coordinates: {
      lat: 51.06951,
      lng: -114.132638,
    },
  },
  {
    id: 'calgary-185-university-of-calgary',
    name: 'University Of Calgary',
    city: 'Calgary',
    coordinates: {
      lat: 51.074661,
      lng: -114.135246,
    },
  },
  {
    id: 'calgary-101-upper-mount-royal',
    name: 'Upper Mount Royal',
    city: 'Calgary',
    coordinates: {
      lat: 51.029953,
      lng: -114.085035,
    },
  },
  {
    id: 'calgary-34-valley-ridge',
    name: 'Valley Ridge',
    city: 'Calgary',
    coordinates: {
      lat: 51.095368,
      lng: -114.25119,
    },
  },
  {
    id: 'calgary-6-valleyfield',
    name: 'Valleyfield',
    city: 'Calgary',
    coordinates: {
      lat: 51.009152,
      lng: -114.001766,
    },
  },
  {
    id: 'calgary-24-varsity',
    name: 'Varsity',
    city: 'Calgary',
    coordinates: {
      lat: 51.095969,
      lng: -114.162559,
    },
  },
  {
    id: 'calgary-120-vista-heights',
    name: 'Vista Heights',
    city: 'Calgary',
    coordinates: {
      lat: 51.071946,
      lng: -114.017727,
    },
  },
  {
    id: 'calgary-61-walden',
    name: 'Walden',
    city: 'Calgary',
    coordinates: {
      lat: 50.873047,
      lng: -114.033402,
    },
  },
  {
    id: 'calgary-181-west-hillhurst',
    name: 'West Hillhurst',
    city: 'Calgary',
    coordinates: {
      lat: 51.055069,
      lng: -114.115154,
    },
  },
  {
    id: 'calgary-280-west-springs',
    name: 'West Springs',
    city: 'Calgary',
    coordinates: {
      lat: 51.059741,
      lng: -114.206168,
    },
  },
  {
    id: 'calgary-265-westgate',
    name: 'Westgate',
    city: 'Calgary',
    coordinates: {
      lat: 51.045258,
      lng: -114.15846,
    },
  },
  {
    id: 'calgary-9-westwinds',
    name: 'Westwinds',
    city: 'Calgary',
    coordinates: {
      lat: 51.103936,
      lng: -113.975584,
    },
  },
  {
    id: 'calgary-115-whitehorn',
    name: 'Whitehorn',
    city: 'Calgary',
    coordinates: {
      lat: 51.089757,
      lng: -113.970073,
    },
  },
  {
    id: 'calgary-246-wildwood',
    name: 'Wildwood',
    city: 'Calgary',
    coordinates: {
      lat: 51.058949,
      lng: -114.157478,
    },
  },
  {
    id: 'calgary-76-willow-park',
    name: 'Willow Park',
    city: 'Calgary',
    coordinates: {
      lat: 50.95661,
      lng: -114.056201,
    },
  },
  {
    id: 'calgary-45-windsor-park',
    name: 'Windsor Park',
    city: 'Calgary',
    coordinates: {
      lat: 51.00504,
      lng: -114.083553,
    },
  },
  {
    id: 'calgary-140-winston-heights-mountview',
    name: 'Winston Heights/Mountview',
    city: 'Calgary',
    coordinates: {
      lat: 51.075343,
      lng: -114.041859,
    },
  },
  {
    id: 'calgary-146-woodbine',
    name: 'Woodbine',
    city: 'Calgary',
    coordinates: {
      lat: 50.938574,
      lng: -114.129629,
    },
  },
  {
    id: 'calgary-171-woodlands',
    name: 'Woodlands',
    city: 'Calgary',
    coordinates: {
      lat: 50.940681,
      lng: -114.106344,
    },
  },
  {
    id: 'canmore-downtown',
    name: 'Downtown',
    city: 'Canmore',
    coordinates: {
      lat: 51.089,
      lng: -115.359,
    },
    aliases: ['Town Centre', 'Town Center', 'Downtown Canmore'],
    description:
      'Approximate downtown area around Main Street / 8 Street; confirm a specific spot on the map if needed.',
  },
  {
    id: 'edmonton-1-abbottsfield',
    name: 'Abbottsfield',
    city: 'Edmonton',
    coordinates: {
      lat: 53.57396,
      lng: -113.388797,
    },
  },
  {
    id: 'edmonton-2-albany',
    name: 'Albany',
    city: 'Edmonton',
    coordinates: {
      lat: 53.632724,
      lng: -113.548916,
    },
  },
  {
    id: 'edmonton-3-alberta-avenue',
    name: 'Alberta Avenue',
    city: 'Edmonton',
    coordinates: {
      lat: 53.568105,
      lng: -113.485011,
    },
  },
  {
    id: 'edmonton-4-alberta-park-industrial',
    name: 'Alberta Park Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.567324,
      lng: -113.596478,
    },
  },
  {
    id: 'edmonton-5-aldergrove',
    name: 'Aldergrove',
    city: 'Edmonton',
    coordinates: {
      lat: 53.516898,
      lng: -113.641243,
    },
  },
  {
    id: 'edmonton-6-allard',
    name: 'Allard',
    city: 'Edmonton',
    coordinates: {
      lat: 53.401444,
      lng: -113.526683,
    },
  },
  {
    id: 'edmonton-7-allendale',
    name: 'Allendale',
    city: 'Edmonton',
    coordinates: {
      lat: 53.502256,
      lng: -113.504821,
    },
  },
  {
    id: 'edmonton-8-ambleside',
    name: 'Ambleside',
    city: 'Edmonton',
    coordinates: {
      lat: 53.430413,
      lng: -113.60066,
    },
  },
  {
    id: 'edmonton-9-anthony-henday',
    name: 'Anthony Henday',
    city: 'Edmonton',
    coordinates: {
      lat: 53.540887,
      lng: -113.658038,
    },
  },
  {
    id: 'edmonton-10-anthony-henday-big-lake',
    name: 'Anthony Henday Big Lake',
    city: 'Edmonton',
    coordinates: {
      lat: 53.586321,
      lng: -113.650804,
    },
  },
  {
    id: 'edmonton-11-anthony-henday-castledowns',
    name: 'Anthony Henday Castledowns',
    city: 'Edmonton',
    coordinates: {
      lat: 53.643298,
      lng: -113.53328,
    },
  },
  {
    id: 'edmonton-12-anthony-henday-clareview',
    name: 'Anthony Henday Clareview',
    city: 'Edmonton',
    coordinates: {
      lat: 53.618122,
      lng: -113.35778,
    },
  },
  {
    id: 'edmonton-13-anthony-henday-energy-park',
    name: 'Anthony Henday Energy Park',
    city: 'Edmonton',
    coordinates: {
      lat: 53.639612,
      lng: -113.407227,
    },
  },
  {
    id: 'edmonton-14-anthony-henday-horse-hill',
    name: 'Anthony Henday Horse Hill',
    city: 'Edmonton',
    coordinates: {
      lat: 53.631358,
      lng: -113.378947,
    },
  },
  {
    id: 'edmonton-15-anthony-henday-lake-district',
    name: 'Anthony Henday Lake District',
    city: 'Edmonton',
    coordinates: {
      lat: 53.648589,
      lng: -113.467364,
    },
  },
  {
    id: 'edmonton-16-anthony-henday-mistatim',
    name: 'Anthony Henday Mistatim',
    city: 'Edmonton',
    coordinates: {
      lat: 53.608759,
      lng: -113.611733,
    },
  },
  {
    id: 'edmonton-17-anthony-henday-rampart',
    name: 'Anthony Henday Rampart',
    city: 'Edmonton',
    coordinates: {
      lat: 53.6276,
      lng: -113.576245,
    },
  },
  {
    id: 'edmonton-18-anthony-henday-south',
    name: 'Anthony Henday South',
    city: 'Edmonton',
    coordinates: {
      lat: 53.432208,
      lng: -113.547678,
    },
  },
  {
    id: 'edmonton-19-anthony-henday-south-west',
    name: 'Anthony Henday South West',
    city: 'Edmonton',
    coordinates: {
      lat: 53.485438,
      lng: -113.658884,
    },
  },
  {
    id: 'edmonton-20-anthony-henday-southeast',
    name: 'Anthony Henday Southeast',
    city: 'Edmonton',
    coordinates: {
      lat: 53.442664,
      lng: -113.354799,
    },
  },
  {
    id: 'edmonton-21-anthony-henday-terwillegar',
    name: 'Anthony Henday Terwillegar',
    city: 'Edmonton',
    coordinates: {
      lat: 53.44389,
      lng: -113.598037,
    },
  },
  {
    id: 'edmonton-22-argyll',
    name: 'Argyll',
    city: 'Edmonton',
    coordinates: {
      lat: 53.503101,
      lng: -113.460539,
    },
  },
  {
    id: 'edmonton-23-armstrong-industrial',
    name: 'Armstrong Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.566391,
      lng: -113.621268,
    },
  },
  {
    id: 'edmonton-24-aspen-gardens',
    name: 'Aspen Gardens',
    city: 'Edmonton',
    coordinates: {
      lat: 53.477584,
      lng: -113.545703,
    },
  },
  {
    id: 'edmonton-25-athlone',
    name: 'Athlone',
    city: 'Edmonton',
    coordinates: {
      lat: 53.587808,
      lng: -113.550876,
    },
  },
  {
    id: 'edmonton-26-avonmore',
    name: 'Avonmore',
    city: 'Edmonton',
    coordinates: {
      lat: 53.507667,
      lng: -113.451677,
    },
  },
  {
    id: 'edmonton-27-balwin',
    name: 'Balwin',
    city: 'Edmonton',
    coordinates: {
      lat: 53.588445,
      lng: -113.455075,
    },
  },
  {
    id: 'edmonton-28-bannerman',
    name: 'Bannerman',
    city: 'Edmonton',
    coordinates: {
      lat: 53.604282,
      lng: -113.378356,
    },
  },
  {
    id: 'edmonton-29-baranow',
    name: 'Baranow',
    city: 'Edmonton',
    coordinates: {
      lat: 53.608277,
      lng: -113.538385,
    },
  },
  {
    id: 'edmonton-30-baturyn',
    name: 'Baturyn',
    city: 'Edmonton',
    coordinates: {
      lat: 53.630921,
      lng: -113.504341,
    },
  },
  {
    id: 'edmonton-31-beacon-heights',
    name: 'Beacon Heights',
    city: 'Edmonton',
    coordinates: {
      lat: 53.573532,
      lng: -113.40604,
    },
  },
  {
    id: 'edmonton-32-bearspaw',
    name: 'Bearspaw',
    city: 'Edmonton',
    coordinates: {
      lat: 53.443494,
      lng: -113.500541,
    },
  },
  {
    id: 'edmonton-33-beaumaris',
    name: 'Beaumaris',
    city: 'Edmonton',
    coordinates: {
      lat: 53.618362,
      lng: -113.504983,
    },
  },
  {
    id: 'edmonton-34-belgravia',
    name: 'Belgravia',
    city: 'Edmonton',
    coordinates: {
      lat: 53.511567,
      lng: -113.532846,
    },
  },
  {
    id: 'edmonton-35-belle-rive',
    name: 'Belle Rive',
    city: 'Edmonton',
    coordinates: {
      lat: 53.621984,
      lng: -113.473556,
    },
  },
  {
    id: 'edmonton-36-bellevue',
    name: 'Bellevue',
    city: 'Edmonton',
    coordinates: {
      lat: 53.565225,
      lng: -113.445328,
    },
  },
  {
    id: 'edmonton-37-belmead',
    name: 'Belmead',
    city: 'Edmonton',
    coordinates: {
      lat: 53.525606,
      lng: -113.641015,
    },
  },
  {
    id: 'edmonton-38-belmont',
    name: 'Belmont',
    city: 'Edmonton',
    coordinates: {
      lat: 53.592933,
      lng: -113.394387,
    },
  },
  {
    id: 'edmonton-39-belvedere',
    name: 'Belvedere',
    city: 'Edmonton',
    coordinates: {
      lat: 53.590916,
      lng: -113.436176,
    },
  },
  {
    id: 'edmonton-40-bergman',
    name: 'Bergman',
    city: 'Edmonton',
    coordinates: {
      lat: 53.579155,
      lng: -113.408776,
    },
  },
  {
    id: 'edmonton-41-beverly-heights',
    name: 'Beverly Heights',
    city: 'Edmonton',
    coordinates: {
      lat: 53.56412,
      lng: -113.402651,
    },
  },
  {
    id: 'edmonton-42-bisset',
    name: 'Bisset',
    city: 'Edmonton',
    coordinates: {
      lat: 53.458665,
      lng: -113.400767,
    },
  },
  {
    id: 'edmonton-43-blackburne',
    name: 'Blackburne',
    city: 'Edmonton',
    coordinates: {
      lat: 53.429034,
      lng: -113.498286,
    },
  },
  {
    id: 'edmonton-44-blackmud-creek',
    name: 'Blackmud Creek',
    city: 'Edmonton',
    coordinates: {
      lat: 53.419677,
      lng: -113.510803,
    },
  },
  {
    id: 'edmonton-45-blackmud-creek-ravine',
    name: 'Blackmud Creek Ravine',
    city: 'Edmonton',
    coordinates: {
      lat: 53.446866,
      lng: -113.524164,
    },
  },
  {
    id: 'edmonton-46-blue-quill',
    name: 'Blue Quill',
    city: 'Edmonton',
    coordinates: {
      lat: 53.45816,
      lng: -113.526487,
    },
  },
  {
    id: 'edmonton-47-blue-quill-estates',
    name: 'Blue Quill Estates',
    city: 'Edmonton',
    coordinates: {
      lat: 53.457649,
      lng: -113.540206,
    },
  },
  {
    id: 'edmonton-48-bonaventure-industrial',
    name: 'Bonaventure Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.59125,
      lng: -113.572021,
    },
  },
  {
    id: 'edmonton-49-bonnie-doon',
    name: 'Bonnie Doon',
    city: 'Edmonton',
    coordinates: {
      lat: 53.525368,
      lng: -113.467163,
    },
  },
  {
    id: 'edmonton-50-boyle-street',
    name: 'Boyle Street',
    city: 'Edmonton',
    coordinates: {
      lat: 53.550781,
      lng: -113.477275,
    },
  },
  {
    id: 'edmonton-51-brander-gardens',
    name: 'Brander Gardens',
    city: 'Edmonton',
    coordinates: {
      lat: 53.49521,
      lng: -113.579425,
    },
  },
  {
    id: 'edmonton-52-breckenridge-greens',
    name: 'Breckenridge Greens',
    city: 'Edmonton',
    coordinates: {
      lat: 53.516846,
      lng: -113.684448,
    },
  },
  {
    id: 'edmonton-53-brintnell',
    name: 'Brintnell',
    city: 'Edmonton',
    coordinates: {
      lat: 53.621626,
      lng: -113.406915,
    },
  },
  {
    id: 'edmonton-54-britannia-youngstown',
    name: 'Britannia Youngstown',
    city: 'Edmonton',
    coordinates: {
      lat: 53.545648,
      lng: -113.601801,
    },
  },
  {
    id: 'edmonton-55-brookside',
    name: 'Brookside',
    city: 'Edmonton',
    coordinates: {
      lat: 53.491175,
      lng: -113.568131,
    },
  },
  {
    id: 'edmonton-56-brown-industrial',
    name: 'Brown Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.582048,
      lng: -113.567856,
    },
  },
  {
    id: 'edmonton-57-bulyea-heights',
    name: 'Bulyea Heights',
    city: 'Edmonton',
    coordinates: {
      lat: 53.475179,
      lng: -113.569071,
    },
  },
  {
    id: 'edmonton-58-caernarvon',
    name: 'Caernarvon',
    city: 'Edmonton',
    coordinates: {
      lat: 53.611854,
      lng: -113.526398,
    },
  },
  {
    id: 'edmonton-59-calder',
    name: 'Calder',
    city: 'Edmonton',
    coordinates: {
      lat: 53.588367,
      lng: -113.528868,
    },
  },
  {
    id: 'edmonton-60-calgary-trail-north',
    name: 'Calgary Trail North',
    city: 'Edmonton',
    coordinates: {
      lat: 53.490118,
      lng: -113.492708,
    },
  },
  {
    id: 'edmonton-61-calgary-trail-south',
    name: 'Calgary Trail South',
    city: 'Edmonton',
    coordinates: {
      lat: 53.468318,
      lng: -113.494046,
    },
  },
  {
    id: 'edmonton-62-callaghan',
    name: 'Callaghan',
    city: 'Edmonton',
    coordinates: {
      lat: 53.410083,
      lng: -113.525559,
    },
  },
  {
    id: 'edmonton-63-callingwood-north',
    name: 'Callingwood North',
    city: 'Edmonton',
    coordinates: {
      lat: 53.507685,
      lng: -113.623013,
    },
  },
  {
    id: 'edmonton-64-callingwood-south',
    name: 'Callingwood South',
    city: 'Edmonton',
    coordinates: {
      lat: 53.50073,
      lng: -113.623064,
    },
  },
  {
    id: 'edmonton-65-cameron-heights',
    name: 'Cameron Heights',
    city: 'Edmonton',
    coordinates: {
      lat: 53.474112,
      lng: -113.634363,
    },
  },
  {
    id: 'edmonton-66-canon-ridge',
    name: 'Canon Ridge',
    city: 'Edmonton',
    coordinates: {
      lat: 53.578848,
      lng: -113.378744,
    },
  },
  {
    id: 'edmonton-67-canora',
    name: 'Canora',
    city: 'Edmonton',
    coordinates: {
      lat: 53.545609,
      lng: -113.584213,
    },
  },
  {
    id: 'edmonton-68-canossa',
    name: 'Canossa',
    city: 'Edmonton',
    coordinates: {
      lat: 53.636174,
      lng: -113.522717,
    },
  },
  {
    id: 'edmonton-69-capilano',
    name: 'Capilano',
    city: 'Edmonton',
    coordinates: {
      lat: 53.554574,
      lng: -113.422856,
    },
  },
  {
    id: 'edmonton-70-carleton-square-industrial',
    name: 'Carleton Square Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.573452,
      lng: -113.608838,
    },
  },
  {
    id: 'edmonton-71-carlisle',
    name: 'Carlisle',
    city: 'Edmonton',
    coordinates: {
      lat: 53.6035,
      lng: -113.525914,
    },
  },
  {
    id: 'edmonton-72-carlton',
    name: 'Carlton',
    city: 'Edmonton',
    coordinates: {
      lat: 53.621665,
      lng: -113.559375,
    },
  },
  {
    id: 'edmonton-73-carter-crest',
    name: 'Carter Crest',
    city: 'Edmonton',
    coordinates: {
      lat: 53.465041,
      lng: -113.577844,
    },
  },
  {
    id: 'edmonton-74-cashman',
    name: 'Cashman',
    city: 'Edmonton',
    coordinates: {
      lat: 53.417494,
      lng: -113.498986,
    },
  },
  {
    id: 'edmonton-75-casselman',
    name: 'Casselman',
    city: 'Edmonton',
    coordinates: {
      lat: 53.611418,
      lng: -113.424144,
    },
  },
  {
    id: 'edmonton-76-central-mcdougall',
    name: 'Central McDougall',
    city: 'Edmonton',
    coordinates: {
      lat: 53.553815,
      lng: -113.50107,
    },
  },
  {
    id: 'edmonton-77-chambery',
    name: 'Chambery',
    city: 'Edmonton',
    coordinates: {
      lat: 53.641114,
      lng: -113.511766,
    },
  },
  {
    id: 'edmonton-78-chappelle-area',
    name: 'Chappelle Area',
    city: 'Edmonton',
    coordinates: {
      lat: 53.401978,
      lng: -113.58692,
    },
  },
  {
    id: 'edmonton-79-charlesworth',
    name: 'Charlesworth',
    city: 'Edmonton',
    coordinates: {
      lat: 53.427971,
      lng: -113.424282,
    },
  },
  {
    id: 'edmonton-80-clareview-town-centre',
    name: 'Clareview Town Centre',
    city: 'Edmonton',
    coordinates: {
      lat: 53.601474,
      lng: -113.407189,
    },
  },
  {
    id: 'edmonton-81-clover-bar-area',
    name: 'Clover Bar Area',
    city: 'Edmonton',
    coordinates: {
      lat: 53.591207,
      lng: -113.333287,
    },
  },
  {
    id: 'edmonton-82-cloverdale',
    name: 'Cloverdale',
    city: 'Edmonton',
    coordinates: {
      lat: 53.536865,
      lng: -113.474014,
    },
  },
  {
    id: 'edmonton-83-coronet-addition-industrial',
    name: 'Coronet Addition Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.502585,
      lng: -113.45194,
    },
  },
  {
    id: 'edmonton-84-coronet-industrial',
    name: 'Coronet Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.494016,
      lng: -113.47898,
    },
  },
  {
    id: 'edmonton-85-cpr-irvine',
    name: 'CPR Irvine',
    city: 'Edmonton',
    coordinates: {
      lat: 53.5097,
      lng: -113.491024,
    },
  },
  {
    id: 'edmonton-86-crawford-plains',
    name: 'Crawford Plains',
    city: 'Edmonton',
    coordinates: {
      lat: 53.441865,
      lng: -113.406218,
    },
  },
  {
    id: 'edmonton-87-crestwood',
    name: 'Crestwood',
    city: 'Edmonton',
    coordinates: {
      lat: 53.53541,
      lng: -113.569043,
    },
  },
  {
    id: 'edmonton-88-cromdale',
    name: 'Cromdale',
    city: 'Edmonton',
    coordinates: {
      lat: 53.558985,
      lng: -113.468839,
    },
  },
  {
    id: 'edmonton-89-crystallina-nera',
    name: 'Crystallina Nera',
    city: 'Edmonton',
    coordinates: {
      lat: 53.640327,
      lng: -113.460385,
    },
  },
  {
    id: 'edmonton-90-crystallina-nera-east',
    name: 'Crystallina Nera East',
    city: 'Edmonton',
    coordinates: {
      lat: 53.639656,
      lng: -113.448983,
    },
  },
  {
    id: 'edmonton-91-cumberland',
    name: 'Cumberland',
    city: 'Edmonton',
    coordinates: {
      lat: 53.610532,
      lng: -113.553188,
    },
  },
  {
    id: 'edmonton-92-cy-becker',
    name: 'Cy Becker',
    city: 'Edmonton',
    coordinates: {
      lat: 53.633038,
      lng: -113.408448,
    },
  },
  {
    id: 'edmonton-93-daly-grove',
    name: 'Daly Grove',
    city: 'Edmonton',
    coordinates: {
      lat: 53.449199,
      lng: -113.400354,
    },
  },
  {
    id: 'edmonton-94-davies-industrial-east',
    name: 'Davies Industrial East',
    city: 'Edmonton',
    coordinates: {
      lat: 53.506192,
      lng: -113.433132,
    },
  },
  {
    id: 'edmonton-95-davies-industrial-west',
    name: 'Davies Industrial West',
    city: 'Edmonton',
    coordinates: {
      lat: 53.498452,
      lng: -113.45034,
    },
  },
  {
    id: 'edmonton-96-dechene',
    name: 'Dechene',
    city: 'Edmonton',
    coordinates: {
      lat: 53.490313,
      lng: -113.636064,
    },
  },
  {
    id: 'edmonton-97-delton',
    name: 'Delton',
    city: 'Edmonton',
    coordinates: {
      lat: 53.578873,
      lng: -113.482449,
    },
  },
  {
    id: 'edmonton-98-delwood',
    name: 'Delwood',
    city: 'Edmonton',
    coordinates: {
      lat: 53.596161,
      lng: -113.455132,
    },
  },
  {
    id: 'edmonton-99-desrochers-area',
    name: 'Desrochers Area',
    city: 'Edmonton',
    coordinates: {
      lat: 53.399851,
      lng: -113.553132,
    },
  },
  {
    id: 'edmonton-100-dominion-industrial',
    name: 'Dominion Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.575744,
      lng: -113.571851,
    },
  },
  {
    id: 'edmonton-101-donsdale',
    name: 'Donsdale',
    city: 'Edmonton',
    coordinates: {
      lat: 53.485789,
      lng: -113.635256,
    },
  },
  {
    id: 'edmonton-102-dovercourt',
    name: 'Dovercourt',
    city: 'Edmonton',
    coordinates: {
      lat: 53.575294,
      lng: -113.559349,
    },
  },
  {
    id: 'edmonton-103-downtown',
    name: 'Downtown',
    city: 'Edmonton',
    coordinates: {
      lat: 53.539766,
      lng: -113.49838,
    },
  },
  {
    id: 'edmonton-104-duggan',
    name: 'Duggan',
    city: 'Edmonton',
    coordinates: {
      lat: 53.470467,
      lng: -113.506078,
    },
  },
  {
    id: 'edmonton-105-dunluce',
    name: 'Dunluce',
    city: 'Edmonton',
    coordinates: {
      lat: 53.621324,
      lng: -113.530194,
    },
  },
  {
    id: 'edmonton-106-eastgate-business-park',
    name: 'Eastgate Business Park',
    city: 'Edmonton',
    coordinates: {
      lat: 53.535052,
      lng: -113.406341,
    },
  },
  {
    id: 'edmonton-107-eastwood',
    name: 'Eastwood',
    city: 'Edmonton',
    coordinates: {
      lat: 53.575943,
      lng: -113.468772,
    },
  },
  {
    id: 'edmonton-108-eaux-claires',
    name: 'Eaux Claires',
    city: 'Edmonton',
    coordinates: {
      lat: 53.621415,
      lng: -113.485812,
    },
  },
  {
    id: 'edmonton-109-ebbers',
    name: 'Ebbers',
    city: 'Edmonton',
    coordinates: {
      lat: 53.610763,
      lng: -113.40195,
    },
  },
  {
    id: 'edmonton-110-edgemont',
    name: 'Edgemont',
    city: 'Edmonton',
    coordinates: {
      lat: 53.472898,
      lng: -113.673174,
    },
  },
  {
    id: 'edmonton-111-edmiston-industrial',
    name: 'Edmiston Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.566742,
      lng: -113.633633,
    },
  },
  {
    id: 'edmonton-112-edmonton-municipal-airport',
    name: 'Edmonton Municipal Airport',
    city: 'Edmonton',
    coordinates: {
      lat: 53.57203,
      lng: -113.516964,
    },
  },
  {
    id: 'edmonton-113-edmonton-northlands',
    name: 'Edmonton Northlands',
    city: 'Edmonton',
    coordinates: {
      lat: 53.568542,
      lng: -113.456408,
    },
  },
  {
    id: 'edmonton-114-edmonton-research-and-development-park',
    name: 'Edmonton Research and Development Park',
    city: 'Edmonton',
    coordinates: {
      lat: 53.446385,
      lng: -113.473031,
    },
  },
  {
    id: 'edmonton-115-ekota',
    name: 'Ekota',
    city: 'Edmonton',
    coordinates: {
      lat: 53.449257,
      lng: -113.442445,
    },
  },
  {
    id: 'edmonton-116-ellerslie',
    name: 'Ellerslie',
    city: 'Edmonton',
    coordinates: {
      lat: 53.428722,
      lng: -113.457648,
    },
  },
  {
    id: 'edmonton-117-ellerslie-industrial',
    name: 'Ellerslie Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.414445,
      lng: -113.488221,
    },
  },
  {
    id: 'edmonton-118-elmwood',
    name: 'Elmwood',
    city: 'Edmonton',
    coordinates: {
      lat: 53.516013,
      lng: -113.605992,
    },
  },
  {
    id: 'edmonton-119-elmwood-park',
    name: 'Elmwood Park',
    city: 'Edmonton',
    coordinates: {
      lat: 53.579681,
      lng: -113.460844,
    },
  },
  {
    id: 'edmonton-120-elsinore',
    name: 'Elsinore',
    city: 'Edmonton',
    coordinates: {
      lat: 53.640799,
      lng: -113.499402,
    },
  },
  {
    id: 'edmonton-121-empire-park',
    name: 'Empire Park',
    city: 'Edmonton',
    coordinates: {
      lat: 53.484699,
      lng: -113.505853,
    },
  },
  {
    id: 'edmonton-122-ermineskin',
    name: 'Ermineskin',
    city: 'Edmonton',
    coordinates: {
      lat: 53.457643,
      lng: -113.505728,
    },
  },
  {
    id: 'edmonton-123-evansdale',
    name: 'Evansdale',
    city: 'Edmonton',
    coordinates: {
      lat: 53.611646,
      lng: -113.479569,
    },
  },
  {
    id: 'edmonton-124-evergreen',
    name: 'Evergreen',
    city: 'Edmonton',
    coordinates: {
      lat: 53.631506,
      lng: -113.350484,
    },
  },
  {
    id: 'edmonton-125-falconer-heights',
    name: 'Falconer Heights',
    city: 'Edmonton',
    coordinates: {
      lat: 53.466859,
      lng: -113.5885,
    },
  },
  {
    id: 'edmonton-126-forest-heights',
    name: 'Forest Heights',
    city: 'Edmonton',
    coordinates: {
      lat: 53.54568,
      lng: -113.450391,
    },
  },
  {
    id: 'edmonton-127-fraser',
    name: 'Fraser',
    city: 'Edmonton',
    coordinates: {
      lat: 53.611096,
      lng: -113.373693,
    },
  },
  {
    id: 'edmonton-128-fulton-place',
    name: 'Fulton Place',
    city: 'Edmonton',
    coordinates: {
      lat: 53.546336,
      lng: -113.427486,
    },
  },
  {
    id: 'edmonton-129-gagnon-estate-industrial',
    name: 'Gagnon Estate Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.580129,
      lng: -113.585748,
    },
  },
  {
    id: 'edmonton-130-gainer-industrial',
    name: 'Gainer Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.515779,
      lng: -113.423801,
    },
  },
  {
    id: 'edmonton-131-gariepy',
    name: 'Gariepy',
    city: 'Edmonton',
    coordinates: {
      lat: 53.493631,
      lng: -113.622782,
    },
  },
  {
    id: 'edmonton-132-garneau',
    name: 'Garneau',
    city: 'Edmonton',
    coordinates: {
      lat: 53.519569,
      lng: -113.513534,
    },
  },
  {
    id: 'edmonton-133-garside-industrial',
    name: 'Garside Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.566839,
      lng: -113.584178,
    },
  },
  {
    id: 'edmonton-134-girard-industrial',
    name: 'Girard Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.511035,
      lng: -113.437858,
    },
  },
  {
    id: 'edmonton-135-glastonbury',
    name: 'Glastonbury',
    city: 'Edmonton',
    coordinates: {
      lat: 53.502828,
      lng: -113.67054,
    },
  },
  {
    id: 'edmonton-136-glengarry',
    name: 'Glengarry',
    city: 'Edmonton',
    coordinates: {
      lat: 53.596044,
      lng: -113.479615,
    },
  },
  {
    id: 'edmonton-137-glenora',
    name: 'Glenora',
    city: 'Edmonton',
    coordinates: {
      lat: 53.544978,
      lng: -113.557042,
    },
  },
  {
    id: 'edmonton-138-glenridding-area',
    name: 'Glenridding Area',
    city: 'Edmonton',
    coordinates: {
      lat: 53.409563,
      lng: -113.608496,
    },
  },
  {
    id: 'edmonton-139-glenwood',
    name: 'Glenwood',
    city: 'Edmonton',
    coordinates: {
      lat: 53.536834,
      lng: -113.602775,
    },
  },
  {
    id: 'edmonton-140-gold-bar',
    name: 'Gold Bar',
    city: 'Edmonton',
    coordinates: {
      lat: 53.548644,
      lng: -113.41212,
    },
  },
  {
    id: 'edmonton-141-goodridge-corners',
    name: 'Goodridge Corners',
    city: 'Edmonton',
    coordinates: {
      lat: 53.641715,
      lng: -113.558845,
    },
  },
  {
    id: 'edmonton-142-gorman',
    name: 'Gorman',
    city: 'Edmonton',
    coordinates: {
      lat: 53.62303,
      lng: -113.389718,
    },
  },
  {
    id: 'edmonton-143-grandview-heights',
    name: 'Grandview Heights',
    city: 'Edmonton',
    coordinates: {
      lat: 53.501248,
      lng: -113.548861,
    },
  },
  {
    id: 'edmonton-144-granville',
    name: 'Granville',
    city: 'Edmonton',
    coordinates: {
      lat: 53.504025,
      lng: -113.682895,
    },
  },
  {
    id: 'edmonton-145-greenfield',
    name: 'Greenfield',
    city: 'Edmonton',
    coordinates: {
      lat: 53.470767,
      lng: -113.527508,
    },
  },
  {
    id: 'edmonton-146-greenview',
    name: 'Greenview',
    city: 'Edmonton',
    coordinates: {
      lat: 53.475648,
      lng: -113.427909,
    },
  },
  {
    id: 'edmonton-147-griesbach',
    name: 'Griesbach',
    city: 'Edmonton',
    coordinates: {
      lat: 53.606909,
      lng: -113.504231,
    },
  },
  {
    id: 'edmonton-148-grovenor',
    name: 'Grovenor',
    city: 'Edmonton',
    coordinates: {
      lat: 53.545133,
      lng: -113.571911,
    },
  },
  {
    id: 'edmonton-149-haddow',
    name: 'Haddow',
    city: 'Edmonton',
    coordinates: {
      lat: 53.454741,
      lng: -113.596486,
    },
  },
  {
    id: 'edmonton-150-hagmann-estate-industrial',
    name: 'Hagmann Estate Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.582179,
      lng: -113.544954,
    },
  },
  {
    id: 'edmonton-151-hairsine',
    name: 'Hairsine',
    city: 'Edmonton',
    coordinates: {
      lat: 53.603842,
      lng: -113.390922,
    },
  },
  {
    id: 'edmonton-152-hawin-park-estate-industrial',
    name: 'Hawin Park Estate Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.574995,
      lng: -113.596572,
    },
  },
  {
    id: 'edmonton-153-hawks-ridge',
    name: 'Hawks Ridge',
    city: 'Edmonton',
    coordinates: {
      lat: 53.589092,
      lng: -113.70147,
    },
  },
  {
    id: 'edmonton-154-hays-ridge-area',
    name: 'Hays Ridge Area',
    city: 'Edmonton',
    coordinates: {
      lat: 53.419887,
      lng: -113.5746,
    },
  },
  {
    id: 'edmonton-155-hazeldean',
    name: 'Hazeldean',
    city: 'Edmonton',
    coordinates: {
      lat: 53.504199,
      lng: -113.477889,
    },
  },
  {
    id: 'edmonton-156-henderson-estates',
    name: 'Henderson Estates',
    city: 'Edmonton',
    coordinates: {
      lat: 53.468376,
      lng: -113.598213,
    },
  },
  {
    id: 'edmonton-157-heritage-valley-area',
    name: 'Heritage Valley Area',
    city: 'Edmonton',
    coordinates: {
      lat: 53.416553,
      lng: -113.553157,
    },
  },
  {
    id: 'edmonton-158-heritage-valley-area-east',
    name: 'Heritage Valley Area East',
    city: 'Edmonton',
    coordinates: {
      lat: 53.406484,
      lng: -113.509386,
    },
  },
  {
    id: 'edmonton-159-heritage-valley-town-centre-area',
    name: 'Heritage Valley Town Centre Area',
    city: 'Edmonton',
    coordinates: {
      lat: 53.407673,
      lng: -113.542933,
    },
  },
  {
    id: 'edmonton-160-high-park',
    name: 'High Park',
    city: 'Edmonton',
    coordinates: {
      lat: 53.555003,
      lng: -113.584199,
    },
  },
  {
    id: 'edmonton-161-high-park-industrial',
    name: 'High Park Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.561928,
      lng: -113.584236,
    },
  },
  {
    id: 'edmonton-162-highlands',
    name: 'Highlands',
    city: 'Edmonton',
    coordinates: {
      lat: 53.566339,
      lng: -113.430286,
    },
  },
  {
    id: 'edmonton-163-hillview',
    name: 'Hillview',
    city: 'Edmonton',
    coordinates: {
      lat: 53.469777,
      lng: -113.42706,
    },
  },
  {
    id: 'edmonton-164-hodgson',
    name: 'Hodgson',
    city: 'Edmonton',
    coordinates: {
      lat: 53.457686,
      lng: -113.559806,
    },
  },
  {
    id: 'edmonton-165-hollick-kenyon',
    name: 'Hollick-Kenyon',
    city: 'Edmonton',
    coordinates: {
      lat: 53.622319,
      lng: -113.422242,
    },
  },
  {
    id: 'edmonton-166-holyrood',
    name: 'Holyrood',
    city: 'Edmonton',
    coordinates: {
      lat: 53.531141,
      lng: -113.450189,
    },
  },
  {
    id: 'edmonton-167-homesteader',
    name: 'Homesteader',
    city: 'Edmonton',
    coordinates: {
      lat: 53.58491,
      lng: -113.406513,
    },
  },
  {
    id: 'edmonton-168-hudson',
    name: 'Hudson',
    city: 'Edmonton',
    coordinates: {
      lat: 53.604382,
      lng: -113.553143,
    },
  },
  {
    id: 'edmonton-169-huff-bremner-estate-industrial',
    name: 'Huff Bremner Estate Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.564719,
      lng: -113.571895,
    },
  },
  {
    id: 'edmonton-170-idylwylde',
    name: 'Idylwylde',
    city: 'Edmonton',
    coordinates: {
      lat: 53.521608,
      lng: -113.449114,
    },
  },
  {
    id: 'edmonton-171-industrial-heights',
    name: 'Industrial Heights',
    city: 'Edmonton',
    coordinates: {
      lat: 53.581004,
      lng: -113.437435,
    },
  },
  {
    id: 'edmonton-172-inglewood',
    name: 'Inglewood',
    city: 'Edmonton',
    coordinates: {
      lat: 53.564628,
      lng: -113.540843,
    },
  },
  {
    id: 'edmonton-173-jackson-heights',
    name: 'Jackson Heights',
    city: 'Edmonton',
    coordinates: {
      lat: 53.481214,
      lng: -113.411229,
    },
  },
  {
    id: 'edmonton-174-jamieson-place',
    name: 'Jamieson Place',
    city: 'Edmonton',
    coordinates: {
      lat: 53.488695,
      lng: -113.64903,
    },
  },
  {
    id: 'edmonton-175-jasper-park',
    name: 'Jasper Park',
    city: 'Edmonton',
    coordinates: {
      lat: 53.522183,
      lng: -113.584103,
    },
  },
  {
    id: 'edmonton-176-kameyosek',
    name: 'Kameyosek',
    city: 'Edmonton',
    coordinates: {
      lat: 53.461738,
      lng: -113.441962,
    },
  },
  {
    id: 'edmonton-177-keheewin',
    name: 'Keheewin',
    city: 'Edmonton',
    coordinates: {
      lat: 53.450419,
      lng: -113.504512,
    },
  },
  {
    id: 'edmonton-178-kenilworth',
    name: 'Kenilworth',
    city: 'Edmonton',
    coordinates: {
      lat: 53.521718,
      lng: -113.431122,
    },
  },
  {
    id: 'edmonton-179-kennedale-industrial',
    name: 'Kennedale Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.590626,
      lng: -113.423651,
    },
  },
  {
    id: 'edmonton-180-kensington',
    name: 'Kensington',
    city: 'Edmonton',
    coordinates: {
      lat: 53.595668,
      lng: -113.528922,
    },
  },
  {
    id: 'edmonton-181-kernohan',
    name: 'Kernohan',
    city: 'Edmonton',
    coordinates: {
      lat: 53.593095,
      lng: -113.383899,
    },
  },
  {
    id: 'edmonton-182-keswick-area',
    name: 'Keswick Area',
    city: 'Edmonton',
    coordinates: {
      lat: 53.417757,
      lng: -113.635818,
    },
  },
  {
    id: 'edmonton-183-kildare',
    name: 'Kildare',
    city: 'Edmonton',
    coordinates: {
      lat: 53.602759,
      lng: -113.455154,
    },
  },
  {
    id: 'edmonton-184-kilkenny',
    name: 'Kilkenny',
    city: 'Edmonton',
    coordinates: {
      lat: 53.610349,
      lng: -113.455119,
    },
  },
  {
    id: 'edmonton-185-killarney',
    name: 'Killarney',
    city: 'Edmonton',
    coordinates: {
      lat: 53.588019,
      lng: -113.479573,
    },
  },
  {
    id: 'edmonton-186-king-edward-park',
    name: 'King Edward Park',
    city: 'Edmonton',
    coordinates: {
      lat: 53.51561,
      lng: -113.452132,
    },
  },
  {
    id: 'edmonton-187-kiniski-gardens',
    name: 'Kiniski Gardens',
    city: 'Edmonton',
    coordinates: {
      lat: 53.476024,
      lng: -113.403226,
    },
  },
  {
    id: 'edmonton-188-kinokamau-plains-area',
    name: 'Kinokamau Plains Area',
    city: 'Edmonton',
    coordinates: {
      lat: 53.585173,
      lng: -113.620516,
    },
  },
  {
    id: 'edmonton-189-kirkness',
    name: 'Kirkness',
    city: 'Edmonton',
    coordinates: {
      lat: 53.610034,
      lng: -113.389933,
    },
  },
  {
    id: 'edmonton-190-klarvatten',
    name: 'Klarvatten',
    city: 'Edmonton',
    coordinates: {
      lat: 53.637411,
      lng: -113.47319,
    },
  },
  {
    id: 'edmonton-191-la-perle',
    name: 'La Perle',
    city: 'Edmonton',
    coordinates: {
      lat: 53.533106,
      lng: -113.640703,
    },
  },
  {
    id: 'edmonton-192-lago-lindo',
    name: 'Lago Lindo',
    city: 'Edmonton',
    coordinates: {
      lat: 53.635679,
      lng: -113.485897,
    },
  },
  {
    id: 'edmonton-193-lambton-industrial',
    name: 'Lambton Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.522256,
      lng: -113.413856,
    },
  },
  {
    id: 'edmonton-194-lansdowne',
    name: 'Lansdowne',
    city: 'Edmonton',
    coordinates: {
      lat: 53.486587,
      lng: -113.545978,
    },
  },
  {
    id: 'edmonton-195-larkspur',
    name: 'Larkspur',
    city: 'Edmonton',
    coordinates: {
      lat: 53.478797,
      lng: -113.381218,
    },
  },
  {
    id: 'edmonton-196-lauderdale',
    name: 'Lauderdale',
    city: 'Edmonton',
    coordinates: {
      lat: 53.588265,
      lng: -113.504259,
    },
  },
  {
    id: 'edmonton-197-laurel',
    name: 'Laurel',
    city: 'Edmonton',
    coordinates: {
      lat: 53.445948,
      lng: -113.381469,
    },
  },
  {
    id: 'edmonton-198-laurier-heights',
    name: 'Laurier Heights',
    city: 'Edmonton',
    coordinates: {
      lat: 53.514228,
      lng: -113.569332,
    },
  },
  {
    id: 'edmonton-199-lee-ridge',
    name: 'Lee Ridge',
    city: 'Edmonton',
    coordinates: {
      lat: 53.469646,
      lng: -113.444383,
    },
  },
  {
    id: 'edmonton-200-leger',
    name: 'Leger',
    city: 'Edmonton',
    coordinates: {
      lat: 53.458118,
      lng: -113.577421,
    },
  },
  {
    id: 'edmonton-201-lendrum-place',
    name: 'Lendrum Place',
    city: 'Edmonton',
    coordinates: {
      lat: 53.493327,
      lng: -113.522806,
    },
  },
  {
    id: 'edmonton-202-lewis-farms-industrial',
    name: 'Lewis Farms Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.537131,
      lng: -113.682863,
    },
  },
  {
    id: 'edmonton-203-lorelei',
    name: 'Lorelei',
    city: 'Edmonton',
    coordinates: {
      lat: 53.624768,
      lng: -113.504327,
    },
  },
  {
    id: 'edmonton-204-lymburn',
    name: 'Lymburn',
    city: 'Edmonton',
    coordinates: {
      lat: 53.507547,
      lng: -113.642294,
    },
  },
  {
    id: 'edmonton-205-lynnwood',
    name: 'Lynnwood',
    city: 'Edmonton',
    coordinates: {
      lat: 53.515692,
      lng: -113.589909,
    },
  },
  {
    id: 'edmonton-206-macewan',
    name: 'MacEwan',
    city: 'Edmonton',
    coordinates: {
      lat: 53.428728,
      lng: -113.526951,
    },
  },
  {
    id: 'edmonton-207-mactaggart',
    name: 'Mactaggart',
    city: 'Edmonton',
    coordinates: {
      lat: 53.43818,
      lng: -113.560843,
    },
  },
  {
    id: 'edmonton-208-magrath-heights',
    name: 'Magrath Heights',
    city: 'Edmonton',
    coordinates: {
      lat: 53.447555,
      lng: -113.556731,
    },
  },
  {
    id: 'edmonton-209-malmo-plains',
    name: 'Malmo Plains',
    city: 'Edmonton',
    coordinates: {
      lat: 53.486919,
      lng: -113.528964,
    },
  },
  {
    id: 'edmonton-210-maple',
    name: 'Maple',
    city: 'Edmonton',
    coordinates: {
      lat: 53.472216,
      lng: -113.350667,
    },
  },
  {
    id: 'edmonton-211-maple-ridge',
    name: 'Maple Ridge',
    city: 'Edmonton',
    coordinates: {
      lat: 53.501759,
      lng: -113.363059,
    },
  },
  {
    id: 'edmonton-212-maple-ridge-industrial',
    name: 'Maple Ridge Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.498333,
      lng: -113.351036,
    },
  },
  {
    id: 'edmonton-213-matt-berry',
    name: 'Matt Berry',
    city: 'Edmonton',
    coordinates: {
      lat: 53.622397,
      lng: -113.436799,
    },
  },
  {
    id: 'edmonton-214-mayfield',
    name: 'Mayfield',
    city: 'Edmonton',
    coordinates: {
      lat: 53.555442,
      lng: -113.597999,
    },
  },
  {
    id: 'edmonton-215-mayliewan',
    name: 'Mayliewan',
    city: 'Edmonton',
    coordinates: {
      lat: 53.622214,
      lng: -113.461085,
    },
  },
  {
    id: 'edmonton-216-mcarthur-industrial',
    name: 'McArthur Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.591603,
      lng: -113.564615,
    },
  },
  {
    id: 'edmonton-217-mccauley',
    name: 'McCauley',
    city: 'Edmonton',
    coordinates: {
      lat: 53.554665,
      lng: -113.485063,
    },
  },
  {
    id: 'edmonton-218-mcconachie-area',
    name: 'McConachie Area',
    city: 'Edmonton',
    coordinates: {
      lat: 53.636361,
      lng: -113.431317,
    },
  },
  {
    id: 'edmonton-219-mcintyre-industrial',
    name: 'McIntyre Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.489626,
      lng: -113.454913,
    },
  },
  {
    id: 'edmonton-220-mckernan',
    name: 'McKernan',
    city: 'Edmonton',
    coordinates: {
      lat: 53.512594,
      lng: -113.520442,
    },
  },
  {
    id: 'edmonton-221-mcleod',
    name: 'McLeod',
    city: 'Edmonton',
    coordinates: {
      lat: 53.610291,
      lng: -113.436672,
    },
  },
  {
    id: 'edmonton-222-mcnamara-industrial',
    name: 'McNamara Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.554617,
      lng: -113.621277,
    },
  },
  {
    id: 'edmonton-223-mcqueen',
    name: 'McQueen',
    city: 'Edmonton',
    coordinates: {
      lat: 53.555003,
      lng: -113.571842,
    },
  },
  {
    id: 'edmonton-224-meadowlark-park',
    name: 'Meadowlark Park',
    city: 'Edmonton',
    coordinates: {
      lat: 53.525797,
      lng: -113.596553,
    },
  },
  {
    id: 'edmonton-225-meadows-area',
    name: 'Meadows Area',
    city: 'Edmonton',
    coordinates: {
      lat: 53.452192,
      lng: -113.358124,
    },
  },
  {
    id: 'edmonton-226-menisa',
    name: 'Menisa',
    city: 'Edmonton',
    coordinates: {
      lat: 53.442146,
      lng: -113.447352,
    },
  },
  {
    id: 'edmonton-227-meyokumin',
    name: 'Meyokumin',
    city: 'Edmonton',
    coordinates: {
      lat: 53.450593,
      lng: -113.427207,
    },
  },
  {
    id: 'edmonton-228-meyonohk',
    name: 'Meyonohk',
    city: 'Edmonton',
    coordinates: {
      lat: 53.45457,
      lng: -113.457252,
    },
  },
  {
    id: 'edmonton-229-michaels-park',
    name: 'Michaels Park',
    city: 'Edmonton',
    coordinates: {
      lat: 53.479317,
      lng: -113.447306,
    },
  },
  {
    id: 'edmonton-230-mill-creek-ravine-north',
    name: 'Mill Creek Ravine North',
    city: 'Edmonton',
    coordinates: {
      lat: 53.526981,
      lng: -113.477923,
    },
  },
  {
    id: 'edmonton-231-mill-creek-ravine-south',
    name: 'Mill Creek Ravine South',
    city: 'Edmonton',
    coordinates: {
      lat: 53.509087,
      lng: -113.463525,
    },
  },
  {
    id: 'edmonton-232-mill-woods-golf-course',
    name: 'Mill Woods Golf Course',
    city: 'Edmonton',
    coordinates: {
      lat: 53.483365,
      lng: -113.430418,
    },
  },
  {
    id: 'edmonton-233-mill-woods-park',
    name: 'Mill Woods Park',
    city: 'Edmonton',
    coordinates: {
      lat: 53.454769,
      lng: -113.441359,
    },
  },
  {
    id: 'edmonton-234-mill-woods-town-centre',
    name: 'Mill Woods Town Centre',
    city: 'Edmonton',
    coordinates: {
      lat: 53.455776,
      lng: -113.427425,
    },
  },
  {
    id: 'edmonton-235-miller',
    name: 'Miller',
    city: 'Edmonton',
    coordinates: {
      lat: 53.608947,
      lng: -113.413115,
    },
  },
  {
    id: 'edmonton-236-minchau',
    name: 'Minchau',
    city: 'Edmonton',
    coordinates: {
      lat: 53.469883,
      lng: -113.412765,
    },
  },
  {
    id: 'edmonton-237-mistatim-industrial',
    name: 'Mistatim Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.59688,
      lng: -113.599821,
    },
  },
  {
    id: 'edmonton-238-mitchell-industrial',
    name: 'Mitchell Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.575163,
      lng: -113.584196,
    },
  },
  {
    id: 'edmonton-239-montrose',
    name: 'Montrose',
    city: 'Edmonton',
    coordinates: {
      lat: 53.575165,
      lng: -113.442202,
    },
  },
  {
    id: 'edmonton-240-morin-industrial',
    name: 'Morin Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.544296,
      lng: -113.633601,
    },
  },
  {
    id: 'edmonton-241-morris-industrial',
    name: 'Morris Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.520064,
      lng: -113.403316,
    },
  },
  {
    id: 'edmonton-242-newton',
    name: 'Newton',
    city: 'Edmonton',
    coordinates: {
      lat: 53.576172,
      lng: -113.424533,
    },
  },
  {
    id: 'edmonton-243-north-glenora',
    name: 'North Glenora',
    city: 'Edmonton',
    coordinates: {
      lat: 53.554941,
      lng: -113.558265,
    },
  },
  {
    id: 'edmonton-244-northmount',
    name: 'Northmount',
    city: 'Edmonton',
    coordinates: {
      lat: 53.602536,
      lng: -113.47964,
    },
  },
  {
    id: 'edmonton-245-norwester-industrial',
    name: 'Norwester Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.566992,
      lng: -113.608886,
    },
  },
  {
    id: 'edmonton-246-ogilvie-ridge',
    name: 'Ogilvie Ridge',
    city: 'Edmonton',
    coordinates: {
      lat: 53.464912,
      lng: -113.567083,
    },
  },
  {
    id: 'edmonton-247-oleskiw',
    name: 'Oleskiw',
    city: 'Edmonton',
    coordinates: {
      lat: 53.497333,
      lng: -113.608766,
    },
  },
  {
    id: 'edmonton-248-oliver',
    name: 'Oliver',
    city: 'Edmonton',
    coordinates: {
      lat: 53.542233,
      lng: -113.523996,
    },
    aliases: ['Wîhkwêntôwin', 'Wihkwentowin'],
  },
  {
    id: 'edmonton-249-ormsby-place',
    name: 'Ormsby Place',
    city: 'Edmonton',
    coordinates: {
      lat: 53.499093,
      lng: -113.642758,
    },
  },
  {
    id: 'edmonton-250-ottewell',
    name: 'Ottewell',
    city: 'Edmonton',
    coordinates: {
      lat: 53.531411,
      lng: -113.430746,
    },
  },
  {
    id: 'edmonton-251-overlanders',
    name: 'Overlanders',
    city: 'Edmonton',
    coordinates: {
      lat: 53.581122,
      lng: -113.388191,
    },
  },
  {
    id: 'edmonton-252-oxford',
    name: 'Oxford',
    city: 'Edmonton',
    coordinates: {
      lat: 53.621665,
      lng: -113.547338,
    },
  },
  {
    id: 'edmonton-253-ozerna',
    name: 'Ozerna',
    city: 'Edmonton',
    coordinates: {
      lat: 53.622214,
      lng: -113.44882,
    },
  },
  {
    id: 'edmonton-254-papaschase-industrial',
    name: 'Papaschase Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.484299,
      lng: -113.478646,
    },
  },
  {
    id: 'edmonton-255-parkallen',
    name: 'Parkallen',
    city: 'Edmonton',
    coordinates: {
      lat: 53.503425,
      lng: -113.517463,
    },
  },
  {
    id: 'edmonton-256-parkdale',
    name: 'Parkdale',
    city: 'Edmonton',
    coordinates: {
      lat: 53.565346,
      lng: -113.47156,
    },
  },
  {
    id: 'edmonton-257-parkview',
    name: 'Parkview',
    city: 'Edmonton',
    coordinates: {
      lat: 53.524181,
      lng: -113.56799,
    },
  },
  {
    id: 'edmonton-258-parsons-industrial',
    name: 'Parsons Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.459768,
      lng: -113.479382,
    },
  },
  {
    id: 'edmonton-259-patricia-heights',
    name: 'Patricia Heights',
    city: 'Edmonton',
    coordinates: {
      lat: 53.506679,
      lng: -113.593232,
    },
  },
  {
    id: 'edmonton-260-pembina',
    name: 'Pembina',
    city: 'Edmonton',
    coordinates: {
      lat: 53.603199,
      lng: -113.542846,
    },
  },
  {
    id: 'edmonton-261-place-larue',
    name: 'Place LaRue',
    city: 'Edmonton',
    coordinates: {
      lat: 53.538833,
      lng: -113.633326,
    },
  },
  {
    id: 'edmonton-262-pleasantview',
    name: 'Pleasantview',
    city: 'Edmonton',
    coordinates: {
      lat: 53.493142,
      lng: -113.507118,
    },
  },
  {
    id: 'edmonton-263-pollard-meadows',
    name: 'Pollard Meadows',
    city: 'Edmonton',
    coordinates: {
      lat: 53.449199,
      lng: -113.413123,
    },
  },
  {
    id: 'edmonton-264-potter-greens',
    name: 'Potter Greens',
    city: 'Edmonton',
    coordinates: {
      lat: 53.518213,
      lng: -113.672588,
    },
  },
  {
    id: 'edmonton-265-poundmaker-industrial',
    name: 'Poundmaker Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.552495,
      lng: -113.645872,
    },
  },
  {
    id: 'edmonton-266-prince-charles',
    name: 'Prince Charles',
    city: 'Edmonton',
    coordinates: {
      lat: 53.575901,
      lng: -113.536002,
    },
  },
  {
    id: 'edmonton-267-prince-rupert',
    name: 'Prince Rupert',
    city: 'Edmonton',
    coordinates: {
      lat: 53.5645,
      lng: -113.524006,
    },
  },
  {
    id: 'edmonton-268-pylypow-industrial',
    name: 'Pylypow Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.496992,
      lng: -113.40599,
    },
  },
  {
    id: 'edmonton-269-queen-alexandra',
    name: 'Queen Alexandra',
    city: 'Edmonton',
    coordinates: {
      lat: 53.512003,
      lng: -113.504813,
    },
  },
  {
    id: 'edmonton-270-queen-mary-park',
    name: 'Queen Mary Park',
    city: 'Edmonton',
    coordinates: {
      lat: 53.553487,
      lng: -113.519654,
    },
  },
  {
    id: 'edmonton-271-quesnell-heights',
    name: 'Quesnell Heights',
    city: 'Edmonton',
    coordinates: {
      lat: 53.509441,
      lng: -113.57355,
    },
  },
  {
    id: 'edmonton-272-rampart-industrial',
    name: 'Rampart Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.613946,
      lng: -113.5779,
    },
  },
  {
    id: 'edmonton-273-ramsay-heights',
    name: 'Ramsay Heights',
    city: 'Edmonton',
    coordinates: {
      lat: 53.48328,
      lng: -113.579044,
    },
  },
  {
    id: 'edmonton-274-rapperswill',
    name: 'Rapperswill',
    city: 'Edmonton',
    coordinates: {
      lat: 53.635639,
      lng: -113.535029,
    },
  },
  {
    id: 'edmonton-275-rhatigan-ridge',
    name: 'Rhatigan Ridge',
    city: 'Edmonton',
    coordinates: {
      lat: 53.475128,
      lng: -113.587901,
    },
  },
  {
    id: 'edmonton-276-richfield',
    name: 'Richfield',
    city: 'Edmonton',
    coordinates: {
      lat: 53.469646,
      lng: -113.458662,
    },
  },
  {
    id: 'edmonton-277-richford',
    name: 'Richford',
    city: 'Edmonton',
    coordinates: {
      lat: 53.427209,
      lng: -113.507373,
    },
  },
  {
    id: 'edmonton-278-rideau-park',
    name: 'Rideau Park',
    city: 'Edmonton',
    coordinates: {
      lat: 53.479255,
      lng: -113.505929,
    },
  },
  {
    id: 'edmonton-279-rio-terrace',
    name: 'Rio Terrace',
    city: 'Edmonton',
    coordinates: {
      lat: 53.507321,
      lng: -113.584538,
    },
  },
  {
    id: 'edmonton-280-ritchie',
    name: 'Ritchie',
    city: 'Edmonton',
    coordinates: {
      lat: 53.513466,
      lng: -113.482742,
    },
  },
  {
    id: 'edmonton-281-river-valley-cameron',
    name: 'River Valley Cameron',
    city: 'Edmonton',
    coordinates: {
      lat: 53.472353,
      lng: -113.616075,
    },
  },
  {
    id: 'edmonton-282-river-valley-capitol-hill',
    name: 'River Valley Capitol Hill',
    city: 'Edmonton',
    coordinates: {
      lat: 53.52708,
      lng: -113.557503,
    },
  },
  {
    id: 'edmonton-283-river-valley-fort-edmonton',
    name: 'River Valley Fort Edmonton',
    city: 'Edmonton',
    coordinates: {
      lat: 53.501011,
      lng: -113.580799,
    },
  },
  {
    id: 'edmonton-284-river-valley-glenora',
    name: 'River Valley Glenora',
    city: 'Edmonton',
    coordinates: {
      lat: 53.542618,
      lng: -113.549021,
    },
  },
  {
    id: 'edmonton-285-river-valley-gold-bar',
    name: 'River Valley Gold Bar',
    city: 'Edmonton',
    coordinates: {
      lat: 53.552277,
      lng: -113.437567,
    },
  },
  {
    id: 'edmonton-286-river-valley-hermitage',
    name: 'River Valley Hermitage',
    city: 'Edmonton',
    coordinates: {
      lat: 53.591419,
      lng: -113.408473,
    },
  },
  {
    id: 'edmonton-287-river-valley-highlands',
    name: 'River Valley Highlands',
    city: 'Edmonton',
    coordinates: {
      lat: 53.560069,
      lng: -113.436175,
    },
  },
  {
    id: 'edmonton-288-river-valley-kinnaird',
    name: 'River Valley Kinnaird',
    city: 'Edmonton',
    coordinates: {
      lat: 53.55419,
      lng: -113.469601,
    },
  },
  {
    id: 'edmonton-289-river-valley-laurier',
    name: 'River Valley Laurier',
    city: 'Edmonton',
    coordinates: {
      lat: 53.51057,
      lng: -113.553337,
    },
  },
  {
    id: 'edmonton-290-river-valley-lessard-north',
    name: 'River Valley Lessard North',
    city: 'Edmonton',
    coordinates: {
      lat: 53.502227,
      lng: -113.60118,
    },
  },
  {
    id: 'edmonton-291-river-valley-mayfair',
    name: 'River Valley Mayfair',
    city: 'Edmonton',
    coordinates: {
      lat: 53.525059,
      lng: -113.546765,
    },
  },
  {
    id: 'edmonton-292-river-valley-oleskiw',
    name: 'River Valley Oleskiw',
    city: 'Edmonton',
    coordinates: {
      lat: 53.488805,
      lng: -113.601305,
    },
  },
  {
    id: 'edmonton-293-river-valley-riverside',
    name: 'River Valley Riverside',
    city: 'Edmonton',
    coordinates: {
      lat: 53.54851,
      lng: -113.463424,
    },
  },
  {
    id: 'edmonton-294-river-valley-rundle',
    name: 'River Valley Rundle',
    city: 'Edmonton',
    coordinates: {
      lat: 53.562573,
      lng: -113.381663,
    },
  },
  {
    id: 'edmonton-295-river-valley-terwillegar',
    name: 'River Valley Terwillegar',
    city: 'Edmonton',
    coordinates: {
      lat: 53.476876,
      lng: -113.612665,
    },
  },
  {
    id: 'edmonton-296-river-valley-victoria',
    name: 'River Valley Victoria',
    city: 'Edmonton',
    coordinates: {
      lat: 53.534979,
      lng: -113.523675,
    },
  },
  {
    id: 'edmonton-297-river-valley-walterdale',
    name: 'River Valley Walterdale',
    city: 'Edmonton',
    coordinates: {
      lat: 53.53055,
      lng: -113.5196,
    },
  },
  {
    id: 'edmonton-298-river-valley-whitemud',
    name: 'River Valley Whitemud',
    city: 'Edmonton',
    coordinates: {
      lat: 53.505007,
      lng: -113.550701,
    },
  },
  {
    id: 'edmonton-299-river-valley-windermere',
    name: 'River Valley Windermere',
    city: 'Edmonton',
    coordinates: {
      lat: 53.44157,
      lng: -113.636018,
    },
  },
  {
    id: 'edmonton-300-riverdale',
    name: 'Riverdale',
    city: 'Edmonton',
    coordinates: {
      lat: 53.544118,
      lng: -113.469011,
    },
  },
  {
    id: 'edmonton-301-roper-industrial',
    name: 'Roper Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.496528,
      lng: -113.430428,
    },
  },
  {
    id: 'edmonton-302-rosedale-industrial',
    name: 'Rosedale Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.498501,
      lng: -113.478798,
    },
  },
  {
    id: 'edmonton-303-rosenthal',
    name: 'Rosenthal',
    city: 'Edmonton',
    coordinates: {
      lat: 53.519374,
      lng: -113.701211,
    },
  },
  {
    id: 'edmonton-304-rossdale',
    name: 'Rossdale',
    city: 'Edmonton',
    coordinates: {
      lat: 53.532928,
      lng: -113.4958,
    },
  },
  {
    id: 'edmonton-305-rosslyn',
    name: 'Rosslyn',
    city: 'Edmonton',
    coordinates: {
      lat: 53.595843,
      lng: -113.504289,
    },
  },
  {
    id: 'edmonton-306-royal-gardens',
    name: 'Royal Gardens',
    city: 'Edmonton',
    coordinates: {
      lat: 53.479159,
      lng: -113.527904,
    },
  },
  {
    id: 'edmonton-307-rundle-heights',
    name: 'Rundle Heights',
    city: 'Edmonton',
    coordinates: {
      lat: 53.563648,
      lng: -113.391341,
    },
  },
  {
    id: 'edmonton-308-rural-north-east-horse-hill',
    name: 'Rural North East Horse Hill',
    city: 'Edmonton',
    coordinates: {
      lat: 53.664274,
      lng: -113.32952,
    },
  },
  {
    id: 'edmonton-309-rural-north-east-north-sturgeon',
    name: 'Rural North East North Sturgeon',
    city: 'Edmonton',
    coordinates: {
      lat: 53.67866,
      lng: -113.379729,
    },
  },
  {
    id: 'edmonton-310-rural-north-east-south-sturgeon',
    name: 'Rural North East South Sturgeon',
    city: 'Edmonton',
    coordinates: {
      lat: 53.638542,
      lng: -113.331589,
    },
  },
  {
    id: 'edmonton-311-rural-south-east',
    name: 'Rural South East',
    city: 'Edmonton',
    coordinates: {
      lat: 53.420462,
      lng: -113.381396,
    },
  },
  {
    id: 'edmonton-312-rural-west',
    name: 'Rural West',
    city: 'Edmonton',
    coordinates: {
      lat: 53.436488,
      lng: -113.666208,
    },
  },
  {
    id: 'edmonton-313-rural-west-big-lake',
    name: 'Rural West Big Lake',
    city: 'Edmonton',
    coordinates: {
      lat: 53.577444,
      lng: -113.689756,
    },
  },
  {
    id: 'edmonton-314-rutherford',
    name: 'Rutherford',
    city: 'Edmonton',
    coordinates: {
      lat: 53.41677,
      lng: -113.529785,
    },
  },
  {
    id: 'edmonton-315-sakaw',
    name: 'Sakaw',
    city: 'Edmonton',
    coordinates: {
      lat: 53.441992,
      lng: -113.428825,
    },
  },
  {
    id: 'edmonton-316-satoo',
    name: 'Satoo',
    city: 'Edmonton',
    coordinates: {
      lat: 53.446486,
      lng: -113.458933,
    },
  },
  {
    id: 'edmonton-317-schonsee',
    name: 'Schonsee',
    city: 'Edmonton',
    coordinates: {
      lat: 53.632905,
      lng: -113.455144,
    },
  },
  {
    id: 'edmonton-318-secord',
    name: 'Secord',
    city: 'Edmonton',
    coordinates: {
      lat: 53.53454,
      lng: -113.701357,
    },
  },
  {
    id: 'edmonton-319-sheffield-industrial',
    name: 'Sheffield Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.561913,
      lng: -113.596593,
    },
  },
  {
    id: 'edmonton-320-sherbrooke',
    name: 'Sherbrooke',
    city: 'Edmonton',
    coordinates: {
      lat: 53.575434,
      lng: -113.547188,
    },
  },
  {
    id: 'edmonton-321-sherwood',
    name: 'Sherwood',
    city: 'Edmonton',
    coordinates: {
      lat: 53.528787,
      lng: -113.584143,
    },
  },
  {
    id: 'edmonton-322-sifton-park',
    name: 'Sifton Park',
    city: 'Edmonton',
    coordinates: {
      lat: 53.594437,
      lng: -113.408434,
    },
  },
  {
    id: 'edmonton-323-silver-berry',
    name: 'Silver Berry',
    city: 'Edmonton',
    coordinates: {
      lat: 53.461346,
      lng: -113.381405,
    },
  },
  {
    id: 'edmonton-324-skyrattler',
    name: 'Skyrattler',
    city: 'Edmonton',
    coordinates: {
      lat: 53.450345,
      lng: -113.522876,
    },
  },
  {
    id: 'edmonton-325-south-edmonton-common',
    name: 'South Edmonton Common',
    city: 'Edmonton',
    coordinates: {
      lat: 53.446803,
      lng: -113.486152,
    },
  },
  {
    id: 'edmonton-326-south-terwillegar',
    name: 'South Terwillegar',
    city: 'Edmonton',
    coordinates: {
      lat: 53.440433,
      lng: -113.57899,
    },
  },
  {
    id: 'edmonton-327-southeast-industrial',
    name: 'Southeast Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.499847,
      lng: -113.381458,
    },
  },
  {
    id: 'edmonton-328-spruce-avenue',
    name: 'Spruce Avenue',
    city: 'Edmonton',
    coordinates: {
      lat: 53.564783,
      lng: -113.49933,
    },
  },
  {
    id: 'edmonton-329-starling',
    name: 'Starling',
    city: 'Edmonton',
    coordinates: {
      lat: 53.58869,
      lng: -113.657904,
    },
  },
  {
    id: 'edmonton-330-steinhauer',
    name: 'Steinhauer',
    city: 'Edmonton',
    coordinates: {
      lat: 53.464661,
      lng: -113.505969,
    },
  },
  {
    id: 'edmonton-331-stewart-greens',
    name: 'Stewart Greens',
    city: 'Edmonton',
    coordinates: {
      lat: 53.537573,
      lng: -113.670534,
    },
  },
  {
    id: 'edmonton-332-stone-industrial',
    name: 'Stone Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.545007,
      lng: -113.621664,
    },
  },
  {
    id: 'edmonton-333-strathcona',
    name: 'Strathcona',
    city: 'Edmonton',
    coordinates: {
      lat: 53.526772,
      lng: -113.48512,
    },
    aliases: ['Old Strathcona'],
  },
  {
    id: 'edmonton-334-strathcona-industrial-park',
    name: 'Strathcona Industrial Park',
    city: 'Edmonton',
    coordinates: {
      lat: 53.473898,
      lng: -113.47878,
    },
  },
  {
    id: 'edmonton-335-strathcona-junction',
    name: 'Strathcona Junction',
    city: 'Edmonton',
    coordinates: {
      lat: 53.50881,
      lng: -113.495409,
    },
  },
  {
    id: 'edmonton-336-strathearn',
    name: 'Strathearn',
    city: 'Edmonton',
    coordinates: {
      lat: 53.531084,
      lng: -113.463866,
    },
  },
  {
    id: 'edmonton-337-suder-greens',
    name: 'Suder Greens',
    city: 'Edmonton',
    coordinates: {
      lat: 53.524771,
      lng: -113.677278,
    },
  },
  {
    id: 'edmonton-338-summerlea',
    name: 'Summerlea',
    city: 'Edmonton',
    coordinates: {
      lat: 53.525912,
      lng: -113.622636,
    },
  },
  {
    id: 'edmonton-339-summerside',
    name: 'Summerside',
    city: 'Edmonton',
    coordinates: {
      lat: 53.417777,
      lng: -113.46112,
    },
  },
  {
    id: 'edmonton-340-sunwapta-industrial',
    name: 'Sunwapta Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.544812,
      lng: -113.645944,
    },
  },
  {
    id: 'edmonton-341-sweet-grass',
    name: 'Sweet Grass',
    city: 'Edmonton',
    coordinates: {
      lat: 53.464141,
      lng: -113.527575,
    },
  },
  {
    id: 'edmonton-342-tamarack',
    name: 'Tamarack',
    city: 'Edmonton',
    coordinates: {
      lat: 53.468585,
      lng: -113.361515,
    },
  },
  {
    id: 'edmonton-343-tawa',
    name: 'Tawa',
    city: 'Edmonton',
    coordinates: {
      lat: 53.46168,
      lng: -113.427682,
    },
  },
  {
    id: 'edmonton-344-terra-losa',
    name: 'Terra Losa',
    city: 'Edmonton',
    coordinates: {
      lat: 53.533867,
      lng: -113.62198,
    },
  },
  {
    id: 'edmonton-345-terrace-heights',
    name: 'Terrace Heights',
    city: 'Edmonton',
    coordinates: {
      lat: 53.541919,
      lng: -113.437797,
    },
  },
  {
    id: 'edmonton-346-terwillegar-towne',
    name: 'Terwillegar Towne',
    city: 'Edmonton',
    coordinates: {
      lat: 53.450612,
      lng: -113.577752,
    },
  },
  {
    id: 'edmonton-347-the-hamptons',
    name: 'The Hamptons',
    city: 'Edmonton',
    coordinates: {
      lat: 53.487321,
      lng: -113.675686,
    },
  },
  {
    id: 'edmonton-348-the-orchards-at-ellerslie',
    name: 'The Orchards At Ellerslie',
    city: 'Edmonton',
    coordinates: {
      lat: 53.40305,
      lng: -113.464314,
    },
  },
  {
    id: 'edmonton-349-thorncliff',
    name: 'Thorncliff',
    city: 'Edmonton',
    coordinates: {
      lat: 53.515976,
      lng: -113.622762,
    },
  },
  {
    id: 'edmonton-350-tipaskan',
    name: 'Tipaskan',
    city: 'Edmonton',
    coordinates: {
      lat: 53.461489,
      lng: -113.457807,
    },
  },
  {
    id: 'edmonton-351-trumpeter-area',
    name: 'Trumpeter Area',
    city: 'Edmonton',
    coordinates: {
      lat: 53.592882,
      lng: -113.6766,
    },
  },
  {
    id: 'edmonton-352-tweddle-place',
    name: 'Tweddle Place',
    city: 'Edmonton',
    coordinates: {
      lat: 53.478393,
      lng: -113.459162,
    },
  },
  {
    id: 'edmonton-353-twin-brooks',
    name: 'Twin Brooks',
    city: 'Edmonton',
    coordinates: {
      lat: 53.444687,
      lng: -113.531531,
    },
  },
  {
    id: 'edmonton-354-university-of-alberta',
    name: 'University of Alberta',
    city: 'Edmonton',
    coordinates: {
      lat: 53.523379,
      lng: -113.522846,
    },
  },
  {
    id: 'edmonton-355-university-of-alberta-farm',
    name: 'University of Alberta Farm',
    city: 'Edmonton',
    coordinates: {
      lat: 53.498017,
      lng: -113.531967,
    },
  },
  {
    id: 'edmonton-356-virginia-park',
    name: 'Virginia Park',
    city: 'Edmonton',
    coordinates: {
      lat: 53.560575,
      lng: -113.450001,
    },
  },
  {
    id: 'edmonton-357-walker',
    name: 'Walker',
    city: 'Edmonton',
    coordinates: {
      lat: 53.417099,
      lng: -113.430432,
    },
  },
  {
    id: 'edmonton-358-webber-greens',
    name: 'Webber Greens',
    city: 'Edmonton',
    coordinates: {
      lat: 53.529902,
      lng: -113.676681,
    },
  },
  {
    id: 'edmonton-359-wedgewood-heights',
    name: 'Wedgewood Heights',
    city: 'Edmonton',
    coordinates: {
      lat: 53.478712,
      lng: -113.646579,
    },
  },
  {
    id: 'edmonton-360-weinlos',
    name: 'Weinlos',
    city: 'Edmonton',
    coordinates: {
      lat: 53.459755,
      lng: -113.413876,
    },
  },
  {
    id: 'edmonton-361-weir-industrial',
    name: 'Weir Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.511625,
      lng: -113.406104,
    },
  },
  {
    id: 'edmonton-362-wellington',
    name: 'Wellington',
    city: 'Edmonton',
    coordinates: {
      lat: 53.595529,
      lng: -113.552694,
    },
  },
  {
    id: 'edmonton-363-west-jasper-place',
    name: 'West Jasper Place',
    city: 'Edmonton',
    coordinates: {
      lat: 53.536834,
      lng: -113.584145,
    },
  },
  {
    id: 'edmonton-364-west-meadowlark-park',
    name: 'West Meadowlark Park',
    city: 'Edmonton',
    coordinates: {
      lat: 53.52579,
      lng: -113.609055,
    },
  },
  {
    id: 'edmonton-365-west-sheffield-industrial',
    name: 'West Sheffield Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.559304,
      lng: -113.609047,
    },
  },
  {
    id: 'edmonton-366-westbrook-estates',
    name: 'Westbrook Estates',
    city: 'Edmonton',
    coordinates: {
      lat: 53.468195,
      lng: -113.544436,
    },
  },
  {
    id: 'edmonton-367-westmount',
    name: 'Westmount',
    city: 'Edmonton',
    coordinates: {
      lat: 53.550377,
      lng: -113.540125,
    },
  },
  {
    id: 'edmonton-368-westridge',
    name: 'Westridge',
    city: 'Edmonton',
    coordinates: {
      lat: 53.505635,
      lng: -113.601383,
    },
  },
  {
    id: 'edmonton-369-westview-village',
    name: 'Westview Village',
    city: 'Edmonton',
    coordinates: {
      lat: 53.553292,
      lng: -113.696669,
    },
  },
  {
    id: 'edmonton-370-westwood',
    name: 'Westwood',
    city: 'Edmonton',
    coordinates: {
      lat: 53.576123,
      lng: -113.498584,
    },
  },
  {
    id: 'edmonton-371-white-industrial',
    name: 'White Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.564577,
      lng: -113.647928,
    },
  },
  {
    id: 'edmonton-372-whitemud-creek-ravine-north',
    name: 'Whitemud Creek Ravine North',
    city: 'Edmonton',
    coordinates: {
      lat: 53.490108,
      lng: -113.558935,
    },
  },
  {
    id: 'edmonton-373-whitemud-creek-ravine-south',
    name: 'Whitemud Creek Ravine South',
    city: 'Edmonton',
    coordinates: {
      lat: 53.468496,
      lng: -113.560335,
    },
  },
  {
    id: 'edmonton-374-whitemud-creek-ravine-twin-brooks',
    name: 'Whitemud Creek Ravine Twin Brooks',
    city: 'Edmonton',
    coordinates: {
      lat: 53.442826,
      lng: -113.544701,
    },
  },
  {
    id: 'edmonton-375-wild-rose',
    name: 'Wild Rose',
    city: 'Edmonton',
    coordinates: {
      lat: 53.470697,
      lng: -113.381165,
    },
  },
  {
    id: 'edmonton-376-wilson-industrial',
    name: 'Wilson Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.554589,
      lng: -113.633509,
    },
  },
  {
    id: 'edmonton-377-windermere',
    name: 'Windermere',
    city: 'Edmonton',
    coordinates: {
      lat: 53.437588,
      lng: -113.623699,
    },
  },
  {
    id: 'edmonton-378-windermere-area',
    name: 'Windermere Area',
    city: 'Edmonton',
    coordinates: {
      lat: 53.403019,
      lng: -113.631797,
    },
  },
  {
    id: 'edmonton-379-windsor-park',
    name: 'Windsor Park',
    city: 'Edmonton',
    coordinates: {
      lat: 53.524613,
      lng: -113.536265,
    },
  },
  {
    id: 'edmonton-380-winterburn-industrial-area-east',
    name: 'Winterburn Industrial Area East',
    city: 'Edmonton',
    coordinates: {
      lat: 53.557046,
      lng: -113.676655,
    },
  },
  {
    id: 'edmonton-381-winterburn-industrial-area-west',
    name: 'Winterburn Industrial Area West',
    city: 'Edmonton',
    coordinates: {
      lat: 53.562238,
      lng: -113.701427,
    },
  },
  {
    id: 'edmonton-382-woodcroft',
    name: 'Woodcroft',
    city: 'Edmonton',
    coordinates: {
      lat: 53.564628,
      lng: -113.558313,
    },
  },
  {
    id: 'edmonton-383-yellowhead-corridor-east',
    name: 'Yellowhead Corridor East',
    city: 'Edmonton',
    coordinates: {
      lat: 53.579028,
      lng: -113.452299,
    },
  },
  {
    id: 'edmonton-384-yellowhead-corridor-west',
    name: 'Yellowhead Corridor West',
    city: 'Edmonton',
    coordinates: {
      lat: 53.582842,
      lng: -113.512735,
    },
  },
  {
    id: 'edmonton-385-york',
    name: 'York',
    city: 'Edmonton',
    coordinates: {
      lat: 53.602657,
      lng: -113.430086,
    },
  },
  {
    id: 'edmonton-386-youngstown-industrial',
    name: 'Youngstown Industrial',
    city: 'Edmonton',
    coordinates: {
      lat: 53.550379,
      lng: -113.612376,
    },
  },
];
