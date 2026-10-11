/**
 * Seed dataset for Cape Town K Hotel — Bar & Kitchen menu.
 * Menu items with categories: beers, soft-drinks, juices, smoothies,
 * milk-shakes, spirits, vodka, gin, tequila, rum, liquor, wines-red, wines-white,
 * wines-glass, soup, pasta, light-bites, grills, stews, platters, burgers,
 * pizza, main-course.
 */
export const USERS = [
  { name: 'Alice Uwase', username: 'manager', email: 'manager@capetownkhotel.com', role: 'manager', password: 'Paradize2026' },
  { name: 'Jean Bosco', username: 'chef', role: 'chef', password: 'Kitchen2026' },
  { name: 'Diane Mukamana', username: 'waiter', role: 'waiter', password: 'Service2026' }
];

export const CATEGORIES = [
  { key: 'beers', name: { en: 'Beers', fr: 'Bières', rw: 'Inzoga' }, sortOrder: 1 },
  { key: 'soft-drinks', name: { en: 'Soft Drinks', fr: 'Boissons', rw: 'Ibinyobwa' }, sortOrder: 2 },
  { key: 'juices', name: { en: 'Fresh Juice', fr: 'Jus frais', rw: 'Uruju rwifuzuzwahe' }, sortOrder: 3 },
  { key: 'smoothies', name: { en: 'Smoothies', fr: 'Smoothies', rw: 'Smoothies' }, sortOrder: 4 },
  { key: 'milk-shakes', name: { en: 'Milk Shakes', fr: 'Milk Shakes', rw: 'Milk Shakes' }, sortOrder: 5 },
  { key: 'spirits', name: { en: 'Spirits', fr: 'Spiritueux', rw: 'Spirits' }, sortOrder: 6 },
  { key: 'vodka', name: { en: 'Vodka', fr: 'Vodka', rw: 'Vodka' }, sortOrder: 7 },
  { key: 'gin', name: { en: 'Gin', fr: 'Gin', rw: 'Gin' }, sortOrder: 8 },
  { key: 'tequila', name: { en: 'Tequila', fr: 'Tequila', rw: 'Tequila' }, sortOrder: 9 },
  { key: 'rum', name: { en: 'Rum', fr: 'Rhum', rw: 'Rum' }, sortOrder: 10 },
  { key: 'liquor', name: { en: 'Liqueurs', fr: 'Liqueurs', rw: 'Liqueurs' }, sortOrder: 11 },
  { key: 'wines-red', name: { en: 'Red Wine (Bottle)', fr: 'Vin rouge (Bouteille)', rw: 'Vinyo runini (Ubusabwa)' }, sortOrder: 12 },
  { key: 'wines-white', name: { en: 'White Wine (Bottle)', fr: 'Vin blanc (Bouteille)', rw: 'Vinyo umweru (Ubusabwa)' }, sortOrder: 13 },
  { key: 'wines-glass', name: { en: 'Wine (Glass)', fr: 'Vin (Verre)', rw: 'Vinyo (Glas)' }, sortOrder: 14 },
  { key: 'soup', name: { en: 'Soup', fr: 'Soupe', rw: 'Isoup' }, sortOrder: 15 },
  { key: 'pasta', name: { en: 'Pasta', fr: 'Pâtes', rw: 'Pasta' }, sortOrder: 16 },
  { key: 'light-bites', name: { en: 'Light Bites', fr: 'En-cas', rw: 'Ibizamini' }, sortOrder: 17 },
  { key: 'grills', name: { en: 'Cape Town Grills', fr: 'Grillades Cape Town', rw: 'Ibirishijwe bya Cape Town' }, sortOrder: 18 },
  { key: 'stews', name: { en: 'Stew Dishes', fr: 'Ragoûts', rw: 'Ibijumba' }, sortOrder: 19 },
  { key: 'platters', name: { en: 'Capetown Plata\'s', fr: 'Plats Cape Town', rw: 'Ibishoramari bya Cape Town' }, sortOrder: 20 },
  { key: 'burgers', name: { en: 'Burgers', fr: 'Burgers', rw: 'Burgers' }, sortOrder: 21 },
  { key: 'pizza', name: { en: 'Pizza', fr: 'Pizza', rw: 'Pizza' }, sortOrder: 22 },
  { key: 'main-course', name: { en: 'Main Course', fr: 'Plat principal', rw: 'Ifunguro Nyamukuru' }, sortOrder: 23 }
];

// imageKey maps to /public/uploads/src/<cat>.png (converted to WebP at seed time)
export const ITEMS = [
  // ---- Beers
  { cat: 'beers', key: 'guinness', station: 'bar', price: 2500, prep: 2, tags: [], allergens: ['gluten'], name: { en: 'Guinness', fr: 'Guinness', rw: 'Guinness' } },
  { cat: 'beers', key: 'goldberg', station: 'bar', price: 2500, prep: 2, tags: [], allergens: ['gluten'], name: { en: 'Goldberg', fr: 'Goldberg', rw: 'Goldberg' } },
  { cat: 'beers', key: 'tusker', station: 'bar', price: 2500, prep: 2, tags: [], allergens: ['gluten'], name: { en: 'Tusker', fr: 'Tusker', rw: 'Tusker' } },
  { cat: 'beers', key: 'heineken', station: 'bar', price: 2500, prep: 2, tags: [], allergens: ['gluten'], name: { en: 'Heineken', fr: 'Heineken', rw: 'Heineken' } },
  { cat: 'beers', key: 'amstel', station: 'bar', price: 2000, prep: 2, tags: [], allergens: ['gluten'], name: { en: 'Amstel', fr: 'Amstel', rw: 'Amstel' } },
  { cat: 'beers', key: 'virunga-mist', station: 'bar', price: 2000, prep: 2, tags: [], allergens: ['gluten'], name: { en: 'Virunga Mist', fr: 'Virunga Mist', rw: 'Virunga Mist' } },
  { cat: 'beers', key: 'skol', station: 'bar', price: 2000, prep: 2, tags: [], allergens: ['gluten'], name: { en: 'Skol', fr: 'Skol', rw: 'Skol' } },
  { cat: 'beers', key: 'leffe', station: 'bar', price: 4000, prep: 2, tags: [], allergens: ['gluten'], name: { en: 'Leffe', fr: 'Leffe', rw: 'Leffe' } },
  { cat: 'beers', key: 'smirnoff-ice', station: 'bar', price: 3000, prep: 2, tags: [], allergens: ['gluten'], name: { en: 'Smirnoff Ice', fr: 'Smirnoff Ice', rw: 'Smirnoff Ice' } },
  { cat: 'beers', key: 'smirnoff', station: 'bar', price: 4000, prep: 2, tags: [], allergens: ['gluten'], name: { en: 'Smirnoff', fr: 'Smirnoff', rw: 'Smirnoff' } },
  { cat: 'beers', key: 'milano-vodka', station: 'bar', price: 4000, prep: 2, tags: [], allergens: ['gluten'], name: { en: 'Milano Vodka', fr: 'Milano Vodka', rw: 'Milano Vodka' } },
  { cat: 'beers', key: 'savanna', station: 'bar', price: 5000, prep: 2, tags: [], allergens: ['gluten'], name: { en: 'Savanna', fr: 'Savanna', rw: 'Savanna' } },
  { cat: 'beers', key: 'redbull', station: 'bar', price: 4000, prep: 2, tags: [], allergens: [], name: { en: 'Redbull', fr: 'Redbull', rw: 'Redbull' } },

  // ---- Soft Drinks
  { cat: 'soft-drinks', key: 'panache', station: 'bar', price: 1500, prep: 2, tags: [], allergens: [], name: { en: 'Panache', fr: 'Panache', rw: 'Panache' } },
  { cat: 'soft-drinks', key: 'fanta', station: 'bar', price: 1500, prep: 2, tags: [], allergens: [], name: { en: 'Fanta', fr: 'Fanta', rw: 'Fanta' } },
  { cat: 'soft-drinks', key: 'fanta-50cl', station: 'bar', price: 2000, prep: 2, tags: [], allergens: [], name: { en: 'Fanta 50cl', fr: 'Fanta 50cl', rw: 'Fanta 50cl' } },
  { cat: 'soft-drinks', key: 'water', station: 'bar', price: 1000, prep: 2, tags: [], allergens: [], trackStock: true, stockQty: 100, lowStockThreshold: 20, name: { en: 'Water', fr: 'Eau', rw: 'Amazi' } },

  // ---- Fresh Juice
  { cat: 'juices', key: 'mango-juice', station: 'bar', price: 5000, prep: 6, tags: [], allergens: [], name: { en: 'Mango Juice', fr: 'Jus mangue', rw: 'Uruju rwa Mango' } },
  { cat: 'juices', key: 'passion-juice', station: 'bar', price: 5000, prep: 6, tags: [], allergens: [], name: { en: 'Passion Juice', fr: 'Jus de passion', rw: 'Uruju rw\'ipashoni' } },
  { cat: 'juices', key: 'pineapple-juice', station: 'bar', price: 5000, prep: 6, tags: [], allergens: [], name: { en: 'Pineapple Juice', fr: 'Jus ananas', rw: 'Uruju rw\'inanasi' } },
  { cat: 'juices', key: 'watermelon-juice', station: 'bar', price: 5000, prep: 6, tags: [], allergens: [], name: { en: 'Watermelon Juice', fr: 'Jus pastèque', rw: 'Uruju rw\'indimu' } },
  { cat: 'juices', key: 'orange-juice', station: 'bar', price: 5000, prep: 6, tags: [], allergens: [], name: { en: 'Orange Juice', fr: 'Jus d\'orange', rw: 'Uruju rw\'indimu' } },
  { cat: 'juices', key: 'mocktail-juice', station: 'bar', price: 6000, prep: 6, tags: ['new'], allergens: [], name: { en: 'Mocktail Juice', fr: 'Jus mocktail', rw: 'Uruju mocktail' } },
  { cat: 'juices', key: 'detox', station: 'bar', price: 6000, prep: 6, tags: [], allergens: [], name: { en: 'Detox', fr: 'Détox', rw: 'Detox' } },

  // ---- Smoothies
  { cat: 'smoothies', key: 'passion-smoothie', station: 'bar', price: 6000, prep: 6, tags: [], allergens: [], name: { en: 'Passion Fruit Smoothie', fr: 'Smoothie passion', rw: 'Smoothie y\'ipashoni' } },
  { cat: 'smoothies', key: 'banana-smoothie', station: 'bar', price: 6000, prep: 6, tags: [], allergens: [], name: { en: 'Banana Smoothie', fr: 'Smoothie banane', rw: 'Smoothie y\'ibitoki' } },
  { cat: 'smoothies', key: 'mixed-fruit-smoothie', station: 'bar', price: 8000, prep: 6, tags: [], allergens: [], name: { en: 'Mixed Fruit Smoothie', fr: 'Smoothie fruits mélangés', rw: 'Smoothie y\'imbuto nyinshi' } },
  { cat: 'smoothies', key: 'mango-smoothie', station: 'bar', price: 6000, prep: 6, tags: [], allergens: [], name: { en: 'Mango Smoothie', fr: 'Smoothie mangue', rw: 'Smoothie y\'mango' } },

  // ---- Milk Shakes
  { cat: 'milk-shakes', key: 'vanilla-milk-shake', station: 'bar', price: 6000, prep: 8, tags: [], allergens: ['dairy'], name: { en: 'Vanilla Milk Shake', fr: 'Milk Shake vanille', rw: 'Milk Shake ya vanille' } },
  { cat: 'milk-shakes', key: 'chocolate-milk-shake', station: 'bar', price: 6000, prep: 8, tags: [], allergens: ['dairy'], name: { en: 'Chocolate Milk Shake', fr: 'Milk Shake chocolat', rw: 'Milk Shake ya cokolade' } },
  { cat: 'milk-shakes', key: 'strawberry-milk-shake', station: 'bar', price: 6000, prep: 8, tags: [], allergens: ['dairy'], name: { en: 'Strawberry Milk Shake', fr: 'Milk Shake fraise', rw: 'Milk Shake ya strawberi' } },

  // ---- Spirits (Bottle / Shot)
  { cat: 'spirits', key: 'chivas-regal-18', station: 'bar', price: 5000, prep: 2, tags: [], allergens: [], name: { en: 'Chivas Regal 18 Years', fr: 'Chivas Regal 18 Years', rw: 'Chivas Regal 18 Years' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Bottle', extraPrice: 75000 }, { label: 'Shot' }] }] },
  { cat: 'spirits', key: 'black-label', station: 'bar', price: 4000, prep: 2, tags: [], allergens: [], name: { en: 'Black Label', fr: 'Black Label', rw: 'Black Label' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Bottle', extraPrice: 86000 }, { label: 'Shot' }] }] },
  { cat: 'spirits', key: 'jameson-irish-whiskey', station: 'bar', price: 4000, prep: 2, tags: [], allergens: [], name: { en: 'Jameson Irish Whiskey', fr: 'Jameson Irish Whiskey', rw: 'Jameson Irish Whiskey' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Bottle', extraPrice: 66000 }, { label: 'Shot' }] }] },
  { cat: 'spirits', key: 'jameson-black-barrel', station: 'bar', price: 5000, prep: 2, tags: [], allergens: [], name: { en: 'Jameson Black Barrel', fr: 'Jameson Black Barrel', rw: 'Jameson Black Barrel' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Bottle', extraPrice: 95000 }, { label: 'Shot' }] }] },

  // ---- Vodka (Bottle / Shot)
  { cat: 'vodka', key: 'absolute-vodka', station: 'bar', price: 3000, prep: 2, tags: [], allergens: [], name: { en: 'Absolute Vodka', fr: 'Absolute Vodka', rw: 'Absolute Vodka' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Bottle', extraPrice: 57000 }, { label: 'Shot' }] }] },

  // ---- Gin (Bottle / Shot)
  { cat: 'gin', key: 'blue-boner', station: 'bar', price: 3000, prep: 2, tags: [], allergens: [], name: { en: 'Blue Boner', fr: 'Blue Boner', rw: 'Blue Boner' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Bottle', extraPrice: 32000 }, { label: 'Shot' }] }] },
  { cat: 'gin', key: 'beefeater', station: 'bar', price: 3000, prep: 2, tags: [], allergens: [], name: { en: 'Beefeater', fr: 'Beefeater', rw: 'Beefeater' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Bottle', extraPrice: 57000 }, { label: 'Shot' }] }] },
  { cat: 'gin', key: 'gordons', station: 'bar', price: 3000, prep: 2, tags: [], allergens: [], name: { en: 'Gordon\'s', fr: 'Gordon\'s', rw: 'Gordon\'s' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Bottle', extraPrice: 57000 }, { label: 'Shot' }] }] },
  { cat: 'gin', key: 'gibson', station: 'bar', price: 3000, prep: 2, tags: [], allergens: [], name: { en: 'Gibson', fr: 'Gibson', rw: 'Gibson' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Bottle', extraPrice: 47000 }, { label: 'Shot' }] }] },

  // ---- Tequila (Bottle / Shot)
  { cat: 'tequila', key: 'camino', station: 'bar', price: 3000, prep: 2, tags: [], allergens: [], name: { en: 'Camino', fr: 'Camino', rw: 'Camino' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Bottle', extraPrice: 47000 }, { label: 'Shot' }] }] },
  { cat: 'tequila', key: 'olmeca-silver', station: 'bar', price: 4000, prep: 2, tags: [], allergens: [], name: { en: 'Olmeca Silver', fr: 'Olmeca Silver', rw: 'Olmeca Silver' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Bottle', extraPrice: 106000 }, { label: 'Shot' }] }] },

  // ---- Rum (Bottle / Shot)
  { cat: 'rum', key: 'martini-rum', station: 'bar', price: 3000, prep: 2, tags: [], allergens: [], name: { en: 'Martini', fr: 'Martini', rw: 'Martini' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Bottle', extraPrice: 47000 }, { label: 'Shot' }] }] },

  // ---- Liqueurs (Bottle / Shot)
  { cat: 'liquor', key: 'malibu', station: 'bar', price: 5000, prep: 2, tags: [], allergens: [], name: { en: 'Malibu', fr: 'Malibu', rw: 'Malibu' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Bottle', extraPrice: 45000 }, { label: 'Shot' }] }] },
  { cat: 'liquor', key: 'amarula', station: 'bar', price: 5000, prep: 2, tags: [], allergens: [], name: { en: 'Amarula', fr: 'Amarula', rw: 'Amarula' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Bottle', extraPrice: 55000 }, { label: 'Shot' }] }] },
  { cat: 'liquor', key: 'espresso-bottega', station: 'bar', price: 5000, prep: 2, tags: [], allergens: [], name: { en: 'Espresso Bottega', fr: 'Espresso Bottega', rw: 'Espresso Bottega' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Bottle', extraPrice: 55000 }, { label: 'Shot' }] }] },

  // ---- Wines - Red (Bottle)
  { cat: 'wines-red', key: 'lamothe-parrot', station: 'bar', price: 25000, prep: 2, tags: [], allergens: [], name: { en: 'Lamothe Parrot', fr: 'Lamothe Parrot', rw: 'Lamothe Parrot' } },
  { cat: 'wines-red', key: 'maison-j-grandet', station: 'bar', price: 25000, prep: 2, tags: [], allergens: [], name: { en: 'Maison j.grandet', fr: 'Maison j.grandet', rw: 'Maison j.grandet' } },
  { cat: 'wines-red', key: 'ch-valac', station: 'bar', price: 25000, prep: 2, tags: [], allergens: [], name: { en: 'CH Valac', fr: 'CH Valac', rw: 'CH Valac' } },
  { cat: 'wines-red', key: 'monte-rosso', station: 'bar', price: 25000, prep: 2, tags: [], allergens: [], name: { en: 'Monte rosso', fr: 'Monte rosso', rw: 'Monte rosso' } },
  { cat: 'wines-red', key: 'cellar-cask-red', station: 'bar', price: 25000, prep: 2, tags: [], allergens: [], name: { en: 'Cellar cask', fr: 'Cellar cask', rw: 'Cellar cask' } },
  { cat: 'wines-red', key: 'pinta-negra-red', station: 'bar', price: 25000, prep: 2, tags: [], allergens: [], name: { en: 'Pinta Negra', fr: 'Pinta Negra', rw: 'Pinta Negra' } },

  // ---- Wines - White (Bottle)
  { cat: 'wines-white', key: 'four-cousins', station: 'bar', price: 25000, prep: 2, tags: [], allergens: [], name: { en: 'Four Cousins', fr: 'Four Cousins', rw: 'Four Cousins' } },
  { cat: 'wines-white', key: 'pinta-negra-white', station: 'bar', price: 25000, prep: 2, tags: [], allergens: [], name: { en: 'Pinta Negra', fr: 'Pinta Negra', rw: 'Pinta Negra' } },

  // ---- Wines - Glass
  { cat: 'wines-glass', key: 'drostdy', station: 'bar', price: 5000, prep: 2, tags: [], allergens: [], name: { en: 'Drostdy', fr: 'Drostdy', rw: 'Drostdy' } },
  { cat: 'wines-glass', key: 'cellar-cask-glass', station: 'bar', price: 5000, prep: 2, tags: [], allergens: [], name: { en: 'Cellar cask', fr: 'Cellar cask', rw: 'Cellar cask' } },

  // ---- Soup
  { cat: 'soup', key: 'fish-soup', station: 'kitchen', price: 7000, prep: 15, tags: [], allergens: [], name: { en: 'Fish Soup (with toasted bread)', fr: 'Soupe de poisson (avec pain grillé)', rw: 'Isoup y\'imi ugali (n\'ubunyobwa bw\'umuceri)' } },
  { cat: 'soup', key: 'noodle-soup', station: 'kitchen', price: 4000, prep: 15, tags: [], allergens: ['gluten'], name: { en: 'Noodle Soup (with toasted bread)', fr: 'Soupe aux nouilles (avec pain grillé)', rw: 'Isoup y\'imyumbati (n\'ubunyobwa bw\'umuceri)' } },
  { cat: 'soup', key: 'chicken-soup', station: 'kitchen', price: 6000, prep: 15, tags: [], allergens: [], name: { en: 'Chicken Soup (with toasted bread)', fr: 'Soupe au poulet (avec pain grillé)', rw: 'Isoup y\'inkoko (n\'ubunyobwa bw\'umuceri)' } },
  { cat: 'soup', key: 'beef-soup', station: 'kitchen', price: 7000, prep: 15, tags: [], allergens: [], name: { en: 'Beef Soup (with toasted bread)', fr: 'Soupe de bœuf (avec pain grillé)', rw: 'Isoup y\'inyama y\'inka (n\'ubunyobwa bw\'umuceri)' } },
  { cat: 'soup', key: 'mushroom-soup', station: 'kitchen', price: 5000, prep: 15, tags: ['vegetarian'], allergens: ['dairy'], name: { en: 'Cream of Mushroom Soup (with toasted bread)', fr: 'Soupe crème aux champignons (avec pain grillé)', rw: 'Isoup y\'matsima y\'ubunyobwa (n\'ubunyobwa bw\'umuceri)' } },
  { cat: 'soup', key: 'matooke-broth-soup', station: 'kitchen', price: 7000, prep: 15, tags: [], allergens: [], name: { en: 'Chicken & Matooke Broth Soup (chicken cubes and green bananas garnished)', fr: 'Soupe au bouillon poulet et matooke ( cubes de poulet et bananes vertes)', rw: 'Isoup y\'umuceri w\'inkoko n\'amatooke (inkoko mu bibujijuje n\'ibihogo by\'umubare)' } },

  // ---- Pasta & Noodles
  { cat: 'pasta', key: 'spaghetti-bolognese', station: 'kitchen', price: 8000, prep: 15, tags: [], allergens: ['gluten'], name: { en: 'Spaghetti Bolognese (chef\'s secret recipe)', fr: 'Spaghetti bolognaise (recette secrète du chef)', rw: 'Espageti bolognese (ihandi r\'umuryango)' } },
  { cat: 'pasta', key: 'alfredo-pasta', station: 'kitchen', price: 9000, prep: 15, tags: [], allergens: ['gluten', 'dairy'], name: { en: 'Alfredo Pasta (chicken, white sauce, cream, parmesan, green pepper)', fr: 'Pâtes Alfredo (poulet, sauce blanche, crème, parmesan, poivron vert)', rw: 'Pasta Alfredo (inkoko, sauce y\'umweru, krem, parmesan, pilipili y\'umubisi)' } },
  { cat: 'pasta', key: 'penne-pasta', station: 'kitchen', price: 9000, prep: 15, tags: [], allergens: ['gluten', 'dairy'], name: { en: 'Penne Pasta (chicken, white sauce, cream, parmesan, green pepper)', fr: 'Pâtes penne (poulet, sauce blanche, crème, parmesan, poivron vert)', rw: 'Pasta penne (inkoko, sauce y\'umweru, krem, parmesan, pilipili y\'umubisi)' } },
  { cat: 'pasta', key: 'fried-noodles', station: 'kitchen', price: 7000, prep: 12, tags: [], allergens: ['gluten'], name: { en: 'Fried Noodles (stir-fried with chicken, carrot, cabbage, onion, garlic, soy sauce)', fr: 'Nouilles sautées (poulet, carotte, chou, oignon, ail, sauce soja)', rw: 'Imyumbati y\'umuceri (y\'umuceri, karoti, chou, sukuma, ajo, siriho y\'soya)' } },
  { cat: 'pasta', key: 'chicken-noodles', station: 'kitchen', price: 9000, prep: 15, tags: [], allergens: ['gluten'], name: { en: 'Chicken Noodles (chicken, noodles, carrot, green peas, green pepper)', fr: 'Nouilles au poulet (poulet, nouilles, carotte, pois chiches, poivron vert)', rw: 'Imyumbati y\'inkoko (inkoko, imyumbati, karoti, ibigari by\'umubisi, pilipili y\'umubisi)' } },

  // ---- Light Bites
  { cat: 'light-bites', key: 'veg-samosa-fries', station: 'kitchen', price: 3000, prep: 10, tags: ['vegetarian'], allergens: ['gluten'], name: { en: 'Vegetable Samosa (3pcs) + French Fries', fr: 'Samosa aux légumes (3pcs) + frites', rw: 'Samosa y\'imboga (3) + ifiriti' } },
  { cat: 'light-bites', key: 'chicken-spring-roll', station: 'kitchen', price: 8000, prep: 12, tags: [], allergens: ['gluten'], name: { en: 'Chicken Spring Roll (3pcs) + French Fries', fr: 'Rouleeau poulet (3pcs) + frites', rw: 'Spring roll y\'inkoko (3) + ifiriti' } },
  { cat: 'light-bites', key: 'fish-finger', station: 'kitchen', price: 8000, prep: 12, tags: [], allergens: ['gluten', 'fish'], name: { en: 'Fish Finger (4pcs) + French Fries', fr: 'Doigts de poisson (4pcs) + frites', rw: 'Ibigo by\'imi (4) + ifiriti' } },
  { cat: 'light-bites', key: 'meatballs-fries', station: 'kitchen', price: 3000, prep: 10, tags: [], allergens: ['gluten'], name: { en: 'Meatballs (3pcs) + French Fries', fr: 'Boulettes de viande (3pcs) + frites', rw: 'Amagati y\'inyama (3) + ifiriti' } },
  { cat: 'light-bites', key: 'chicken-wings', station: 'kitchen', price: 8000, prep: 15, tags: ['spicy'], allergens: [], name: { en: 'Spicy Chicken Wings (marinated, with kachumbari)', fr: 'Ailes de poulet épicées (marinées, avec kachumbari)', rw: 'Umubiri w\'inkoko w\'ipipiye (wihariye, n\'akachumbari)' } },
  { cat: 'light-bites', key: 'chicken-lollipop', station: 'kitchen', price: 7000, prep: 12, tags: [], allergens: ['gluten'], name: { en: 'Chicken Lollipop (ground chicken + fries)', fr: 'Lollipop poulet (poulet haché + frites)', rw: 'Lollipop y\'inkoko (inkoko y\'umuceri + ifiriti)' } },

  // ---- Cape Town Grills
  { cat: 'grills', key: 'goat-brochette', station: 'kitchen', price: 3000, prep: 12, tags: ['popular'], allergens: [], name: { en: 'Goat Brochette', fr: 'Brochette de chèvre', rw: 'Inyama y\'ihene ku macumu' } },
  { cat: 'grills', key: 'beef-brochette', station: 'kitchen', price: 3000, prep: 12, tags: ['popular'], allergens: [], name: { en: 'Beef Brochette', fr: 'Brochette de bœuf', rw: 'Inyama y\'inka ku macumu' } },
  { cat: 'grills', key: 'fish-brochette', station: 'kitchen', price: 5000, prep: 12, tags: [], allergens: ['fish'], name: { en: 'Fish Brochette', fr: 'Brochette de poisson', rw: 'Ifi ku macumu' } },
  { cat: 'grills', key: 'chicken-brochette', station: 'kitchen', price: 4000, prep: 12, tags: [], allergens: [], name: { en: 'Chicken Brochette', fr: 'Brochette de poulet', rw: 'Inkoko ku macumu' } },
  { cat: 'grills', key: 'zingaro-brochette', station: 'kitchen', price: 3500, prep: 12, tags: ['new'], allergens: [], name: { en: 'Zingaro Brochette', fr: 'Brochette Zingaro', rw: 'Zingaro ku macumu' } },
  { cat: 'grills', key: 'nyamacoma-leg', station: 'kitchen', price: 20000, prep: 25, tags: ['new'], allergens: [], name: { en: 'Nyamacoma Leg (with veggie/kachumbari + banana/potato/fries/wedges/kawunga)', fr: 'Cuisses Nyamacoma (légumes/kachumbari + banane/potato/frites)', rw: 'Ikigero cy\'Nyamacoma (imboga/akachumbari + igofigo/ibikomere/ifiriti)' } },
  { cat: 'grills', key: 'akabenzi', station: 'kitchen', price: 6000, prep: 18, tags: [], allergens: ['fish'], name: { en: 'Akabenzi (Cape Town ocean fish)', fr: 'Akabenzi (poisson de mer Cape Town)', rw: 'Akabenzi (imi moji ya bahuzi)' } },
  { cat: 'grills', key: 'bbq-grilled-combo', station: 'kitchen', price: 30000, prep: 35, tags: ['popular'], allergens: [], name: { en: 'BBQ Grilled Combo (goat, beef, chicken leg, kebab + potato wedges)', fr: 'Combo grill BBQ (chèvre, bœuf, cuisse de poulet, kebab + frites)', rw: 'Ikomubo BBQ (inyama y\'ihene, inyama y\'inka, ikigero cy\'inkoko, kebab + ibikomere)' } },
  { cat: 'grills', key: 'grilled-chicken', station: 'kitchen', price: 15000, prep: 25, tags: ['popular'], allergens: [], name: { en: 'Grilled Chicken (chips/rice/veggies)', fr: 'Poulet grillé (frites/riz/légumes)', rw: 'Inkoko yurishijwe (ifiriti/umuceri/imboga)' } },

  // ---- Stew Dishes
  { cat: 'stews', key: 'chicken-stew', station: 'kitchen', price: 10000, prep: 20, tags: [], allergens: [], name: { en: 'Chicken Stew (tenderloin cubes in authentic Italian sauce)', fr: 'Ragoût de poulet (cube de filet dans sauce italienne)', rw: 'Ibijumba by\'inkoko (ibyuma by\'inkoko mu rwatsa rwaswa)' } },
  { cat: 'stews', key: 'beef-stew', station: 'kitchen', price: 10000, prep: 20, tags: [], allergens: [], name: { en: 'Beef Stew (tenderloin cubes in authentic Italian sauce)', fr: 'Ragoût de bœuf (cube de bœuf dans sauce italienne)', rw: 'Ibijumba y\'inyama y\'inka (ibyuma by\'inka mu rwatsa rwaswa)' } },
  { cat: 'stews', key: 'fish-stew', station: 'kitchen', price: 10000, prep: 20, tags: [], allergens: ['fish'], name: { en: 'Fish Stew (tenderloin cubes in authentic Italian sauce)', fr: 'Ragoût de poisson (cube de poisson dans sauce italienne)', rw: 'Ibijumba by\'imi (ibyuma by\'imi mu rwatsa rwaswa)' } },

  // ---- Capetown Plata's
  { cat: 'platters', key: 'beef-half-rice-pompsote', station: 'kitchen', price: 15000, prep: 20, tags: [], allergens: [], name: { en: 'Beef with ½ Rice and Pompsote', fr: 'Bœuf avec ½ riz et pompsote', rw: 'Inyama y\'inka n\'imuceri n\'pompsote' } },
  { cat: 'platters', key: 'beef-full-rice-pompsote', station: 'kitchen', price: 25000, prep: 25, tags: ['popular'], allergens: [], name: { en: 'Beef with Rice and Pompsote', fr: 'Bœuf avec riz et pompsote', rw: 'Inyama y\'inka n\'umuceri n\'pompsote' } },
  { cat: 'platters', key: 'fish-half-rice-pompsote', station: 'kitchen', price: 15000, prep: 20, tags: [], allergens: ['fish'], name: { en: 'Fish with ½ Rice and Pompsote', fr: 'Poison avec ½ riz et pompsote', rw: 'Ifi n\'imuceri n\'pompsote' } },
  { cat: 'platters', key: 'fish-full-rice-pompsote', station: 'kitchen', price: 25000, prep: 25, tags: ['popular'], allergens: ['fish'], name: { en: 'Fish with Rice and Pompsote', fr: 'Poison avec riz et pompsote', rw: 'Ifi n\'umuceri n\'pompsote' } },
  { cat: 'platters', key: 'chicken-half-rice-pompsote', station: 'kitchen', price: 15000, prep: 20, tags: [], allergens: [], name: { en: 'Chicken with ½ Rice and Pompsote', fr: 'Poulet avec ½ riz et pompsote', rw: 'Inkoko n\'imuceri n\'pompsote' } },
  { cat: 'platters', key: 'chicken-full-rice-pompsote', station: 'kitchen', price: 25000, prep: 25, tags: ['popular'], allergens: [], name: { en: 'Chicken with Rice and Pompsote', fr: 'Poulet avec riz et pompsote', rw: 'Inkoko n\'umuceri n\'pompsote' } },

  // ---- Burgers
  { cat: 'burgers', key: 'beef-burger', station: 'kitchen', price: 8000, prep: 15, tags: ['popular'], allergens: ['gluten'], name: { en: 'Beef Burger', fr: 'Burger bœuf', rw: 'Burger y\'inyama y\'inka' } },
  { cat: 'burgers', key: 'chicken-burger', station: 'kitchen', price: 7000, prep: 15, tags: [], allergens: ['gluten'], name: { en: 'Chicken Burger', fr: 'Burger poulet', rw: 'Burger y\'inkoko' } },
  { cat: 'burgers', key: 'veg-burger', station: 'kitchen', price: 5000, prep: 15, tags: ['vegetarian'], allergens: ['gluten'], name: { en: 'Vegetable Burger', fr: 'Burger végétarien', rw: 'Burger y\'imboga' } },
  { cat: 'burgers', key: 'cheese-burger', station: 'kitchen', price: 8000, prep: 15, tags: [], allergens: ['gluten', 'dairy'], name: { en: 'Cheese Burger', fr: 'Burger au fromage', rw: 'Burger y\'isukali' } },

  // ---- Pizza
  { cat: 'pizza', key: 'margherita', station: 'kitchen', price: 10000, prep: 15, tags: ['popular'], allergens: ['gluten', 'dairy'], name: { en: 'Margherita (mozzarella, tomato, fresh basil, olive oil)', fr: 'Margherita (mozzarella, tomate, basilic, huile d\'olive)', rw: 'Margherita (mozzarella, tomate, basil, amashoyi)' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Medium' }, { label: 'Large', extraPrice: 2000 }] }] },
  { cat: 'pizza', key: 'hawaiian', station: 'kitchen', price: 10000, prep: 15, tags: [], allergens: ['gluten', 'dairy'], name: { en: 'Hawaiian (pineapple, tomato sauce, mozzarella, ham or bacon)', fr: 'Hawaiienne (ananas, sauce tomate, mozzarella, jambon)', rw: 'Hawaiian (inanasi, siriho, mozzarella, jam)' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Medium' }, { label: 'Large', extraPrice: 2000 }] }] },
  { cat: 'pizza', key: 'four-season', station: 'kitchen', price: 12000, prep: 18, tags: ['new'], allergens: ['gluten', 'dairy'], name: { en: '4season (mozzarella, tomato, sausages, chicken, fresh chillies, onion)', fr: '4 Saisons (mozzarella, tomate, saucisses, poulet, piments, oignon)', rw: 'Sezon 4 (mozzarella, tomate, isawuga, inkoko, pilipili, sukuma)' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Medium' }, { label: 'Large', extraPrice: 3000 }] }] },
  { cat: 'pizza', key: 'chicken-pizza', station: 'kitchen', price: 10000, prep: 15, tags: [], allergens: ['gluten', 'dairy'], name: { en: 'Chicken Pizza', fr: 'Pizza poulet', rw: 'Pizza y\'inkoko' }, options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Medium' }, { label: 'Large', extraPrice: 2000 }] }] },

  // ---- Main Course
  { cat: 'main-course', key: 'beef-stroganoff', station: 'kitchen', price: 10000, prep: 20, tags: ['popular'], allergens: ['dairy'], name: { en: 'Beef Stroganoff (tenderloin strips, mushrooms, green pepper in creamy sauce)', fr: 'Bœuf Stroganoff (cube bœuf, champignons, poivron vert, sauce crémeuse)', rw: 'Beef Stroganoff (ibyuma, matsima, pilipili y\'umubisi, sauce y\'amata)' } },
  { cat: 'main-course', key: 'beef-steak', station: 'kitchen', price: 12000, prep: 22, tags: ['popular'], allergens: [], name: { en: 'Beef Steak (marinated, fried veg OR plain mushroom sauce + rice/mashed/chips)', fr: 'Steak de bœuf (mariné, légumes ou sauce champignon + riz/purée/frites)', rw: 'Steak y\'inyama y\'inka (yihariye, imboga cyangwa sauce y\'matsima + umuceri/imperme/imifirisiti)' } },
  { cat: 'main-course', key: 'grilled-chicken-leg', station: 'kitchen', price: 9000, prep: 20, tags: ['popular'], allergens: [], name: { en: 'Grilled Chicken Leg (herbs & spices + rice/mashed/chips)', fr: 'Cuisse de poulet grillée (herbes & épices + riz/purée/frites)', rw: 'Ikigero cy\'inkoko cyurishijwe (ibimyunyu & ipipiro + umuceri/imperme/imifirisiti)' } },
  { cat: 'main-course', key: 'grilled-chicken-breast', station: 'kitchen', price: 13000, prep: 22, tags: ['popular'], allergens: [], name: { en: 'Grilled Chicken Breast (herbs & spices + rice/mashed/chips)', fr: 'Poitrine de poulet grillée (herbes & épices + riz/purée/frites)', rw: 'Umufuu w\'inkoko w\'urishijwe (ibimyunyu & ipipiro + umuceri/imperme/imifirisiti)' } },
  { cat: 'main-course', key: 'fish-stroganoff', station: 'kitchen', price: 12000, prep: 20, tags: [], allergens: ['fish', 'dairy'], name: { en: 'Fish Stroganoff (marinated fish, onion, mushroom, cream, white sauce + rice)', fr: 'Poisson Stroganoff (poisson mariné, oignon, champignon, crème, sauce blanche + riz)', rw: 'Fish Stroganoff (imi yihariye, sukuma, matsima, krem, sauce y\'umweru + umuceri)' } },
  { cat: 'main-course', key: 'grilled-tilapia', station: 'kitchen', price: 25000, prep: 30, tags: ['popular'], allergens: ['fish'], name: { en: 'Grilled Tilapia (whole, lemon & onion + rice/chips)', fr: 'Tilapia grillée (entière, citron & oignon + riz/frites)', rw: 'Ifi yurishijwe (yuzuye, indimu & sukuma + umuceri/imifirisiti)' } },
  { cat: 'main-course', key: 'fish-fillet', station: 'kitchen', price: 8000, prep: 18, tags: [], allergens: ['fish'], name: { en: 'Fish Fillet (herbs & lemon sauce + rice/chips)', fr: 'Filet de poisson (herbes & citron + riz/frites)', rw: 'Filayi y\'imi (ibimyunyu & sauce y\'indimu + umuceri/imifirisiti)' } },
  { cat: 'main-course', key: 'chicken-curry', station: 'kitchen', price: 10000, prep: 18, tags: ['spicy'], allergens: ['dairy'], name: { en: 'Chicken Curry (rich curry sauce + rice/chips)', fr: 'Curry au poulet (sauce au curry + riz/frites)', rw: 'Kari y\'inkoko (sauce y\'kari + umuceri/imifirisiti)' } },
  { cat: 'main-course', key: 'chicken-sauce-ugali', station: 'kitchen', price: 7000, prep: 18, tags: [], allergens: ['gluten'], name: { en: 'Chicken Sauce & Ugali', fr: 'Sauce poulet & Ugali', rw: 'Sauce y\'inkoko n\'ubugali' } },
  { cat: 'main-course', key: 'beef-sauce-ugali', station: 'kitchen', price: 7000, prep: 18, tags: [], allergens: ['gluten'], name: { en: 'Beef Sauce & Ugali', fr: 'Sauce bœuf & Ugali', rw: 'Sauce y\'inyana y\'inka n\'ubugali' } },
  { cat: 'main-course', key: 'chicken-pilau', station: 'kitchen', price: 5000, prep: 18, tags: [], allergens: ['gluten'], name: { en: 'Chicken Pilau (spiced chicken with rice & aromatic herbs)', fr: 'Poulet pilau (poulet épicé avec riz & herbes aromatiques)', rw: 'Pilau y\'inkoko (inkoko y\'ipipiye n\'umuceri & ibimyunyu by\'umumaro)' } }
];

export const PROMOS = [
  { code: 'WELCOME10', type: 'percent', value: 10, maxUses: 100 },
  { code: 'THURSDAY', type: 'fixed', value: 2000, maxUses: 50 }
];

export const SETTINGS = {
  announcement: 'Welcome to Cape Town K Hotel — AI Digital Menu',
  taxRate: 0,
  serviceCharge: 0
};