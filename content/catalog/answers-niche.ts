/**
 * Niche answer pools. Every list is intentionally deeper than a single round
 * needs, so repeated prompts and late Beehive turns do not run dry.
 */

import type { EntitySeed } from "./entities";

function parse(raw: string, type: string, prefix = type): EntitySeed[] {
  return raw
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, aliasPart = ""] = line.split("|").map((part) => part.trim());
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
        attrs: {},
      };
    });
}

const DINOSAURS = parse(
  `
Tyrannosaurus rex|t rex,tyrannosaurus|
Triceratops||
Velociraptor|raptor|
Stegosaurus||
Brachiosaurus||
Apatosaurus|brontosaurus|
Diplodocus||
Allosaurus||
Spinosaurus||
Ankylosaurus||
Parasaurolophus||
Iguanodon||
Ceratosaurus||
Carnotaurus||
Giganotosaurus||
Argentinosaurus||
Therizinosaurus||
Deinonychus||
Utahraptor||
Oviraptor||
Protoceratops||
Styracosaurus||
Torosaurus||
Pachyrhinosaurus||
Edmontosaurus||
Corythosaurus||
Maiasaura||
Gallimimus||
Compsognathus||
Dilophosaurus||
Coelophysis||
Plateosaurus||
Massospondylus||
Heterodontosaurus||
Archaeopteryx||
Microraptor||
Sinosauropteryx||
Yutyrannus||
Qianzhousaurus||
Baryonyx||
Suchomimus||
Albertosaurus||
Daspletosaurus||
Tarbosaurus||
Megalosaurus||
Acrocanthosaurus||
Carcharodontosaurus||
Mapusaurus||
Sauroposeidon||
Camarasaurus||
Cetiosaurus||
Mamenchisaurus||
Nigersaurus||
Amargasaurus||
Dicraeosaurus||
Saltasaurus||
Titanosaurus||
Hypsilophodon||
Tenontosaurus||
Camptosaurus||
Dryosaurus||
OURANOSAURUS|ouranosaurus|
Kentrosaurus||
Huayangosaurus||
Scelidosaurus||
Sauropelta||
Euoplocephalus||
Nodosaurus||
Polacanthus||
Pachycephalosaurus||
Stygimoloch||
Dracorex||
Homalocephale||
Prenocephale||
Leaellynasaura||
Muttaburrasaurus||
Minmi||
Austrosaurus||
Rapator||
Ozraptor||
`,
  "dinosaur",
);

const GREEK_FIGURES = parse(
  `
Zeus||
Hera||
Poseidon||
Demeter||
Athena||
Apollo||
Artemis||
Ares||
Aphrodite||
Hephaestus||
Hermes||
Hestia||
Dionysus||
Hades||
Persephone||
Hecate||
Helios||
Selene||
Eos||
Nike||
Iris||
Pan||
Asclepius||
Eros||
Hypnos||
Thanatos||
Nemesis||
Tyche||
Chronos||
Rhea||
Cronus||
Uranus||
Gaia||
Atlas||
Prometheus||
Epimetheus||
Perseus||
Heracles|hercules|
Achilles||
Odysseus||
Theseus||
Jason||
Orpheus||
Medusa||
Minotaur||
Cerberus||
Pegasus||
Icarus||
Daedalus||
`,
  "greek_figure",
);

const FLOWERS = parse(
  `
Rose||
Tulip||
Daisy||
Sunflower||
Lily||
Orchid||
Carnation||
Daffodil||
Hyacinth||
Chrysanthemum||
Peony||
Poppy||
Lavender||
Bluebell||
Foxglove||
Hydrangea||
Star jasmine||
Lilac||
Magnolia||
Marigold||
Pansy||
Petunia||
Primrose||
Snapdragon||
Violet||
Zinnia||
Begonia||
Aster||
Azalea||
Camellia||
Dahlia||
Delphinium||
Freesia||
Gardenia||
Geranium||
Gladiolus||
Hibiscus||
Hollyhock||
Iris||
Lotus||
Nasturtium||
Phlox||
Ranunculus||
Rhododendron||
Sweet pea||
Wisteria||
Anemone||
Buttercup||
Clover||
Crocus||
Edelweiss||
Forget-me-not||
Gentian||
Heather||
Larkspur||
Lupine||
Morning glory||
Nigella||
Queen Anne's lace||
Snowdrop||
Thistle||
Yucca||
`,
  "flower",
);

const TREES = parse(
  `
Oak||
Maple||
Birch||
Pine||
Willow||
Cedar||
Spruce||
Fir||
Redwood||
Sequoia||
Ash||
Elm||
Beech||
Poplar||
Aspen||
Sycamore||
Chestnut||
Walnut||
Hickory||
Magnolia tree||
Dogwood||
Cherry tree||
Apple tree||
Pear tree||
Plum tree||
Peach tree||
Olive tree||
Fig tree||
Date palm||
Coconut palm||
Baobab||
Acacia||
Eucalyptus||
Ginkgo||
Cypress||
Juniper||
Larch||
Yew||
Hemlock||
Alder||
Hornbeam||
Linden||
Mulberry||
Sassafras||
Persimmon tree||
Pecan||
Almond tree||
Avocado tree||
Mango tree||
Rubber tree||
Banyan||
Kapok||
Teak||
Mahogany||
Ebony||
Rosewood||
Sandalwood||
Palm||
Joshua tree||
Dragon tree||
`,
  "tree",
);

const GEMSTONES = parse(
  `
Diamond||
Ruby||
Sapphire||
Emerald||
Amethyst||
Topaz||
Opal||
Pearl||
Garnet||
Peridot||
Aquamarine||
Citrine||
Turquoise||
Lapis lazuli||
Jade||
Onyx||
Moonstone||
Sunstone||
Labradorite||
Alexandrite||
Tanzanite||
Spinel||
Zircon||
Tourmaline||
Morganite||
Kunzite||
Iolite||
Chrysoprase||
Carnelian||
Agate||
Jasper||
Obsidian||
Malachite||
Rhodochrosite||
Sodalite||
Amazonite||
Apatite||
Fluorite||
Calcite||
Pyrite||
Hematite||
Magnetite||
Quartz||
Rose quartz||
Smoky quartz||
Tiger's eye||
Beryl||
Corundum||
Feldspar||
Aventurine||
`,
  "gemstone",
);

const CONSOLES = parse(
  `
Atari 2600||
Nintendo Entertainment System|nes|
Super Nintendo|snes|
Nintendo 64|n64|
GameCube||
Wii||
Wii U||
Nintendo Switch||
Game Boy||
Game Boy Color||
Game Boy Advance|gba|
Nintendo DS||
Nintendo 3DS||
Virtual Boy||
Sega Genesis||
Sega Saturn||
Dreamcast||
Game Gear||
Master System||
PlayStation||
PlayStation 2|ps2|
PlayStation 3|ps3|
PlayStation 4|ps4|
PlayStation 5|ps5|
PlayStation Portable|psp|
PlayStation Vita||
Xbox||
Xbox 360||
Xbox One||
Xbox Series X||
Xbox Series S||
Steam Deck||
Atari 5200||
Atari 7800||
Neo Geo||
TurboGrafx-16||
ColecoVision||
Intellivision||
Ouya||
Atari Lynx||
WonderSwan||
`,
  "game_console",
);

const SHAKESPEARE = parse(
  `
All's Well That Ends Well||
Antony and Cleopatra||
As You Like It||
The Comedy of Errors||
Coriolanus||
Cymbeline||
Hamlet||
Henry IV Part 1||
Henry IV Part 2||
Henry V||
Henry VI Part 1||
Henry VI Part 2||
Henry VI Part 3||
Henry VIII||
Julius Caesar||
King John||
King Lear||
Love's Labour's Lost||
Macbeth||
Measure for Measure||
The Merchant of Venice||
The Merry Wives of Windsor||
A Midsummer Night's Dream||
Much Ado About Nothing||
Othello||
Pericles||
Richard II||
Richard III||
Romeo and Juliet||
The Taming of the Shrew||
The Tempest||
Timon of Athens||
Titus Andronicus||
Troilus and Cressida||
Twelfth Night||
The Two Gentlemen of Verona||
The Two Noble Kinsmen||
The Winter's Tale||
`,
  "shakespeare_play",
);

const BONES = parse(
  `
Skull||
Mandible||
Clavicle||
Scapula||
Sternum||
Rib||
Vertebra||
Cervical vertebra||
Thoracic vertebra||
Lumbar vertebra||
Sacrum||
Coccyx||
Humerus||
Radius||
Ulna||
Carpals||
Metacarpals||
Phalanges||
Pelvis||
Ilium||
Ischium||
Pubis||
Femur||
Patella||
Tibia||
Fibula||
Tarsals||
Metatarsals||
Calcaneus||
Talus||
Hyoid||
Malleus||
Incus||
Stapes||
Maxilla||
Zygomatic bone||
Nasal bone||
Vomer||
Palatine bone||
Sphenoid bone||
Ethmoid bone||
`,
  "bone",
);

const MOONS = parse(
  `
Moon||
Phobos||
Deimos||
Io||
Europa||
Ganymede||
Callisto||
Titan||
Enceladus||
Mimas||
Tethys||
Dione||
Iapetus||
Hyperion||
Triton||
Charon||
Nix||
Hydra||
Kerberos||
Styx||
Miranda||
Ariel||
Umbriel||
Titania||
Oberon||
Puck||
Proteus||
Larissa||
Galatea||
Despina||
Thalassa||
Naiad||
Amalthea||
Thebe||
Metis||
Adrastea||
Pandora||
Janus||
Calypso||
Telesto||
Helene||
Polydeuces||
`,
  "moon",
);

const VOLCANOES = parse(
  `
Mount Vesuvius||
Mount Etna||
Stromboli||
Krakatoa||
Mount Fuji||
Mauna Loa||
Kilauea||
Mount St. Helens||
Mount Rainier||
Yellowstone Caldera||
Eyjafjallajokull||
Hekla||
Mount Erebus||
Cotopaxi||
Popocatepetl||
Mount Pinatubo||
Taal||
Merapi||
Anak Krakatoa||
Santorini||
Nisyros||
Mount Teide||
Mount Cameroon||
Nyiragongo||
Ol Doinyo Lengai||
Mount Kenya||
Villarrica||
Llaima||
Tungurahua||
Galeras||
Nevado del Ruiz||
Sakurajima||
Mount Aso||
Mount Unzen||
Mount Bandai||
Mount Hakone||
Mount Hood||
Mount Shasta||
Lassen Peak||
Mount Baker||
Glacier Peak||
`,
  "volcano",
);

const RIVERS = parse(
  `
Nile||
Amazon||
Yangtze||
Mississippi||
Missouri||
Yenisei||
Ob||
Parana||
Congo||
Amur||
Lena||
Mackenzie||
Mekong||
Niger||
Volga||
Danube||
Ganges||
Indus||
Brahmaputra||
Zambezi||
Murray||
Darling||
Rhine||
Rhone||
Seine||
Thames||
Elbe||
Loire||
Tagus||
Ebro||
Po||
Tiber||
Dnieper||
Don||
Ural||
Huang He||
Xi Jiang||
Irrawaddy||
Salween||
Godavari||
Narmada||
Krishna||
Colorado||
Rio Grande||
Columbia||
Yukon||
Orinoco||
Sao Francisco||
Uruguay||
Tigris||
Euphrates||
Jordan||
`,
  "river",
);

const MOUNTAINS = parse(
  `
Mount Everest|everest|
K2||
Kangchenjunga||
Lhotse||
Makalu||
Cho Oyu||
Dhaulagiri||
Manaslu||
Nanga Parbat||
Annapurna||
Shishapangma||
Gasherbrum I||
Broad Peak||
Gasherbrum II||
Mont Blanc||
Matterhorn||
Denali||
Aconcagua||
Kilimanjaro||
Mount Elbrus||
Vinson Massif||
Puncak Jaya||
Mount Fuji||
Mount Rainier||
Mount Whitney||
Mount Kosciuszko||
Ben Nevis||
Snowdon||
Scafell Pike||
Zugspitze||
Grossglockner||
Marmolada||
Gran Paradiso||
Mauna Kea||
Chimborazo||
Huascaran||
Alpamayo||
Fitz Roy||
Torres del Paine||
Table Mountain||
Mount Stanley||
Mount Wilhelm||
Aoraki||
Mount Tasman||
Mount Aspiring||
`,
  "mountain",
);

const SEAS = parse(
  `
Pacific Ocean||
Atlantic Ocean||
Indian Ocean||
Southern Ocean||
Arctic Ocean||
Mediterranean Sea||
Caribbean Sea||
Red Sea||
Black Sea||
Caspian Sea||
Arabian Sea||
Bay of Bengal||
Coral Sea||
Tasman Sea||
Bering Sea||
North Sea||
Baltic Sea||
Adriatic Sea||
Aegean Sea||
Ionian Sea||
Tyrrhenian Sea||
Sea of Japan||
Yellow Sea||
East China Sea||
South China Sea||
Andaman Sea||
Java Sea||
Banda Sea||
Timor Sea||
Arafura Sea||
Gulf of Mexico||
Hudson Bay||
Persian Gulf||
Gulf of Guinea||
`,
  "sea",
);

const CURRENCIES = parse(
  `
US dollar|dollar,usd|
Euro|eur|
British pound|pound sterling,gbp|
Japanese yen|yen,jpy|
Chinese yuan|renminbi,yuan,cny|
Indian rupee|rupee,inr|
Canadian dollar|cad|
Australian dollar|aud|
Swiss franc|chf|
Swedish krona|sek|
Norwegian krone|nok|
Danish krone|dkk|
Russian ruble|rouble,rub|
Brazilian real|brl|
Mexican peso|mxn|
Argentine peso|ars|
Chilean peso|clp|
Colombian peso|cop|
Peruvian sol|pen|
South African rand|zar|
Egyptian pound|egp|
Nigerian naira|ngn|
Kenyan shilling|kes|
Turkish lira|try|
Israeli shekel|ils|
Saudi riyal|sar|
UAE dirham|aed|
Qatari riyal|qar|
Pakistani rupee|pkr|
Bangladeshi taka|bdt|
Sri Lankan rupee|lkr|
Nepalese rupee|npr|
Thai baht|thb|
Vietnamese dong|vnd|
Indonesian rupiah|idr|
Malaysian ringgit|myr|
Philippine peso|php|
Singapore dollar|sgd|
South Korean won|krw|
North Korean won|kpw|
New Zealand dollar|nzd|
Polish zloty|pln|
Czech koruna|czk|
Hungarian forint|huf|
Romanian leu||
Bulgarian lev|bgn|
Serbian dinar|rsd|
Ukrainian hryvnia|uah|
Icelandic krona|isk|
Moroccan dirham|mad|
Tunisian dinar|tnd|
Ghanaian cedi|ghs|
Ethiopian birr|etb|
Ugandan shilling|ugx|
Tanzanian shilling|tzs|
Zambian kwacha|zmw|
Botswanan pula|bwp|
Jamaican dollar|jmd|
Cuban peso|cup|
Dominican peso|dop|
Guatemalan quetzal|gtq|
Costa Rican colon|crc|
Panamanian balboa|pab|
Uruguayan peso|uyu|
Paraguayan guarani|pyg|
Bolivian boliviano|bob|
Venezuelan bolivar|ves|
`,
  "currency",
);

export const NICHE_ENTITY_SEEDS: EntitySeed[] = [
  ...DINOSAURS,
  ...GREEK_FIGURES,
  ...FLOWERS,
  ...TREES,
  ...GEMSTONES,
  ...CONSOLES,
  ...SHAKESPEARE,
  ...BONES,
  ...MOONS,
  ...VOLCANOES,
  ...RIVERS,
  ...MOUNTAINS,
  ...SEAS,
  ...CURRENCIES,
];
