/**
 * Catalog entities. Every entry is real, checkable content:
 * `Name | aliases (comma separated) | attributes (comma separated)`
 * Attributes drive prompt selectors (e.g. ptype=electric, starter=1).
 */

import { GENERAL_ENTITY_SEEDS } from "./answers-general";
import { NICHE_ENTITY_SEEDS } from "./answers-niche";

export type EntitySeed = {
  id: string;
  name: string;
  type: string;
  aliases: string[];
  attrs: Record<string, string>;
  description?: string;
};

const slug = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

function parse(raw: string, type: string, prefix = type, extra: Record<string, string> = {}): EntitySeed[] {
  return raw
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, aliasPart = "", attrPart = "", description = ""] = line.split("|").map((part) => part.trim());
      const attrs: Record<string, string> = { ...extra };
      for (const pair of attrPart.split(",")) {
        const [key, value] = pair.split("=");
        if (key && value) attrs[key.trim()] = value.trim();
      }
      return {
        id: `${prefix}_${slug(name)}`,
        name,
        type,
        aliases: aliasPart
          ? aliasPart.split(",").map((alias) => alias.trim()).filter(Boolean)
          : [],
        attrs,
        description: description || undefined,
      };
    });
}

// ---------------------------------------------------------------------------
// Pokémon (species only — Trainers, moves and locations are separate types so
// the validator can explain the mismatch instead of inventing an answer).
// Attributes: ptype, starter, legendary.
// ---------------------------------------------------------------------------
const POKEMON = `
Pikachu|pika|ptype=electric
Charizard||ptype=fire
Bulbasaur||ptype=grass,starter=1
Charmander||ptype=fire,starter=1
Squirtle||ptype=water,starter=1
Eevee||ptype=normal
Mewtwo||ptype=psychic,legendary=1
Mew||ptype=psychic,legendary=1
Gengar||ptype=ghost
Snorlax||ptype=normal
Dragonite||ptype=dragon
Gyarados||ptype=water
Lucario||ptype=fighting
Greninja||ptype=water
Gardevoir||ptype=psychic
Sylveon||ptype=fairy
Umbreon||ptype=dark
Vaporeon||ptype=water
Jolteon||ptype=electric
Flareon||ptype=fire
Leafeon||ptype=grass
Glaceon||ptype=ice
Espeon||ptype=psychic
Arceus||ptype=normal,legendary=1
Dialga||ptype=steel,legendary=1
Palkia||ptype=water,legendary=1
Giratina||ptype=ghost,legendary=1
Rayquaza||ptype=dragon,legendary=1
Kyogre||ptype=water,legendary=1
Groudon||ptype=ground,legendary=1
Lugia||ptype=psychic,legendary=1
Ho-Oh||ptype=fire,legendary=1
Celebi||ptype=psychic,legendary=1
Zapdos||ptype=electric,legendary=1
Articuno||ptype=ice,legendary=1
Moltres||ptype=fire,legendary=1
Suicune||ptype=water,legendary=1
Entei||ptype=fire,legendary=1
Raikou||ptype=electric,legendary=1
Latias||ptype=dragon,legendary=1
Latios||ptype=dragon,legendary=1
Jirachi||ptype=steel,legendary=1
Deoxys||ptype=psychic,legendary=1
Darkrai||ptype=dark,legendary=1
Shaymin||ptype=grass,legendary=1
Victini||ptype=psychic,legendary=1
Reshiram||ptype=dragon,legendary=1
Zekrom||ptype=dragon,legendary=1
Xerneas||ptype=fairy,legendary=1
Yveltal||ptype=dark,legendary=1
Zygarde||ptype=dragon,legendary=1
Solgaleo||ptype=psychic,legendary=1
Lunala||ptype=psychic,legendary=1
Necrozma||ptype=psychic,legendary=1
Zacian||ptype=fairy,legendary=1
Zamazenta||ptype=fighting,legendary=1
Eternatus||ptype=poison,legendary=1
Koraidon||ptype=dragon,legendary=1
Miraidon||ptype=electric,legendary=1
Venusaur||ptype=grass
Blastoise||ptype=water
Butterfree||ptype=bug
Beedrill||ptype=bug
Pidgeot||ptype=normal
Rattata||ptype=normal
Raticate||ptype=normal
Arbok||ptype=poison
Raichu||ptype=electric
Sandslash||ptype=ground
Nidoking||ptype=poison
Nidoqueen||ptype=poison
Clefairy||ptype=fairy
Vulpix||ptype=fire
Ninetales||ptype=fire
Jigglypuff||ptype=normal
Zubat||ptype=poison
Oddish||ptype=grass
Persian||ptype=normal
Psyduck||ptype=water
Arcanine||ptype=fire
Poliwrath||ptype=water
Alakazam||ptype=psychic
Machamp||ptype=fighting
Tentacruel||ptype=water
Geodude||ptype=rock
Rapidash||ptype=fire
Slowpoke||ptype=water
Magnemite||ptype=electric
Dodrio||ptype=normal
Dewgong||ptype=water
Muk||ptype=poison
Cloyster||ptype=water
Haunter||ptype=ghost
Onix||ptype=rock
Hypno||ptype=psychic
Kingler||ptype=water
Electrode||ptype=electric
Exeggutor||ptype=grass
Marowak||ptype=ground
Hitmonlee||ptype=fighting
Lickitung||ptype=normal
Weezing||ptype=poison
Rhydon||ptype=ground
Chansey||ptype=normal
Tangela||ptype=grass
Kangaskhan||ptype=normal
Seadra||ptype=water
Starmie||ptype=water
Mr. Mime|mr mime|ptype=psychic
Scyther||ptype=bug
Jynx||ptype=ice
Electabuzz||ptype=electric
Magmar||ptype=fire
Pinsir||ptype=bug
Tauros||ptype=normal
Magikarp||ptype=water
Lapras||ptype=water
Ditto||ptype=normal
Aerodactyl||ptype=rock
Chikorita||ptype=grass,starter=1
Cyndaquil||ptype=fire,starter=1
Totodile||ptype=water,starter=1
Treecko||ptype=grass,starter=1
Torchic||ptype=fire,starter=1
Mudkip||ptype=water,starter=1
Turtwig||ptype=grass,starter=1
Chimchar||ptype=fire,starter=1
Piplup||ptype=water,starter=1
Snivy||ptype=grass,starter=1
Tepig||ptype=fire,starter=1
Oshawott||ptype=water,starter=1
Chespin||ptype=grass,starter=1
Fennekin||ptype=fire,starter=1
Froakie||ptype=water,starter=1
Rowlet||ptype=grass,starter=1
Litten||ptype=fire,starter=1
Popplio||ptype=water,starter=1
Grookey||ptype=grass,starter=1
Scorbunny||ptype=fire,starter=1
Sobble||ptype=water,starter=1
Sprigatito||ptype=grass,starter=1
Fuecoco||ptype=fire,starter=1
Quaxly||ptype=water,starter=1
`;

const POKEMON_TRAINERS = parse(
  `Ash Ketchum|ash|hometown=pallet town
Misty||hometown=cerulean city
Brock||hometown=pewter city
Professor Oak|oak|hometown=pallet town
Gary Oak||hometown=pallet town
Team Rocket||hometown=kanto
Nurse Joy||hometown=kanto
Officer Jenny||hometown=kanto`,
  "pokemon_trainer",
);

const POKEMON_MOVES = parse(
  `Thunderbolt||ptype=electric
Flamethrower||ptype=fire
Surf||ptype=water
Vine Whip||ptype=grass
Psychic||ptype=psychic
Hyper Beam||ptype=normal
Quick Attack||ptype=normal
Earthquake||ptype=ground
Ice Beam||ptype=ice
Fire Blast||ptype=fire`,
  "pokemon_move",
);

const POKEMON_LOCATIONS = parse(
  `Pallet Town||region=kanto
Cerulean City||region=kanto
Viridian Forest||region=kanto
Mt. Moon|mount moon|region=kanto
Safari Zone||region=kanto
Pokémon League|pokemon league|region=kanto
Lavender Town||region=kanto
Saffron City||region=kanto`,
  "pokemon_location",
);

// ---------------------------------------------------------------------------
// Minecraft (item / block / mob are distinct types, so "Creeper" explains itself)
// ---------------------------------------------------------------------------
const MINECRAFT_ITEMS = parse(
  `Diamond||category=material
Emerald||category=material
Netherite Ingot||category=material
Iron Ingot||category=material
Gold Ingot||category=material
Copper Ingot||category=material
Coal||category=material
Charcoal||category=material
Redstone Dust||category=material
Lapis Lazuli||category=material
Quartz||category=material
Amethyst Shard||category=material
Stick||category=material
Wooden Sword||category=tool
Stone Sword||category=tool
Iron Sword||category=tool
Diamond Sword||category=tool
Netherite Sword||category=tool
Bow||category=tool
Arrow||category=tool
Crossbow||category=tool
Trident||category=tool
Shield||category=tool
Fishing Rod||category=tool
Flint and Steel||category=tool
Shears||category=tool
Bucket||category=tool
Water Bucket||category=tool
Lava Bucket||category=tool
Milk Bucket||category=food
Compass||category=tool
Clock||category=tool
Map||category=tool
Spyglass||category=tool
Torch||category=tool
Lantern||category=tool
Campfire||category=tool
Crafting Table||category=tool
Furnace||category=tool
Chest||category=tool
Barrel||category=tool
Ender Chest||category=tool
Shulker Box||category=tool
Anvil||category=tool
Enchanting Table||category=tool
Brewing Stand||category=tool
Cauldron||category=tool
Bed||category=tool
Door||category=tool
Ladder||category=tool
Fence||category=tool
Boat||category=tool
Minecart||category=tool
Rail||category=tool
Redstone Torch||category=tool
Piston||category=tool
Sticky Piston||category=tool
Observer||category=tool
Hopper||category=tool
Dropper||category=tool
Dispenser||category=tool
Lever||category=tool
Button||category=tool
Pressure Plate||category=tool
Repeater||category=tool
Comparator||category=tool
Note Block||category=tool
Jukebox||category=tool
Beacon||category=tool
Conduit||category=tool
Totem of Undying||category=tool
Ender Pearl||category=material
Eye of Ender||category=material
Blaze Rod||category=material
Blaze Powder||category=material
Ghast Tear||category=material
Slime Ball||category=material
Magma Cream||category=material
Gunpowder||category=material
Bone||category=material
String||category=material
Feather||category=material
Leather||category=material
Paper||category=material
Book||category=material
Written Book||category=material
Sugar||category=food
Wheat||category=food
Bread||category=food
Apple||category=food
Golden Apple||category=food
Carrot||category=food
Potato||category=food
Beetroot||category=food
Melon Slice||category=food
Sweet Berries||category=food
Cookie||category=food
Cake||category=food
Pumpkin Pie||category=food
Steak||category=food
Cooked Chicken||category=food
Rotten Flesh||category=food
Spider Eye||category=food
Egg||category=food
Honey Bottle||category=food
Potion||category=material
Splash Potion||category=material
Dragon's Breath||category=material
Nether Star||category=material
Heart of the Sea||category=material
Nautilus Shell||category=material
Phantom Membrane||category=material
Rabbit's Foot||category=material
Turtle Shell||category=material
Elytra||category=tool
Firework Rocket||category=tool
Name Tag||category=tool
Saddle||category=tool
Lead||category=tool
Bundle||category=tool
Brush||category=tool
Goat Horn||category=tool
Recovery Compass||category=tool
Echo Shard||category=material
Music Disc||category=tool
Bamboo||category=material
Kelp||category=food
Sugar Cane||category=material`,
  "minecraft_item",
);

const MINECRAFT_BLOCKS = parse(
  `Grass Block||
Dirt||
Stone||
Cobblestone||
Oak Planks||
Sand||
Gravel||
Bedrock||
Obsidian||
Netherrack||
Soul Sand||
Glowstone||
Sandstone||
Wool||
Glass||
Bricks||
Bookshelf||
TNT||
Sponge||
Ice||
Snow Block||
Clay||
Pumpkin||
Melon||
Cactus||
Moss Block||
Deepslate||
Calcite||
Amethyst Block||
Copper Block||
Diamond Block||
Emerald Block||
Gold Block||
Iron Block||
Netherite Block||
Quartz Block||
Prismarine||
Sea Lantern||
Shroomlight||
Honey Block||
Slime Block||
Terracotta||
Concrete||
Glazed Terracotta||
Warped Stem||`,
  "minecraft_block",
);

const MINECRAFT_MOBS = parse(
  `Creeper||hostile=1
Zombie||hostile=1
Skeleton||hostile=1
Spider||hostile=1
Enderman||hostile=1
Witch||hostile=1
Slime||hostile=1
Ghast||hostile=1
Blaze||hostile=1
Piglin||hostile=1
Villager||hostile=0
Iron Golem||hostile=0
Warden||hostile=1
Ender Dragon||hostile=1
Wither||hostile=1
Phantom||hostile=1
Drowned||hostile=1
Husk||hostile=1
Stray||hostile=1
Pillager||hostile=1
Vindicator||hostile=1
Evoker||hostile=1
Ravager||hostile=1
Guardian||hostile=1
Elder Guardian||hostile=1
Shulker||hostile=1
Silverfish||hostile=1
Endermite||hostile=1
Magma Cube||hostile=1
Bat||hostile=0
Cow||hostile=0
Pig||hostile=0
Sheep||hostile=0
Chicken||hostile=0
Horse||hostile=0
Wolf||hostile=0
Cat||hostile=0
Fox||hostile=0
Bee||hostile=0
Axolotl||hostile=0
Turtle||hostile=0
Dolphin||hostile=0
Squid||hostile=0
Panda||hostile=0
Polar Bear||hostile=0
Llama||hostile=0
Goat||hostile=0
Frog||hostile=0
Allay||hostile=0
Sniffer||hostile=0`,
  "minecraft_mob",
);

// ---------------------------------------------------------------------------
// Candy: products vs brands vs companies (the required wrong-type case)
// ---------------------------------------------------------------------------
const CANDY_PRODUCTS = parse(
  `Snickers||brand=Mars
Mars Bar||brand=Mars
Twix||brand=Mars
M&M's|mms, m and ms|brand=Mars
Kit Kat||brand=Nestle
Reese's Peanut Butter Cups|reese's, reeses|brand=Hershey
Hershey's Milk Chocolate Bar|hershey bar, hersheys chocolate bar|brand=Hershey
Milky Way||brand=Mars
3 Musketeers||brand=Mars
Almond Joy||brand=Hershey
Mounds||brand=Hershey
York Peppermint Pattie||brand=Hershey
Butterfinger||brand=Ferrero
Baby Ruth||brand=Ferrero
Crunch Bar||brand=Ferrero
100 Grand||brand=Ferrero
Skittles||brand=Mars
Starburst||brand=Mars
Sour Patch Kids||brand=Mondelez
Haribo Goldbears|gummy bears|brand=Haribo
Swedish Fish||brand=Mondelez
Twizzlers||brand=Hershey
Red Vines||brand=American Licorice
Nerds||brand=Ferrara
Laffy Taffy||brand=Ferrara
Smarties||brand=Nestle
SweeTarts||brand=Ferrara
Jolly Rancher||brand=Hershey
Warheads||brand=Impact
Airheads||brand=Perfetti Van Melle
Now and Later||brand=Ferrara
Mike and Ike||brand=Just Born
Hot Tamales||brand=Just Born
Peeps||brand=Just Born
Candy Corn||brand=Brach's
Dum Dums||brand=Spangler
Blow Pop||brand=Charms
Tootsie Roll||brand=Tootsie Roll Industries
Tootsie Pop||brand=Tootsie Roll Industries
Junior Mints||brand=Tootsie Roll Industries
Raisinets||brand=Nestle
Goobers||brand=Nestle
Heath Bar||brand=Hershey
PayDay||brand=Hershey
Take 5||brand=Hershey
Whatchamacallit||brand=Hershey
Zero Bar||brand=Hershey
Charleston Chew||brand=Tootsie Roll Industries
Bit-O-Honey||brand=Pearson's
Lemonheads||brand=Ferrara
Atomic Fireball||brand=Ferrara
Jawbreaker||brand=Ferrara
Runts||brand=Ferrara
Fun Dip||brand=Ferrara
Pixy Stix||brand=Ferrara
Pop Rocks||brand=Zeta Espacial
Hubba Bubba||brand=Mars
Big League Chew||brand=Ford Gum
Bubble Tape||brand=Hubba Bubba
Chupa Chups||brand=Perfetti Van Melle
Mentos||brand=Perfetti Van Melle
Pocky||brand=Glico
Ferrero Rocher||brand=Ferrero
Nutella||brand=Ferrero`,
  "candy_product",
);

const CANDY_BRANDS = parse(
  `Hershey's|hersheys, hershey|parent=Hershey Company
Cadbury||parent=Mondelez
Haribo||parent=Haribo
Ferrero||parent=Ferrero
Spangler||parent=Spangler Candy Company
Brach's||parent=Ferrara
Charms||parent=Tootsie Roll Industries
`,
  "candy_brand",
);

const COMPANIES = parse(
  `Hershey|hershey company, the hershey company|
Mars|mars incorporated|
Nestlé|nestle|
Ferrero||
Cadbury||
Mondelez|mondelez international|
Haribo||
Tootsie Roll Industries||
Ferrara Candy Company|ferrara|
Lindt|lindt & sprüngli|
Godiva||
Apple|apple inc.|
Microsoft||
Google|alphabet|
Sony||
Nintendo||
Disney|the walt disney company|
Fox|fox corporation|
NASA||
Foxconn||
Lego|the lego group|`,
  "company",
);

// ---------------------------------------------------------------------------
// Elements (118) — a broad, audited Beehive pool
// ---------------------------------------------------------------------------
const ELEMENTS = parse(
  `Hydrogen||z=1
Helium||z=2
Lithium||z=3
Beryllium||z=4
Boron||z=5
Carbon||z=6
Nitrogen||z=7
Oxygen||z=8
Fluorine||z=9
Neon||z=10
Sodium||z=11
Magnesium||z=12
Aluminium|aluminum|z=13
Silicon||z=14
Phosphorus||z=15
Sulfur|sulphur|z=16
Chlorine||z=17
Argon||z=18
Potassium||z=19
Calcium||z=20
Scandium||z=21
Titanium||z=22
Vanadium||z=23
Chromium||z=24
Manganese||z=25
Iron||z=26
Cobalt||z=27
Nickel||z=28
Copper||z=29
Zinc||z=30
Gallium||z=31
Germanium||z=32
Arsenic||z=33
Selenium||z=34
Bromine||z=35
Krypton||z=36
Rubidium||z=37
Strontium||z=38
Yttrium||z=39
Zirconium||z=40
Niobium||z=41
Molybdenum||z=42
Technetium||z=43
Ruthenium||z=44
Rhodium||z=45
Palladium||z=46
Silver||z=47
Cadmium||z=48
Indium||z=49
Tin||z=50
Antimony||z=51
Tellurium||z=52
Iodine||z=53
Xenon||z=54
Caesium|cesium|z=55
Barium||z=56
Lanthanum||z=57
Cerium||z=58
Praseodymium||z=59
Neodymium||z=60
Promethium||z=61
Samarium||z=62
Europium||z=63
Gadolinium||z=64
Terbium||z=65
Dysprosium||z=66
Holmium||z=67
Erbium||z=68
Thulium||z=69
Ytterbium||z=70
Lutetium||z=71
Hafnium||z=72
Tantalum||z=73
Tungsten||z=74
Rhenium||z=75
Osmium||z=76
Iridium||z=77
Platinum||z=78
Gold||z=79
Mercury||z=80
Thallium||z=81
Lead||z=82
Bismuth||z=83
Polonium||z=84
Astatine||z=85
Radon||z=86
Francium||z=87
Radium||z=88
Actinium||z=89
Thorium||z=90
Protactinium||z=91
Uranium||z=92
Neptunium||z=93
Plutonium||z=94
Americium||z=95
Curium||z=96
Berkelium||z=97
Californium||z=98
Einsteinium||z=99
Fermium||z=100
Mendelevium||z=101
Nobelium||z=102
Lawrencium||z=103
Rutherfordium||z=104
Dubnium||z=105
Seaborgium||z=106
Bohrium||z=107
Hassium||z=108
Meitnerium||z=109
Darmstadtium||z=110
Roentgenium||z=111
Copernicium||z=112
Nihonium||z=113
Flerovium||z=114
Moscovium||z=115
Livermorium||z=116
Tennessine||z=117
Oganesson||z=118`,
  "element",
);

// ---------------------------------------------------------------------------
// US states (50)
// ---------------------------------------------------------------------------
const US_STATES = parse(
  `California|calif|abbr=CA
Texas||abbr=TX
Florida||abbr=FL
New York||abbr=NY
Pennsylvania||abbr=PA
Illinois||abbr=IL
Ohio||abbr=OH
Georgia||abbr=GA
North Carolina||abbr=NC
Michigan||abbr=MI
New Jersey||abbr=NJ
Virginia||abbr=VA
Washington||abbr=WA
Arizona||abbr=AZ
Massachusetts||abbr=MA
Tennessee||abbr=TN
Indiana||abbr=IN
Missouri||abbr=MO
Maryland||abbr=MD
Wisconsin||abbr=WI
Colorado||abbr=CO
Minnesota||abbr=MN
South Carolina||abbr=SC
Alabama||abbr=AL
Louisiana||abbr=LA
Kentucky||abbr=KY
Oregon||abbr=OR
Oklahoma||abbr=OK
Connecticut||abbr=CT
Utah||abbr=UT
Iowa||abbr=IA
Nevada||abbr=NV
Arkansas||abbr=AR
Mississippi||abbr=MS
Kansas||abbr=KS
New Mexico||abbr=NM
Nebraska||abbr=NE
Idaho||abbr=ID
West Virginia||abbr=WV
Hawaii||abbr=HI
New Hampshire||abbr=NH
Maine||abbr=ME
Montana||abbr=MT
Rhode Island||abbr=RI
Delaware||abbr=DE
South Dakota||abbr=SD
North Dakota||abbr=ND
Alaska||abbr=AK
Vermont||abbr=VT
Wyoming||abbr=WY`,
  "us_state",
);

// ---------------------------------------------------------------------------
// Smaller broad pools
// ---------------------------------------------------------------------------
const DOG_BREEDS = parse(
  `Labrador Retriever|lab, labrador|
German Shepherd|alsatian|
Golden Retriever|golden|
Bulldog|english bulldog|
Poodle||
Beagle||
Rottweiler||
Yorkshire Terrier|yorkie|
Dachshund|sausage dog|
Siberian Husky|husky|
Boxer||
Pug||
Corgi|welsh corgi|
Doberman Pinscher|doberman|
Great Dane||
Shih Tzu||
French Bulldog|frenchie|
Border Collie||
Chihuahua||
Australian Shepherd|aussie|
Pomeranian||
Bernese Mountain Dog|bernese|
Cocker Spaniel||
Greyhound||
Dalmatian||
Pit Bull|american pit bull terrier|
Shiba Inu|shiba|
Basset Hound||
Akita||
Newfoundland||`,
  "dog_breed",
);

const CAT_BREEDS = parse(
  `Persian||
Siamese||
Maine Coon||
Bengal||
Ragdoll||
British Shorthair||
Sphynx|hairless cat|
Scottish Fold||
Abyssinian||
Russian Blue||
Norwegian Forest Cat||
American Shorthair||
Birman||
Oriental Shorthair||
Manx||
Turkish Angora||
Devon Rex||
Exotic Shorthair||
Burmese||
Himalayan||`,
  "cat_breed",
);

const INSTRUMENTS = parse(
  `Piano||family=keyboard
Guitar||family=string
Violin||family=string
Drums||family=percussion
Flute||family=woodwind
Trumpet||family=brass
Saxophone||family=woodwind
Cello||family=string
Clarinet||family=woodwind
Trombone||family=brass
Bass Guitar|bass|family=string
Ukulele||family=string
Harp||family=string
Banjo||family=string
Oboe||family=woodwind
Bassoon||family=woodwind
French Horn|horn|family=brass
Tuba||family=brass
Xylophone||family=percussion
Accordion||family=other
Harmonica||family=other
Organ||family=keyboard
Synthesizer|synth|family=keyboard
Viola||family=string
Double Bass|contrabass|family=string
Timpani||family=percussion
Mandolin||family=string
Recorder||family=woodwind
Maracas||family=percussion
Tambourine||family=percussion`,
  "instrument",
);

const SPORTS = parse(
  `Football|soccer|
Basketball||
Baseball||
Tennis||
Cricket||
Golf||
Rugby||
Hockey|ice hockey|
Volleyball||
Swimming||
Athletics|track and field|
Boxing||
Cycling||
Skiing||
Snowboarding||
Surfing||
Skateboarding||
Gymnastics||
Wrestling||
Judo||
Taekwondo||
Badminton||
Table Tennis|ping pong|
Squash||
Handball||
Netball||
Softball||
Archery||
Fencing||
Rowing||
Sailing||
Climbing||
Formula One|f1|
American Football|gridiron|
Darts||
Snooker||
Bowling||
Chess||
`,
  "sport",
);

const FRUITS = parse(
  `Apple||
Banana||
Orange||
Strawberry||
Grape||
Watermelon||
Pineapple||
Mango||
Peach||
Pear||
Cherry||
Blueberry||
Raspberry||
Lemon||
Lime||
Kiwi||
Papaya||
Coconut||
Pomegranate||
Fig||
Plum||
Apricot||
Grapefruit||
Cantaloupe||
Honeydew||
Avocado||
Guava||
Lychee||
Dragon Fruit||
Passion Fruit||
Persimmon||
Cranberry||
Blackberry||
`,
  "fruit",
);

const VEGETABLES = parse(
  `Carrot||
Potato||
Tomato||
Onion||
Broccoli||
Spinach||
Lettuce||
Cucumber||
Pepper|bell pepper|
Pumpkin||
Corn||
Pea||
Bean||
Cabbage||
Cauliflower||
Celery||
Asparagus||
Zucchini||
Eggplant|aubergine|
Radish||
Beetroot|beet|
Sweet Potato||
Mushroom||
Garlic||
Ginger||
Turnip||
Leek||
Brussels Sprout||
Kale||
Artichoke||
`,
  "vegetable",
);

const PIZZA_TOPPINGS = parse(
  `Pepperoni||
Mushroom||
Cheese|mozzarella|
Sausage||
Bacon||
Ham||
Pineapple||
Onion||
Bell Pepper||
Olive||
Tomato||
Chicken||
Beef||
Spinach||
Jalapeño|jalapeno|
Anchovy||
Artichoke||
Basil||
Garlic||
Egg||
`,
  "pizza_topping",
);

const ICE_CREAM_FLAVORS = parse(
  `Vanilla||
Chocolate||
Strawberry||
Mint Chocolate Chip||
Cookies and Cream||
Rocky Road||
Butter Pecan||
Neapolitan||
Coffee||
Pistachio||
Birthday Cake||
Coconut||
Mango||
Lemon||
Raspberry||
Caramel||
Cookie Dough||
Matcha||
Bubblegum||
Cherry||
`,
  "ice_cream_flavor",
);

const BREAKFAST_FOODS = parse(
  `Eggs||
Bacon||
Pancakes||
Waffles||
Cereal||
Toast||
Oatmeal||
Yogurt||
Bagel||
Croissant||
Sausage||
Hash Browns||
Muffin||
Fruit||
Smoothie||
Orange Juice|oj|
Coffee||
Tea||
Granola||
French Toast||
Breakfast Burrito||
Porridge||
`,
  "breakfast_food",
);

const ANIMALS = parse(
  `Lion||
Tiger||
Elephant||
Giraffe||
Zebra||
Monkey||
Bear||
Wolf||
Fox||
Rabbit||
Deer||
Horse||
Cow||
Pig||
Sheep||
Goat||
Chicken||
Duck||
Eagle||
Owl||
Penguin||
Dolphin||
Whale||
Shark||
Octopus||
Turtle||
Snake||
Frog||
Crocodile||
Kangaroo||
Koala||
Panda||
Camel||
Hippopotamus||
Rhinoceros||
Leopard||
Cheetah||
Squirrel||
Bat||
Bee||
Ant||
Spider||
`,
  "animal",
);

const COLORS = parse(
  `Red||
Blue||
Green||
Yellow||
Orange||
Purple||
Pink||
Black||
White||
Brown||
Grey|gray|
Teal||
Turquoise||
Gold||
Silver||
Maroon||
Navy||
Beige||
`,
  "color",
);

const BOARD_GAMES = parse(
  `Monopoly||
Chess||
Scrabble||
Clue|cluedo|
Risk||
Catan|settlers of catan|
Ticket to Ride||
Carcassonne||
Pandemic||
Yahtzee||
Sorry!|sorry|
Connect Four||
Guess Who?||
Trivial Pursuit||
Battleship||
Checkers|draughts|
Backgammon||
Jenga||
Pictionary||
Twister||
Othello|reversi|
Stratego||
`,
  "board_game",
);

const PLANETS = parse(
  `Mercury||order=1
Venus||order=2
Earth||order=3
Mars||order=4
Jupiter||order=5
Saturn||order=6
Uranus||order=7
Neptune||order=8`,
  "planet",
);

const PROGRAMMING_LANGUAGES = parse(
  `JavaScript|js|
Python||
Java||
C++|cpp|
C#|csharp|
TypeScript|ts|
Ruby||
Go|golang|
Rust||
PHP||
Swift||
Kotlin||
SQL||
HTML||
CSS||
Scala||
Perl||
Haskell||
Elixir||
Lua||`,
  "programming_language",
);

const SUPERHEROES = parse(
  `Superman||
Batman||
Spider-Man|spiderman, spider man|
Wonder Woman||
Iron Man||
Captain America||
Thor||
Hulk|the hulk|
Black Widow||
Flash|the flash|
Aquaman||
Green Lantern||
Wolverine||
Storm||
Black Panther||
Doctor Strange||
Deadpool||
Cyclops||
Jean Grey||
Robin||
Supergirl||
Batgirl||
Green Arrow||
Ant-Man||
Scarlet Witch||
`,
  "superhero",
);

const DISNEY_CHARACTERS = parse(
  `Mickey Mouse|mickey|
Minnie Mouse|minnie|
Donald Duck|donald|
Goofy||
Pluto||
Simba||
Mufasa||
Ariel||
Belle||
Beast||
Aladdin||
Jasmine||
Genie||
Elsa||
Anna||
Olaf||
Moana||
Mulan||
Cinderella||
Snow White||
Peter Pan||
Tinker Bell||
Pinocchio||
Dumbo||
Bambi||
Woody||
Buzz Lightyear|buzz|
Nemo||
Dory||
Stitch||
`,
  "disney_character",
);

const HP_CHARACTERS = parse(
  `Harry Potter|harry|
Hermione Granger|hermione|
Ron Weasley|ron|
Dumbledore|albus dumbledore|
Snape|severus snape|
Voldemort|tom riddle|
Hagrid|rubeus hagrid|
Draco Malfoy|draco|
Sirius Black|sirius|
Dobby||
McGonagall|minerva mcgonagall|
Luna Lovegood|luna|
Neville Longbottom|neville|
Fred Weasley|fred|
George Weasley|george|
Ginny Weasley|ginny|
Bellatrix Lestrange|bellatrix|
Lucius Malfoy|lucius|
Remus Lupin|lupin|
Tonks|nymphadora tonks|
`,
  "hp_character",
);

const SW_CHARACTERS = parse(
  `Luke Skywalker|luke|
Darth Vader|vader|
Princess Leia|leia|
Han Solo|han|
Yoda||
Obi-Wan Kenobi|obi wan, ben kenobi|
Chewbacca|chewie|
R2-D2|r2d2|
C-3PO|c3po|
Emperor Palpatine|palpatine, darth sidious|
Kylo Ren|kylo|
Rey||
Finn||
Poe Dameron|poe|
Mace Windu||
Darth Maul|maul|
Boba Fett||
Jabba the Hutt|jabba|
Padmé Amidala|padme|
Lando Calrissian|lando|
`,
  "sw_character",
);

const CITIES = parse(
  `New York City|nyc, new york|
Los Angeles|la|
Chicago||
Toronto||
Sydney||
Melbourne||
Rio de Janeiro|rio|
Barcelona||
Amsterdam||
Venice||
Dubai||
Hong Kong||
Mumbai||
Bangkok||
Istanbul||
Las Vegas||
San Francisco||
Seattle||
Boston||
Miami||
`,
  "city",
);

export const ENTITY_SEEDS: EntitySeed[] = [
  ...parse(POKEMON, "pokemon_species"),
  ...POKEMON_TRAINERS,
  ...POKEMON_MOVES,
  ...POKEMON_LOCATIONS,
  ...MINECRAFT_ITEMS,
  ...MINECRAFT_BLOCKS,
  ...MINECRAFT_MOBS,
  ...CANDY_PRODUCTS,
  ...CANDY_BRANDS,
  ...COMPANIES,
  ...ELEMENTS,
  ...US_STATES,
  ...DOG_BREEDS,
  ...CAT_BREEDS,
  ...INSTRUMENTS,
  ...SPORTS,
  ...FRUITS,
  ...VEGETABLES,
  ...PIZZA_TOPPINGS,
  ...ICE_CREAM_FLAVORS,
  ...BREAKFAST_FOODS,
  ...ANIMALS,
  ...COLORS,
  ...BOARD_GAMES,
  ...PLANETS,
  ...PROGRAMMING_LANGUAGES,
  ...SUPERHEROES,
  ...DISNEY_CHARACTERS,
  ...HP_CHARACTERS,
  ...SW_CHARACTERS,
  ...CITIES,
  ...GENERAL_ENTITY_SEEDS,
  ...NICHE_ENTITY_SEEDS,
];

export { parse as parseEntityBlock, slug as entitySlug };
