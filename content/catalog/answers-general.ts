/**
 * Second wave of answerable entities. Kept separate from entities.ts so the
 * original audited catalog stays readable. Same line format:
 * Name | aliases | attributes.
 */

import type { EntitySeed } from "./entities";

function parse(raw: string, type: string, prefix = type, extra: Record<string, string> = {}): EntitySeed[] {
  return raw
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, aliasPart = "", attrPart = ""] = line.split("|").map((part) => part.trim());
      const attrs: Record<string, string> = { ...extra };
      for (const pair of attrPart.split(",")) {
        const [key, value] = pair.split("=");
        if (key && value) attrs[key.trim()] = value.trim();
      }
      const slug = name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      return {
        id: `${prefix}_${slug}`,
        name,
        type,
        aliases: aliasPart ? aliasPart.split(",").map((alias) => alias.trim()).filter(Boolean) : [],
        attrs,
      };
    });
}

// More Gen 1 species, then the remaining starter lines. Primary type is stored
// so the type prompts keep growing with the species pool.
const MORE_POKEMON = parse(
  `
Caterpie||ptype=bug
Metapod||ptype=bug
Weedle||ptype=bug
Kakuna||ptype=bug
Pidgey||ptype=normal
Spearow||ptype=normal
Ekans||ptype=poison
Sandshrew||ptype=ground
Nidoran♀|nidoran female|ptype=poison
Nidoran♂|nidoran male|ptype=poison
Clefable||ptype=fairy
Oddish||ptype=grass
Gloom||ptype=grass
Vileplume||ptype=grass
Paras||ptype=bug
Parasect||ptype=bug
Venonat||ptype=bug
Venomoth||ptype=bug
Diglett||ptype=ground
Dugtrio||ptype=ground
Meowth||ptype=normal
Persian||ptype=normal
Psyduck||ptype=water
Golduck||ptype=water
Mankey||ptype=fighting
Primeape||ptype=fighting
Growlithe||ptype=fire
Arcanine||ptype=fire
Poliwag||ptype=water
Poliwhirl||ptype=water
Poliwrath||ptype=water
Abra||ptype=psychic
Kadabra||ptype=psychic
Alakazam||ptype=psychic
Machop||ptype=fighting
Machoke||ptype=fighting
Machamp||ptype=fighting
Bellsprout||ptype=grass
Weepinbell||ptype=grass
Victreebel||ptype=grass
Tentacool||ptype=water
Tentacruel||ptype=water
Geodude||ptype=rock
Graveler||ptype=rock
Golem||ptype=rock
Ponyta||ptype=fire
Rapidash||ptype=fire
Slowpoke||ptype=water
Slowbro||ptype=water
Magnemite||ptype=electric
Magneton||ptype=electric
Farfetch'd|farfetchd|ptype=normal
Doduo||ptype=normal
Dodrio||ptype=normal
Seel||ptype=water
Dewgong||ptype=water
Grimer||ptype=poison
Muk||ptype=poison
Shellder||ptype=water
Cloyster||ptype=water
Gastly||ptype=ghost
Haunter||ptype=ghost
Onix||ptype=rock
Drowzee||ptype=psychic
Hypno||ptype=psychic
Krabby||ptype=water
Kingler||ptype=water
Voltorb||ptype=electric
Electrode||ptype=electric
Exeggcute||ptype=grass
Exeggutor||ptype=grass
Cubone||ptype=ground
Marowak||ptype=ground
Hitmonlee||ptype=fighting
Hitmonchan||ptype=fighting
Lickitung||ptype=normal
Koffing||ptype=poison
Weezing||ptype=poison
Rhyhorn||ptype=ground
Rhydon||ptype=ground
Chansey||ptype=normal
Tangela||ptype=grass
Kangaskhan||ptype=normal
Horsea||ptype=water
Seadra||ptype=water
Goldeen||ptype=water
Seaking||ptype=water
Staryu||ptype=water
Starmie||ptype=water
Mr. Mime|mister mime|ptype=psychic
Scyther||ptype=bug
Jynx||ptype=ice
Electabuzz||ptype=electric
Magmar||ptype=fire
Pinsir||ptype=bug
Tauros||ptype=normal
Magikarp||ptype=water
Lapras||ptype=water
Ditto||ptype=normal
Porygon||ptype=normal
Omanyte||ptype=rock
Omastar||ptype=rock
Kabuto||ptype=rock
Kabutops||ptype=rock
Aerodactyl||ptype=rock
Dratini||ptype=dragon
Dragonair||ptype=dragon
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
Mareep||ptype=electric
Flaaffy||ptype=electric
Ampharos||ptype=electric
Shinx||ptype=electric
Luxio||ptype=electric
Luxray||ptype=electric
Pachirisu||ptype=electric
Emolga||ptype=electric
Tynamo||ptype=electric
Eelektrik||ptype=electric
Helioptile||ptype=electric
Heliolisk||ptype=electric
Toxel||ptype=electric
Yamper||ptype=electric
Pawmi||ptype=electric
Charmeleon||ptype=fire
Wartortle||ptype=water
Ivysaur||ptype=grass
`,
  "pokemon_species",
);

const MORE_ANIMALS = parse(
  `
Aardvark||
Albatross||
Alligator||
Alpaca||
Anaconda||
Anteater||
Antelope||
Armadillo||
Axolotl||
Baboon||
Badger||
Barracuda||
Bat||
Beaver||
Bison||
Black bear||
Boar||
Bobcat||
Bongo||
Bonobo||
Bull shark||
Bumblebee||
Butterfly||
Camel||
Capybara||
Caribou||
Cassowary||
Chameleon||
Cheetah||
Chimpanzee||
Chinchilla||
Chipmunk||
Cobra||
Cockatoo||
Condor||
Cougar||
Cow||
Coyote||
Crab||
Crane||
Crocodile||
Crow||
Cuttlefish||
Deer||
Dingo||
Dodo||
Dolphin||
Donkey||
Dove||
Dragonfly||
Duck||
Eagle||
Eel||
Elephant||
Elk||
Emu||
Falcon||
Ferret||
Finch||
Flamingo||
Fox||
Frog||
Gazelle||
Gecko||
Gerbil||
Gibbon||
Giraffe||
Goat||
Goose||
Gorilla||
Grasshopper||
Grizzly bear||
Groundhog||
Guanaco||
Guinea pig||
Gull||
Hamster||
Hare||
Hawk||
Hedgehog||
Heron||
Hippopotamus||
Hornet||
Horse||
Hummingbird||
Hyena||
Ibex||
Iguana||
Impala||
Jackal||
Jaguar||
Jellyfish||
Kangaroo||
Koala||
Komodo dragon||
Kookaburra||
Lemur||
Leopard||
Lion||
Lizard||
Llama||
Lobster||
Lynx||
Macaw||
Magpie||
Manatee||
Mandrill||
Meerkat||
Mink||
Mole||
Mongoose||
Monkey||
Moose||
Mosquito||
Moth||
Mouse||
Mule||
Narwhal||
Newt||
Nightingale||
Ocelot||
Octopus||
Okapi||
Opossum||
Orangutan||
Orca||
Ostrich||
Otter||
Owl||
Ox||
Panda||
Pangolin||
Panther||
Parrot||
Peacock||
Pelican||
Penguin||
Pheasant||
Pig||
Pigeon||
Piranha||
Platypus||
Polar bear||
Porcupine||
Porpoise||
Prairie dog||
Puffin||
Puma||
Quail||
Quokka||
Rabbit||
Raccoon||
Ram||
Rat||
Rattlesnake||
Raven||
Reindeer||
Rhinoceros||
Roadrunner||
American robin|robin|
Salamander||
Salmon||
Sardine||
Scorpion||
Sea lion||
Seahorse||
Seal||
Serval||
Shark||
Sheep||
Shrimp||
Skunk||
Sloth||
Snail||
Snake||
Snow leopard||
Sparrow||
Spider||
Squid||
Squirrel||
Starfish||
Stingray||
Stork||
Swan||
Tapir||
Tarantula||
Termite||
Tiger||
Toad||
Tortoise||
Toucan||
Turkey||
Turtle||
Vulture||
Wallaby||
Walrus||
Warthog||
Wasp||
Weasel||
Whale||
Wildebeest||
Wolf||
Wolverine||
Wombat||
Woodpecker||
Worm||
Yak||
Zebra||
`,
  "animal",
);

const MORE_DOGS = parse(
  `
Affenpinscher||
Afghan Hound||
Airedale Terrier||
Akita||
Alaskan Malamute||
American Bulldog||
American Eskimo Dog||
American Pit Bull Terrier||
Anatolian Shepherd||
Australian Cattle Dog||
Australian Shepherd||
Australian Terrier||
Basenji||
Basset Hound||
Beagle||
Bearded Collie||
Bernese Mountain Dog||
Bichon Frise||
Bloodhound||
Border Collie||
Border Terrier||
Borzoi||
Boston Terrier||
Bouvier des Flandres||
Boxer||
Briard||
Brittany||
Bull Terrier||
Bulldog||
Bullmastiff||
Cairn Terrier||
Cane Corso||
Cardigan Welsh Corgi||
Cavalier King Charles Spaniel||
Chesapeake Bay Retriever||
Chihuahua||
Chow Chow||
Cocker Spaniel||
Collie||
Coton de Tulear||
Dachshund||
Dalmatian||
Doberman Pinscher||
Dogue de Bordeaux||
English Cocker Spaniel||
English Setter||
English Springer Spaniel||
Flat-Coated Retriever||
French Bulldog||
German Shepherd||
German Shorthaired Pointer||
German Wirehaired Pointer||
Giant Schnauzer||
Golden Retriever||
Gordon Setter||
Great Dane||
Great Pyrenees||
Greyhound||
Havanese||
Ibizan Hound||
Irish Setter||
Irish Wolfhound||
Italian Greyhound||
Jack Russell Terrier||
Japanese Chin||
Keeshond||
Kerry Blue Terrier||
Komondor||
Kuvasz||
Labrador Retriever||
Lakeland Terrier||
Lhasa Apso||
Maltese||
Manchester Terrier||
Mastiff||
Miniature Pinscher||
Miniature Schnauzer||
Newfoundland||
Norfolk Terrier||
Norwegian Elkhound||
Norwich Terrier||
Old English Sheepdog||
Otterhound||
Papillon||
Parson Russell Terrier||
Pekingese||
Pembroke Welsh Corgi||
Petit Basset Griffon Vendéen||
Pharaoh Hound||
Pointer||
Pomeranian||
Poodle||
Portuguese Water Dog||
Pug||
Puli||
Rhodesian Ridgeback||
Rottweiler||
Saint Bernard||
Saluki||
Samoyed||
Schipperke||
Scottish Deerhound||
Scottish Terrier||
Sealyham Terrier||
Shar Pei||
Shetland Sheepdog||
Shiba Inu||
Shih Tzu||
Siberian Husky||
Silky Terrier||
Soft Coated Wheaten Terrier||
Staffordshire Bull Terrier||
Standard Schnauzer||
Sussex Spaniel||
Tibetan Mastiff||
Tibetan Spaniel||
Tibetan Terrier||
Toy Fox Terrier||
Vizsla||
Weimaraner||
Welsh Springer Spaniel||
Welsh Terrier||
West Highland White Terrier||
Whippet||
Wire Fox Terrier||
Xoloitzcuintli||
Yorkshire Terrier||
Australian Kelpie||
Belgian Malinois||
Bernedoodle||
Cavapoo||
Cockapoo||
Goldendoodle||
Labradoodle||
Maltipoo||
Pomsky||
Sheepadoodle||
`,
  "dog_breed",
);

const MORE_CATS = parse(
  `
Abyssinian||
Aegean||
American Bobtail||
American Curl||
American Shorthair||
American Wirehair||
Arabian Mau||
Australian Mist||
Balinese||
Bambino||
Bengal||
Birman||
Bombay||
British Longhair||
British Shorthair||
Burmese||
Burmilla||
California Spangled||
Chartreux||
Chausie||
Cornish Rex||
Cymric||
Devon Rex||
Donskoy||
Egyptian Mau||
Exotic Shorthair||
Havana Brown||
Highland Fold||
Japanese Bobtail||
Korat||
Kurilian Bobtail||
LaPerm||
Maine Coon||
Manx||
Munchkin||
Nebelung||
Norwegian Forest Cat||
Ocicat||
Oriental Shorthair||
Persian||
Peterbald||
Pixie-bob||
Ragamuffin||
Ragdoll||
Russian Blue||
Savannah||
Scottish Fold||
Selkirk Rex||
Siamese||
Siberian||
Singapura||
Snowshoe||
Somali||
Sphynx||
Tonkinese||
Toyger||
Turkish Angora||
Turkish Van||
`,
  "cat_breed",
);

const MORE_FRUITS = parse(
  `
Apple||
Apricot||
Avocado||
Banana||
Blackberry||
Blueberry||
Cantaloupe||
Cherry||
Clementine||
Coconut||
Cranberry||
Date||
Dragon fruit||
Durian||
Elderberry||
Fig||
Gooseberry||
Grape||
Grapefruit||
Guava||
Honeydew||
Huckleberry||
Jackfruit||
Kiwi||
Kumquat||
Lemon||
Lime||
Lychee||
Mango||
Mulberry||
Nectarine||
Olive||
Orange||
Papaya||
Passion fruit||
Peach||
Pear||
Persimmon||
Pineapple||
Plum||
Pomegranate||
Pomelo||
Quince||
Raspberry||
Redcurrant||
Rambutan||
Star fruit||
Strawberry||
Tangerine||
Watermelon||
Breadfruit||
Cherimoya||
Feijoa||
Jabuticaba||
Longan||
Mangosteen||
Miracle fruit||
Pawpaw||
Plantain||
Salak||
Sapodilla||
Soursop||
Tamarind||
Yuzu||
`,
  "fruit",
);

const MORE_VEGETABLES = parse(
  `
Artichoke||
Arugula||
Asparagus||
Beetroot||
Bell pepper||
Bok choy||
Broccoli||
Brussels sprout||
Cabbage||
Carrot||
Cauliflower||
Celery||
Chard||
Chickpea||
Chili pepper||
Collard greens||
Corn||
Cucumber||
Daikon||
Eggplant||
Endive||
Fennel||
Garlic||
Ginger||
Green bean||
Kale||
Kohlrabi||
Leek||
Lentil||
Lettuce||
Mushroom||
Mustard greens||
Okra||
Onion||
Parsnip||
Pea||
Potato||
Pumpkin||
Radicchio||
Radish||
Rutabaga||
Shallot||
Spinach||
Sweet potato||
Swiss chard||
Tomato||
Turnip||
Watercress||
Zucchini||
Butternut squash||
`,
  "vegetable",
);

const MORE_INSTRUMENTS = parse(
  `
Accordion||
Acoustic guitar||
Alto saxophone||
Banjo||
Bass guitar||
Bassoon||
Bongo drum||
Bugle||
Cello||
Clarinet||
Conga||
Cornet||
Cymbal||
Double bass||
Drum kit||
Electric guitar||
Euphonium||
Flute||
French horn||
Glockenspiel||
Gong||
Grand piano||
Harmonica||
Harp||
Harpsichord||
Hi-hat||
Kalimba||
Kazoo||
Keyboard||
Lute||
Mandolin||
Maracas||
Marimba||
Mellophone||
Oboe||
Organ||
Pan flute||
Penny whistle||
Piccolo||
Recorder||
Saxophone||
Sitar||
Snare drum||
Steel drum||
Synthesizer||
Tambourine||
Tenor saxophone||
Theremin||
Timpani||
Triangle||
Trombone||
Trumpet||
Tuba||
Ukulele||
Vibraphone||
Viola||
Violin||
Xylophone||
Bagpipes||
Balalaika||
Bandoneon||
Bansuri||
Bouzouki||
Celesta||
Clavichord||
Djembe||
Dulcimer||
Erhu||
Guzheng||
Hammered dulcimer||
Hurdy-gurdy||
Jew's harp||
Koto||
Mbira||
Ocarina||
Pipe organ||
Shakuhachi||
Shamisen||
Tabla||
Taiko drum||
Theorbo||
Veena||
Washboard||
Zither||
Alto flute||
Bass clarinet||
Contrabassoon||
English horn||
Flugelhorn||
Sousaphone||
Tenor horn||
Baritone horn||
Piccolo trumpet||
Bass trombone||
Contrabass clarinet||
Oboe d'amore||
Concertina||
Melodeon||
Harmonium||
Reed organ||
Glass harmonica||
Musical saw||
Castanets||
Claves||
Cowbell||
Wood block||
Guiro||
Cabasa||
Shekere||
Rain stick||
Angklung||
Handpan||
Ondes Martenot||
Otamatone||
Stylophone||
Keytar||
Chapman stick||
Banjolele||
Mandocello||
Octobass||
Viola da gamba||
Archlute||
Cittern||
Psaltery||
Lyre||
Kora||
Oud||
Qanun||
Santur||
Tanpura||
Sarangi||
Sarod||
Shehnai||
Nadaswaram||
Mridangam||
Ghatam||
Kanjira||
Dhol||
Dholak||
Darbuka||
Frame drum||
Bodhran||
Cajon||
Timbales||
Balafon||
`,
  "instrument",
);

const MORE_SPORTS = parse(
  `
Air hockey||
American football||
Archery||
Artistic gymnastics||
Australian rules football||
Badminton||
Baseball||
Basketball||
Beach volleyball||
Biathlon||
Billiards||
Bobsleigh||
Bowling||
Boxing||
Brazilian jiu-jitsu||
Bull riding||
Canoeing||
Cheerleading||
Cricket||
Croquet||
Curling||
Cycling||
Darts||
Disc golf||
Diving||
Dodgeball||
Equestrian||
Fencing||
Field hockey||
Figure skating||
Floorball||
Formula One||
Golf||
Handball||
High jump||
Ice hockey||
Judo||
Karate||
Kayaking||
Lacrosse||
Long jump||
Marathon||
Mixed martial arts||
Netball||
Padel||
Parkour||
Pickleball||
Polo||
Powerlifting||
Rowing||
Rugby league||
Rugby union||
Sailing||
Shooting||
Skateboarding||
Skiing||
Snowboarding||
Soccer||
Softball||
Speed skating||
Squash||
Sumo||
Surfing||
Swimming||
Table tennis||
Taekwondo||
Tennis||
Ten-pin bowling||
Track and field||
Triathlon||
Ultimate frisbee||
Volleyball||
Water polo||
Weightlifting||
Windsurfing||
Wrestling||
Kabaddi||
Sepak takraw||
Hurling||
Gaelic football||
Shinty||
Pelota||
Jai alai||
`,
  "sport",
);

const MORE_BOARD_GAMES = parse(
  `
7 Wonders||
Acquire||
Agricola||
Azul||
Backgammon||
Balderdash||
Battleship||
Boggle||
Carcassonne||
Clank!||
Clue||
Cockroach Poker||
Codenames||
Connect Four||
Cranium||
Diplomacy||
Dixit||
Dominoes||
Dungeons & Dragons||
Everdell||
Exploding Kittens||
Forbidden Island||
Game of Life||
Gloomhaven||
Go||
Hearts||
Jenga||
King of Tokyo||
Monopoly||
Munchkin||
Operation||
Pandemic||
Parcheesi||
Pictionary||
Risk||
Root||
Scrabble||
Sequence||
Settlers of Catan||
Sorry!||
Splendor||
Stratego||
Sushi Go!||
Takenoko||
Ticket to Ride||
Trivial Pursuit||
Trouble||
Uno||
Wingspan||
Yahtzee||
Chess||
Checkers||
Othello||
Mancala||
Mahjong||
Bridge||
Poker||
Cribbage||
Rummy||
Ludo||
Snakes and Ladders||
Twister||
Mouse Trap||
Guess Who?||
`,
  "board_game",
);

const MORE_PROGRAMMING = parse(
  `
Ada||
Assembly||
Bash||
C||
C#|c sharp|
C++|cpp|
Clojure||
COBOL||
Crystal||
D||
Dart||
Elixir||
Elm||
Erlang||
F#|f sharp|
Fortran||
Go||
Groovy||
Haskell||
HTML||
Java||
JavaScript||
Julia||
Kotlin||
Lisp||
Lua||
MATLAB||
Nim||
Objective-C||
OCaml||
Pascal||
Perl||
PHP||
PowerShell||
Prolog||
Python||
R||
Racket||
Ruby||
Rust||
Scala||
Scheme||
SQL||
Swift||
TypeScript||
Visual Basic||
Zig||
Solidity||
VHDL||
Verilog||
Scratch||
Processing||
Tcl||
AWK||
Smalltalk||
Forth||
APL||
`,
  "programming_language",
);

const MORE_CITIES = parse(
  `
Amsterdam||
Athens||
Atlanta||
Auckland||
Bangkok||
Barcelona||
Beijing||
Beirut||
Berlin||
Bogota||
Boston||
Budapest||
Buenos Aires||
Cairo||
Cape Town||
Chicago||
Copenhagen||
Dallas||
Delhi||
Denver||
Dubai||
Dublin||
Edinburgh||
Geneva||
Hong Kong||
Honolulu||
Houston||
Istanbul||
Jakarta||
Jerusalem||
Johannesburg||
Kuala Lumpur||
Lagos||
Las Vegas||
Lima||
Lisbon||
London||
Los Angeles||
Madrid||
Manila||
Melbourne||
Mexico City||
Miami||
Milan||
Montreal||
Moscow||
Mumbai||
Nairobi||
New York City||
Osaka||
Oslo||
Paris||
Prague||
Rio de Janeiro||
Rome||
San Francisco||
Santiago||
Sao Paulo||
Seattle||
Seoul||
Shanghai||
Singapore||
Stockholm||
Sydney||
Taipei||
Tokyo||
Toronto||
Vancouver||
Venice||
Vienna||
Warsaw||
Washington, D.C.||
Zurich||
Birmingham||
Bristol||
Cologne||
Frankfurt||
Hamburg||
Krakow||
Lyon||
Marseille||
Naples||
Rotterdam||
Seville||
Valencia||
Porto||
Brussels||
Antwerp||
Wellington||
Perth||
Brisbane||
Adelaide||
Calgary||
Ottawa||
Philadelphia||
Phoenix||
San Diego||
Austin||
Nashville||
New Orleans||
Detroit||
Minneapolis||
`,
  "city",
);

const MORE_CANDY = parse(
  `
Snickers||
Mars bar||
Twix||
Kit Kat||
Reese's Peanut Butter Cups||
M&M's||
Skittles||
Starburst||
Haribo Goldbears||
Gummy worms||
Sour Patch Kids||
Swedish Fish||
Jelly Babies||
Wine gums||
Liquorice Allsorts||
Parma Violets||
Sherbet lemons||
Werther's Original||
Butterscotch||
Toffee||
Fudge||
Turkish delight||
Nougat||
Marzipan||
Rock candy||
Candy corn||
Candy canes||
Lollipop||
Dum Dums||
Chupa Chups||
Tootsie Roll||
Tootsie Pop||
York Peppermint Pattie||
Junior Mints||
After Eight||
Andes Mint||
Polo mints||
Fox's Glacier Mints||
Murray Mints||
Worther's Originals||
Jolly Rancher||
Life Savers||
Nerds||
Runts||
Fun Dip||
Pop Rocks||
Warheads||
Toxic Waste||
Milk Duds||
Whoppers||
Rolo||
Caramac||
Kinder Bueno||
Ferrero Rocher||
Lindt Lindor||
Cadbury Creme Egg||
Cadbury Flake||
Crunchie||
Wispa||
Aero||
Yorkie||
`,
  "candy_product",
);

const MORE_BREAKFAST = parse(
  `
Pancakes||
Waffles||
French toast||
Omelette||
Scrambled eggs||
Fried eggs||
Poached eggs||
Bacon||
Sausage||
Hash browns||
Bagel||
Croissant||
Toast||
Porridge||
Oatmeal||
Granola||
Muesli||
Cornflakes||
Cereal||
Yogurt||
Fruit salad||
Smoothie||
Breakfast burrito||
Breakfast sandwich||
English muffin||
Crumpet||
Scone||
Doughnut||
Cinnamon roll||
Pancake stack||
Shakshuka||
Huevos rancheros||
Congee||
Idli||
Dosa||
Upma||
Bircher muesli||
Kippers||
Black pudding||
Baked beans||
`,
  "breakfast_food",
);

const MORE_PIZZA = parse(
  `
Pepperoni||
Mushroom||
Mozzarella||
Parmesan||
Pineapple||
Ham||
Bacon||
Sausage||
Chicken||
Ground beef||
Anchovies||
Tuna||
Shrimp||
Onion||
Red onion||
Green pepper||
Red pepper||
Jalapeno||
Banana pepper||
Black olives||
Green olives||
Tomato||
Cherry tomatoes||
Spinach||
Arugula||
Basil||
Oregano||
Garlic||
Artichoke||
Eggplant||
Zucchini||
Broccoli||
Sweet corn||
Pine nuts||
Feta||
Goat cheese||
Blue cheese||
Ricotta||
Cheddar||
Provolone||
`,
  "pizza_topping",
);

const MORE_ICE_CREAM = parse(
  `
Vanilla||
Chocolate||
Strawberry||
Mint chocolate chip||
Cookies and cream||
Rocky road||
Butter pecan||
Coffee||
Caramel||
Salted caramel||
Pistachio||
Cherry||
Raspberry ripple||
Neapolitan||
Cookie dough||
Birthday cake||
Cotton candy||
Bubblegum||
Lemon||
Mango||
Coconut||
Banana||
Peach||
Blueberry||
Matcha||
Tiramisu||
`,
  "ice_cream_flavor",
);

const MORE_SUPERHEROES = parse(
  `
Ant-Man||
Aquaman||
Batgirl||
Batman||
Black Canary||
Black Panther||
Black Widow||
Captain America||
Captain Marvel||
Cyclops||
Daredevil||
Deadpool||
Doctor Strange||
Elektra||
Falcon||
Flash||
Green Arrow||
Green Lantern||
Hawkeye||
Hulk||
Iron Fist||
Iron Man||
Jean Grey||
Jessica Jones||
Luke Cage||
Martian Manhunter||
Nightcrawler||
Professor X||
Punisher||
Robin||
Rocket Raccoon||
Scarlet Witch||
Shazam||
Silver Surfer||
Spider-Man||
Star-Lord||
Storm||
Supergirl||
Superman||
Thor||
Vision||
Wasp||
Wolverine||
Wonder Woman||
`,
  "superhero",
);

const MORE_DISNEY = parse(
  `
Aladdin||
Alice||
Anna||
Ariel||
Aurora||
Baloo||
Beast||
Belle||
Buzz Lightyear||
Captain Hook||
Cheshire Cat||
Cinderella||
Cruella de Vil||
Daisy Duck||
Donald Duck||
Dumbo||
Elsa||
Eeyore||
Elastigirl||
Esmeralda||
Flynn Rider||
Gaston||
Genie||
Goofy||
Hades||
Hercules||
Jasmine||
Jessie||
Kristoff||
Lady||
Lightning McQueen||
Lilo||
Maleficent||
Mickey Mouse||
Mike Wazowski||
Minnie Mouse||
Moana||
Mowgli||
Mulan||
Nala||
Nemo||
Olaf||
Peter Pan||
Pinocchio||
Pluto||
Pocahontas||
Pumbaa||
Rapunzel||
Remy||
Robin Hood||
Scar||
Scrooge McDuck||
Simba||
Snow White||
Stitch||
Sulley||
Tarzan||
Tiana||
Tigger||
Timon||
Ursula||
Wall-E||
Winnie the Pooh||
Woody||
Yzma||
Zazu||
`,
  "disney_character",
);

const MORE_HP = parse(
  `
Albus Dumbledore|dumbledore|
Severus Snape|snape|
Hermione Granger|hermione|
Ron Weasley||
Harry Potter|harry|
Lord Voldemort|voldemort|
Draco Malfoy|draco|
Rubeus Hagrid|hagrid|
Sirius Black|sirius|
Remus Lupin|lupin|
Minerva McGonagall|mcgonagall|
Luna Lovegood|luna|
Neville Longbottom|neville|
Ginny Weasley|ginny|
Fred Weasley|fred|
George Weasley|george|
Molly Weasley|mrs weasley|
Arthur Weasley|mr weasley|
Bellatrix Lestrange|bellatrix|
Lucius Malfoy|lucius|
Dolores Umbridge|umbridge|
Dobby||
Kreacher||
Cedric Diggory|cedric|
Cho Chang|cho|
Oliver Wood|wood|
Seamus Finnigan|seamus|
Dean Thomas|dean|
Parvati Patil|parvati|
Padma Patil|padma|
Lavender Brown|lavender|
Alastor Moody|mad-eye moody|
Nymphadora Tonks|tonks|
Kingsley Shacklebolt|kingsley|
Filius Flitwick|flitwick|
Pomona Sprout|sprout|
Horace Slughorn|slughorn|
Sybill Trelawney|trelawney|
Argus Filch|filch|
Peter Pettigrew|wormtail|
Barty Crouch Jr.|barty crouch|
Fenrir Greyback|greyback|
Cornelius Fudge|fudge|
Rufus Scrimgeour|scrimgeour|
Gellert Grindelwald|grindelwald|
Nicolas Flamel|flamel|
Peeves||
Nearly Headless Nick||
Moaning Myrtle|myrtle|
Buckbeak||
Hedwig||
Nagini||
Crookshanks||
Scabbers||
`,
  "hp_character",
);

const MORE_SW = parse(
  `
Luke Skywalker|luke|
Princess Leia|leia|
Han Solo|han|
Chewbacca|chewie|
Darth Vader|vader|
Yoda||
Obi-Wan Kenobi|obi wan,ben kenobi|
Anakin Skywalker|anakin|
Padme Amidala|padme|
Qui-Gon Jinn|qui gon|
Mace Windu|mace|
Count Dooku|dooku|
Darth Maul|maul|
Emperor Palpatine|palpatine,emperor|
Kylo Ren|kylo|
Rey||
Finn||
Poe Dameron|poe|
BB-8|bb8|
R2-D2|r2d2|
C-3PO|c3po|
Lando Calrissian|lando|
Boba Fett|boba|
Jango Fett|jango|
Jabba the Hutt|jabba|
Admiral Ackbar|ackbar|
Wedge Antilles|wedge|
Mon Mothma||
Grand Moff Tarkin|tarkin|
General Grievous|grievous|
Ahsoka Tano|ahsoka|
Captain Rex|rex|
Hera Syndulla|hera|
Kanan Jarrus|kanan|
Ezra Bridger|ezra|
Sabine Wren|sabine|
Din Djarin|mando|
Grogu|baby yoda|
Bo-Katan Kryze|bo katan|
Cassian Andor|cassian|
Jyn Erso|jyn|
K-2SO|k2so|
Chirrut Imwe|chirrut|
Baze Malbus|baze|
Saw Gerrera|saw|
Maz Kanata|maz|
Snoke||
Armitage Hux|hux|
Phasma||
Rose Tico|rose|
`,
  "sw_character",
);

export const GENERAL_ENTITY_SEEDS: EntitySeed[] = [
  ...MORE_POKEMON,
  ...MORE_ANIMALS,
  ...MORE_DOGS,
  ...MORE_CATS,
  ...MORE_FRUITS,
  ...MORE_VEGETABLES,
  ...MORE_INSTRUMENTS,
  ...MORE_SPORTS,
  ...MORE_BOARD_GAMES,
  ...MORE_PROGRAMMING,
  ...MORE_CITIES,
  ...MORE_CANDY,
  ...MORE_BREAKFAST,
  ...MORE_PIZZA,
  ...MORE_ICE_CREAM,
  ...MORE_SUPERHEROES,
  ...MORE_DISNEY,
  ...MORE_HP,
  ...MORE_SW,
];
