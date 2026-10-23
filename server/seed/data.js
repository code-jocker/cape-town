/**
 * Seed dataset for Cape Town K Hotel.
 * Names in EN/FR/RW; realistic prices.
 */
export const USERS = [
  { name: 'Alice Uwase', username: 'manager', email: 'manager@capetownkhotel.com', role: 'manager', password: 'Paradize2026' },
  { name: 'Jean Bosco', username: 'chef', role: 'chef', password: 'Kitchen2026' },
  { name: 'Diane Mukamana', username: 'waiter', role: 'waiter', password: 'Service2026' }
];

export const CATEGORIES = [
  { key: 'starters', name: { en: 'Starters', fr: 'Entrées', rw: 'Imbabura' }, sortOrder: 1 },
  { key: 'mains', name: { en: 'Mains', fr: 'Plats principaux', rw: 'Ifunguro Nyamukuru' }, sortOrder: 2 },
  { key: 'grill', name: { en: 'Grill', fr: 'Grillades', rw: 'Ibirishijwe' }, sortOrder: 3 },
  { key: 'soft-drinks', name: { en: 'Soft Drinks', fr: 'Boissons', rw: 'Ibinyobwa' }, sortOrder: 4 },
  { key: 'beers', name: { en: 'Local Beers', fr: 'Bières locales', rw: 'Inzoga z’Ubweru' }, sortOrder: 5 },
  { key: 'desserts', name: { en: 'Desserts', fr: 'Desserts', rw: 'Ibyumvyo' }, sortOrder: 6 }
];

// imageKey maps to /public/uploads/src/<key>.jpg (converted to WebP at seed time)
export const ITEMS = [
  // ---- Starters
  {
    cat: 'starters', key: 'beef-brochette', station: 'kitchen', price: 4000, prep: 12,
    tags: ['popular'], allergens: [],
    name: { en: 'Beef Skewers (Brochette)', fr: 'Brochettes de bœuf', rw: 'Inyama y’inka ku macumu' },
    description: { en: 'Three grilled beef skewers with onion and house spice.', fr: 'Trois brochettes de bœuf grillées à l’oignon et épices maison.', rw: 'Inyama y’inka hirya y’imatama n’ipipiro ry’urugo.' },
    options: [{ name: 'Spice level', required: true, multiple: false, choices: [{ label: 'Mild' }, { label: 'Hot', extraPrice: 0 }] }]
  },
  {
    cat: 'starters', key: 'goat-brochette', station: 'kitchen', price: 4500, prep: 14,
    tags: ['popular'], allergens: [],
    name: { en: 'Goat Skewers', fr: 'Brochettes de chèvre', rw: 'Inyama y’ihene ku macumu' },
    description: { en: 'Tender goat meat, grilled over charcoal.', fr: 'Viande de chèvre tendre grillée au charbon.', rw: 'Inyama y’ihene mikomeye irishwe mu makara.' }
  },
  {
    cat: 'starters', key: 'samosa', station: 'kitchen', price: 3000, prep: 8,
    tags: ['vegetarian'], allergens: ['gluten'],
    name: { en: 'Samosas (3 pcs)', fr: 'Samosas (3 pièces)', rw: 'Samosa (3)' },
    description: { en: 'Crispy vegetable samosas with dipping sauce.', fr: 'Samosas croustillants aux légumes, sauce d’accompagnement.', rw: 'Samosa z’imboga zizungu n’umukonde.' }
  },
  {
    cat: 'starters', key: 'fries-basket', station: 'kitchen', price: 3500, prep: 10,
    tags: ['vegetarian'], allergens: [],
    name: { en: 'French Fries Basket', fr: 'Panier de frites', rw: 'Agatebo k’ifiriti' },
    description: { en: 'Golden hand-cut fries with ketchup and mayonnaise.', fr: 'Frites maison dorées, ketchup et mayonnaise.', rw: 'Ifiriti zahindutse n’ukachupi n’amayonezi.' },
    options: [{ name: 'Extras', required: false, multiple: true, choices: [{ label: 'Cheese sauce', extraPrice: 800 }, { label: 'Extra ketchup', extraPrice: 300 }] }]
  },
  {
    cat: 'starters', key: 'mikate', station: 'kitchen', price: 2000, prep: 8,
    tags: ['vegetarian', 'new'], allergens: ['gluten'],
    name: { en: 'Mikate (Fried Dough)', fr: 'Beignets de farine (Mikate)', rw: 'Amateke' },
    description: { en: 'Warm fluffy dough bites, dusted with sugar.', fr: 'Beignets tièdes et moelleux saupoudrés de sucre.', rw: 'Amateke ashyuwe asyuye isukari.' }
  },

  // ---- Mains
  {
    cat: 'mains', key: 'rice-chicken', station: 'kitchen', price: 6500, prep: 20,
    tags: ['popular'], allergens: [],
    name: { en: 'Rice & Beans with Chicken', fr: 'Riz-haricots au poulet', rw: 'Umuceri n’ibishyimbo n’inkoko' },
    description: { en: 'Classic Rwandan plate: rice, red beans and a grilled chicken leg.', fr: 'Plat rwandais classique : riz, haricots rouges et cuisse de poulet grillée.', rw: 'Ifunguro nyarwanda: umuceri, ibishyimbo n’ikigero cy’inkoko.' }
  },
  {
    cat: 'mains', key: 'isombe', station: 'kitchen', price: 5000, prep: 18,
    tags: ['vegetarian'], allergens: [],
    name: { en: 'Isombe with Rice', fr: 'Isombe au riz', rw: 'Isombe n’umuceri' },
    description: { en: 'Slow-cooked cassava leaves in peanut sauce, served with rice.', fr: 'Feuilles de manioc mijotées à la sauce d’arachide, avec riz.', rw: 'Isombe mu rwatsa rw’ubunyobwa, mu kanywacyuza n’umuceri.' },
    options: [{ name: 'Extras', required: false, multiple: true, choices: [{ label: 'Boiled egg', extraPrice: 500 }, { label: 'Smoked fish (ndizi)', extraPrice: 1500 }] }]
  },
  {
    cat: 'mains', key: 'ugali-beef', station: 'kitchen', price: 6000, prep: 22,
    tags: [], allergens: [],
    name: { en: 'Ugali & Beef Stew', fr: 'Ugali au bœuf mijoté', rw: 'Ubugali n’inyama y’inka' },
    description: { en: 'Soft ugali with a rich tomato beef stew.', fr: 'Ugali moelleux et ragoût de bœuf à la tomate.', rw: 'Ubugali bwiza n’inyama y’inka mu rwatsa rw’inyanya.' },
    options: [{ name: 'Spice level', required: true, multiple: false, choices: [{ label: 'Mild' }, { label: 'Medium' }, { label: 'Hot' }] }]
  },
  {
    cat: 'mains', key: 'chapati-wrap', station: 'kitchen', price: 4500, prep: 12,
    tags: ['new'], allergens: ['gluten'],
    name: { en: 'Chapati Wrap with Beef', fr: 'Wrap chapati au bœuf', rw: 'Chapati yuzuye inyama' },
    description: { en: 'Flaky chapati rolled with spiced beef and salad.', fr: 'Chapati feuilletée roulée au bœuf épicé et salade.', rw: 'Chapati yuzuye inyama yipipiye n’urumpya.' }
  },
  {
    cat: 'mains', key: 'spaghetti', station: 'kitchen', price: 5500, prep: 16,
    tags: [], allergens: ['gluten'],
    name: { en: 'Spaghetti Bolognese', fr: 'Spaghetti bolognaise', rw: 'Espageti n’inyama' },
    description: { en: 'Spaghetti in slow-simmered meat sauce with parmesan.', fr: 'Spaghetti à la sauce bolognaise, parmesan.', rw: 'Espageti mu rwatsa rw’inyama n’umulika.' }
  },
  {
    cat: 'mains', key: 'veg-curry', station: 'kitchen', price: 5500, prep: 18,
    tags: ['vegetarian', 'spicy'], allergens: [],
    name: { en: 'Vegetable Curry with Rice', fr: 'Curry végétarien au riz', rw: 'Kari y’imboga n’umuceri' },
    description: { en: 'Seasonal vegetables in coconut curry with steamed rice.', fr: 'Légumes de saison au curry de coco avec riz vapeur.', rw: 'Imboga z’igihe mu kari ya coco n’umuceri watevye.' },
    options: [{ name: 'Spice level', required: true, multiple: false, choices: [{ label: 'Mild' }, { label: 'Hot' }] }]
  },

  // ---- Grill
  {
    cat: 'grill', key: 'grill-chicken', station: 'kitchen', price: 8000, prep: 25,
    tags: ['popular'], allergens: [],
    name: { en: 'Grilled Chicken Quarter', fr: 'Quart de poulet grillé', rw: 'Ikigero cy’inkoko cyurishijwe' },
    description: { en: 'Charcoal-grilled chicken quarter, marinaded overnight.', fr: 'Cuisse de poulet grillée au charbon, marinée une nuit.', rw: 'Ikigero cy’inkoko cyarishwe mu makara cyaruhijwe ijoro.' },
    options: [
      { name: 'Side', required: true, multiple: false, choices: [{ label: 'Fries' }, { label: 'Fried plantain', extraPrice: 500 }, { label: 'Rice' }] },
      { name: 'Extras', required: false, multiple: true, choices: [{ label: 'Extra pili-pili sauce', extraPrice: 500 }] }
    ]
  },
  {
    cat: 'grill', key: 'grill-tilapia', station: 'kitchen', price: 12000, prep: 30,
    tags: [], allergens: ['fish'],
    name: { en: 'Grilled Tilapia (Whole)', fr: 'Tilapia grillée (entière)', rw: 'Ifi yurishijwe (yuzuye)' },
    description: { en: 'Whole Kivu tilapia, grilled with lemon and herbs.', fr: 'Tilapia du Kivu entière, grillée au citron et aux herbes.', rw: 'Ifi ya Kivu yuzuye, yurishije n’indimu n’ibimyunyu.' },
    options: [{ name: 'Side', required: true, multiple: false, choices: [{ label: 'Fries' }, { label: 'Fried plantain', extraPrice: 500 }, { label: 'Rice' }] }]
  },
  {
    cat: 'grill', key: 'mixed-grill', station: 'kitchen', price: 15000, prep: 35,
    tags: ['new'], allergens: [],
    name: { en: 'Mixed Grill Platter', fr: 'Assiette mixte grill', rw: 'Emwe y’ibirishijwe byose' },
    description: { en: 'Beef, goat and chicken skewers with fries and salad. For two.', fr: 'Brochettes de bœuf, chèvre et poulet avec frites et salade. Pour deux.', rw: 'Inyama zose ku macumu n’ifiriti n’urumpya. Ku bagabo babiri.' }
  },
  {
    cat: 'grill', key: 'nyama-choma', station: 'kitchen', price: 12000, prep: 30,
    tags: [], allergens: [],
    name: { en: 'Nyama Choma Beef 500g', fr: 'Nyama choma de bœuf 500g', rw: 'Nyama choma y’inka 500g' },
    description: { en: 'Half kilo of charcoal-roasted beef, salted simply.', fr: 'Demi-kilo de bœuf rôti au charbon, simplement salé.', rw: 'Igiro cy’inyama y’inka ryarishwe mu makara.' }
  },

  // ---- Soft drinks
  {
    cat: 'soft-drinks', key: 'water-05', station: 'bar', price: 1500, prep: 2,
    tags: [], allergens: [],
    name: { en: 'Mineral Water 0.5L', fr: 'Eau minérale 0,5L', rw: 'Amazi 0.5L' },
    description: { en: 'Chilled Rwandan mineral water.', fr: 'Eau minérale rwandaise fraîche.', rw: 'Amazi y’u Rwanda akuze.' }
  },
  {
    cat: 'soft-drinks', key: 'water-1l', station: 'bar', price: 2000, prep: 2,
    tags: [], allergens: [],
    name: { en: 'Mineral Water 1L', fr: 'Eau minérale 1L', rw: 'Amazi 1L' },
    description: { en: 'One-litre chilled mineral water.', fr: 'Eau minérale fraîche d’un litre.', rw: 'Amazi akuze arilitiri imwe.' }
  },
  {
    cat: 'soft-drinks', key: 'fanta-small', station: 'bar', price: 1500, prep: 2,
    tags: ['popular'], allergens: [],
    name: { en: 'Fanta Small', fr: 'Fanta petit', rw: 'Fanta Nto' },
    description: { en: 'Classic orange Fanta, served cold.', fr: 'Fanta orange classique, servi frais.', rw: 'Fanta y’indovu ikoraho, ikaze.' },
    trackStock: true, stockQty: 48, lowStockThreshold: 10
  },
  {
    cat: 'soft-drinks', key: 'coca-cola', station: 'bar', price: 1500, prep: 2,
    tags: ['popular'], allergens: [],
    name: { en: 'Coca-Cola 300ml', fr: 'Coca-Cola 300ml', rw: 'Koka-Kola 300ml' },
    description: { en: 'Ice-cold Coca-Cola.', fr: 'Coca-Cola bien frais.', rw: 'Koka-Kola y’agace kanini.' },
    trackStock: true, stockQty: 60, lowStockThreshold: 12
  },
  {
    cat: 'soft-drinks', key: 'sprite', station: 'bar', price: 1500, prep: 2,
    tags: [], allergens: [],
    name: { en: 'Sprite 300ml', fr: 'Sprite 300ml', rw: 'Sprite 300ml' },
    description: { en: 'Crisp lemon-lime soda.', fr: 'Soda citron-lime pétillant.', rw: 'Soda y’indimu n’ilemu.' }
  },
  {
    cat: 'soft-drinks', key: 'passion-juice', station: 'bar', price: 3000, prep: 6,
    tags: ['new'], allergens: [],
    name: { en: 'Fresh Passion Juice', fr: 'Jus de passion frais', rw: 'Uruju rw’ipashoni' },
    description: { en: 'Pressed passion fruit juice, lightly sweetened.', fr: 'Jus de fruit de la passion pressé, légèrement sucré.', rw: 'Uruju rw’imbuto z’ipashoni rushyizweho isukari rike.' },
    options: [{ name: 'Size', required: true, multiple: false, choices: [{ label: 'Small (300ml)' }, { label: 'Large (500ml)', extraPrice: 1000 }] }]
  },
  {
    cat: 'soft-drinks', key: 'ginger-lemonade', station: 'bar', price: 2500, prep: 6,
    tags: [], allergens: [],
    name: { en: 'Ginger Lemonade', fr: 'Limonade au gingembre', rw: 'Lemonade ya tangawizi' },
    description: { en: 'House lemonade with fresh ginger and mint.', fr: 'Limonade maison au gingembre frais et menthe.', rw: 'Lemonade y’urugo ifite tangawizi n’inzabuni.' }
  },

  // ---- Local beers
  {
    cat: 'beers', key: 'primus', station: 'bar', price: 2000, prep: 2,
    tags: ['popular'], allergens: ['gluten'],
    name: { en: 'Primus 500ml', fr: 'Primus 500ml', rw: 'Primus 500ml' },
    description: { en: 'Rwanda’s favourite lager.', fr: 'La bière préférée du Rwanda.', rw: 'Inzoga y’Ubweru irakundwa cyane mu Rwanda.' },
    trackStock: true, stockQty: 72, lowStockThreshold: 24
  },
  {
    cat: 'beers', key: 'mutzig', station: 'bar', price: 2500, prep: 2,
    tags: [], allergens: ['gluten'],
    name: { en: 'Mützig 500ml', fr: 'Mützig 500ml', rw: 'Mützig 500ml' },
    description: { en: 'Strong, smooth premium lager.', fr: 'Bière premium forte et douce.', rw: 'Inzoga ikomeye kandi yoroha.' }
  },
  {
    cat: 'beers', key: 'skol', station: 'bar', price: 2000, prep: 2,
    tags: [], allergens: ['gluten'],
    name: { en: 'Skol 500ml', fr: 'Skol 500ml', rw: 'Skol 500ml' },
    description: { en: 'Light and refreshing lager.', fr: 'Bière légère et rafraîchissante.', rw: 'Inzoga yoroha kandi ishyuza.' }
  },
  {
    cat: 'beers', key: 'amstel', station: 'bar', price: 2500, prep: 2,
    tags: [], allergens: ['gluten'],
    name: { en: 'Amstel 330ml', fr: 'Amstel 330ml', rw: 'Amstel 330ml' },
    description: { en: 'Premium bottle, served chilled.', fr: 'Bouteille premium, servie fraîche.', rw: 'Umupira mwiza, wuzuye akaze.' }
  },
  {
    cat: 'beers', key: 'bavaria', station: 'bar', price: 4000, prep: 2,
    tags: ['new'], allergens: [],
    name: { en: 'Bavaria Non-Alcoholic', fr: 'Bavaria sans alcool', rw: 'Bavaria itagira urwagwa' },
    description: { en: '0.0% malt drink — full taste, zero alcohol.', fr: 'Boisson maltée 0,0% — tout le goût, zéro alcool.', rw: 'Ikinyobwa cya Versele 0,0% — inyungu yose, urwagwa rubusa.' },
    trackStock: true, stockQty: 24, lowStockThreshold: 6
  },
  {
    cat: 'beers', key: 'turbo-king', station: 'bar', price: 3000, prep: 2,
    tags: [], allergens: ['gluten'],
    name: { en: 'Turbo King 500ml', fr: 'Turbo King 500ml', rw: 'Turbo King 500ml' },
    description: { en: 'Bold dark beer for slow evenings.', fr: 'Bière brune généreuse pour les longues soirées.', rw: 'Inzoga yirabura nini ku mazina yo gupfa.' }
  },

  // ---- Desserts
  {
    cat: 'desserts', key: 'fruit-salad', station: 'dessert', price: 3000, prep: 8,
    tags: ['vegetarian', 'popular'], allergens: [],
    name: { en: 'Fresh Fruit Salad', fr: 'Salade de fruits frais', rw: 'Imbuto zvwagwa' },
    description: { en: 'Pineapple, mango, banana and watermelon of the day.', fr: 'Ananas, mangue, banane et pastèque du jour.', rw: 'Inanasi, igikoma, ingobe n’indimu z’umunsi.' }
  },
  {
    cat: 'desserts', key: 'brownie', station: 'dessert', price: 4500, prep: 10,
    tags: ['new'], allergens: ['gluten', 'dairy', 'nuts'],
    name: { en: 'Chocolate Brownie & Ice Cream', fr: 'Brownie au chocolat et glace', rw: 'Brownie ya cokolade n’ice cream' },
    description: { en: 'Warm fudgy brownie with vanilla ice cream.', fr: 'Brownie tiède fondant avec glace vanille.', rw: 'Brownie bushyuhe n’ice cream ya vanille.' }
  },
  {
    cat: 'desserts', key: 'banana-fritters', station: 'dessert', price: 2500, prep: 10,
    tags: ['vegetarian'], allergens: ['gluten'],
    name: { en: 'Banana Fritters', fr: 'Beignets de banane', rw: 'Amateke y’ibitoki' },
    description: { en: 'Sweet banana fritters with honey drizzle.', fr: 'Beignets de banane sucrés au miel.', rw: 'Amateke y’ibitoki ashyizweho ubuki.' }
  },
  {
    cat: 'desserts', key: 'ice-cream', station: 'dessert', price: 2500, prep: 4,
    tags: [], allergens: ['dairy'],
    name: { en: 'Vanilla Ice Cream (2 scoops)', fr: 'Glace vanille (2 boules)', rw: 'Ice cream ya vanille (2)' },
    description: { en: 'Two scoops of creamy vanilla.', fr: 'Deux boules de vanille crémeuse.', rw: 'Ice cream ya vanille ihagaze.' },
    options: [{ name: 'Topping', required: false, multiple: true, choices: [{ label: 'Chocolate sauce', extraPrice: 500 }, { label: 'Roasted peanuts', extraPrice: 400 }] }]
  },
  {
    cat: 'desserts', key: 'passion-mousse', station: 'dessert', price: 3500, prep: 6,
    tags: [], allergens: ['dairy', 'eggs'],
    name: { en: 'Passion Mousse', fr: 'Mousse de passion', rw: 'Mousse y’ipashoni' },
    description: { en: 'Airy passion-fruit mousse, chilled.', fr: 'Mousse légère au fruit de la passion, bien fraîche.', rw: 'Mousse y’ipashoni yorohewe, ikuze.' }
  }
];

export const PROMOS = [
  { code: 'WELCOME10', type: 'percent', value: 10, maxUses: 100 },
  { code: 'THURSDAY', type: 'fixed', value: 2000, maxUses: 50 }
];

export const SETTINGS = {
  announcement: 'Every Thursday at Cape Town K Hotel! Bring your friends — grill platter + Primus combo',
  taxRate: 0,
  serviceCharge: 0
};
