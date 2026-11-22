/**
 * Spider Web knowledge graph.
 *
 * Every edge is a reviewed, sourced direct relationship. The required example
 * (Homer Simpson -> Springfield Nuclear Power Plant -> nuclear waste) is stored
 * explicitly rather than inferred by a model at play time.
 *
 * Several edges point at entities from the main catalog (countries, capitals,
 * elements, states) so the graph reuses audited data instead of duplicating it.
 */

export type GraphEntitySeed = {
  id: string;
  name: string;
  type: string;
  description?: string;
};

export type GraphEdgeSeed = {
  from: string;
  predicate: string;
  to: string;
  label: string;
  inverse: string | null;
  source: string;
};

export type PuzzleSeed = { id: string; start: string; target: string };

const WIKI = (page: string, accessed = "2026-11-12") =>
  `Wikipedia: ${page} (accessed ${accessed})`;

const g = (id: string, name: string, type: string, description?: string): GraphEntitySeed => ({
  id,
  name,
  type,
  description,
});

export const GRAPH_ENTITIES: GraphEntitySeed[] = [
  // Fiction cluster
  g("g_homer_simpson", "Homer Simpson", "fictional_character", "Animated character from The Simpsons."),
  g("g_matt_groening", "Matt Groening", "person", "Cartoonist who created The Simpsons."),
  g("g_the_simpsons", "The Simpsons", "work", "American animated sitcom."),
  g("g_springfield_plant", "Springfield Nuclear Power Plant", "fictional_place", "The nuclear plant where Homer works."),
  g("g_nuclear_waste", "Nuclear waste", "material", "Radioactive by-product of nuclear power generation."),
  g("g_springfield", "Springfield", "fictional_place", "The fictional town where The Simpsons is set."),
  g("g_bart_simpson", "Bart Simpson", "fictional_character"),
  g("g_marge_simpson", "Marge Simpson", "fictional_character"),
  g("g_kwik_e_mart", "Kwik-E-Mart", "fictional_place"),
  g("g_moes_tavern", "Moe's Tavern", "fictional_place"),
  g("g_duff_beer", "Duff Beer", "fictional_object", "Fictional beer brand in The Simpsons."),
  g("g_duff_brewery", "Duff Brewery", "fictional_place"),
  g("g_fox", "Fox Broadcasting Company", "organization", "US television network."),
  g("g_disney", "The Walt Disney Company", "company", "American media company that owns Fox."),
  g("g_nuclear_power", "Nuclear power", "concept", "Electricity generated from nuclear fission."),
  g("g_electricity", "Electricity", "concept"),
  g("g_uranium_ore", "Uranium ore", "material", "Rock containing recoverable uranium."),

  // Geography cluster
  g("g_eiffel_tower", "Eiffel Tower", "landmark", "Iron tower in Paris."),
  g("g_louvre", "Louvre", "landmark", "Art museum in Paris."),
  g("g_mona_lisa", "Mona Lisa", "work", "Painting by Leonardo da Vinci."),
  g("g_leonardo", "Leonardo da Vinci", "person", "Italian Renaissance artist and inventor."),
  g("g_wine", "Wine", "food", "Alcoholic drink made from grapes."),
  g("g_grape", "Grape", "fruit", "Fruit used to make wine."),
  g("g_italian_cuisine", "Italian cuisine", "cuisine"),
  g("g_pizza", "Pizza", "food", "Italian-origin dish of dough with toppings."),
  g("g_wheat", "Wheat", "plant", "Cereal grain used for flour."),
  g("g_flour", "Flour", "material", "Powder made by grinding grain."),
  g("g_bread", "Bread", "food"),
  g("g_continent_europe", "Europe", "continent"),
  g("g_continent_asia", "Asia", "continent"),

  // Space cluster
  g("g_earth", "Earth", "planet"),
  g("g_sun", "Sun", "star", "The star at the centre of the Solar System."),
  g("g_solar_system", "Solar System", "concept"),
  g("g_milky_way", "Milky Way", "concept", "The galaxy containing the Solar System."),
  g("g_mars", "Mars", "planet"),
  g("g_moon", "Moon", "concept", "Earth's natural satellite."),
  g("g_nasa", "NASA", "organization", "United States space agency."),
  g("g_neil_armstrong", "Neil Armstrong", "person", "First person to walk on the Moon."),
  g("g_apollo_11", "Apollo 11", "event", "1969 crewed Moon landing mission."),
  g("g_apollo_program", "Apollo program", "concept"),
  g("g_moon_landing", "Moon landing", "event"),

  // Technology cluster
  g("g_apple", "Apple Inc.", "company"),
  g("g_iphone", "iPhone", "product"),
  g("g_foxconn", "Foxconn", "company", "Electronics manufacturer."),
  g("g_steve_jobs", "Steve Jobs", "person", "Co-founder of Apple."),
  g("g_silicon_valley", "Silicon Valley", "place"),

  // Nature cluster
  g("g_bee", "Bee", "animal"),
  g("g_honey", "Honey", "food"),
  g("g_nectar", "Nectar", "material"),
  g("g_flower", "Flower", "plant"),
  g("g_plant", "Plant", "organism"),
  g("g_ant", "Ant", "animal"),
  g("g_ant_colony", "Ant colony", "concept"),
  g("g_pollination", "Pollination", "concept"),
];

export const GRAPH_EDGES: GraphEdgeSeed[] = [
  // Simpsons
  { from: "g_homer_simpson", predicate: "works_at", to: "g_springfield_plant", label: "works at", inverse: "has employee", source: WIKI("Homer Simpson") },
  { from: "g_springfield_plant", predicate: "produces", to: "g_nuclear_waste", label: "produces", inverse: "is produced by", source: WIKI("Springfield Nuclear Power Plant") },
  { from: "g_homer_simpson", predicate: "created_by", to: "g_matt_groening", label: "was created by", inverse: "created", source: WIKI("Homer Simpson") },
  { from: "g_the_simpsons", predicate: "created_by", to: "g_matt_groening", label: "was created by", inverse: "created", source: WIKI("The Simpsons") },
  { from: "g_homer_simpson", predicate: "appears_in", to: "g_the_simpsons", label: "appears in", inverse: "features", source: WIKI("Homer Simpson") },
  { from: "g_bart_simpson", predicate: "appears_in", to: "g_the_simpsons", label: "appears in", inverse: "features", source: WIKI("Bart Simpson") },
  { from: "g_marge_simpson", predicate: "appears_in", to: "g_the_simpsons", label: "appears in", inverse: "features", source: WIKI("Marge Simpson") },
  { from: "g_the_simpsons", predicate: "appears_in", to: "g_fox", label: "aired on", inverse: "features", source: WIKI("The Simpsons") },
  { from: "g_fox", predicate: "part_of", to: "g_disney", label: "is part of", inverse: "has part", source: WIKI("Fox Corporation") },
  { from: "g_disney", predicate: "located_in", to: "country_united_states", label: "is located in", inverse: "contains", source: WIKI("The Walt Disney Company") },
  { from: "g_springfield_plant", predicate: "located_in", to: "g_springfield", label: "is located in", inverse: "contains", source: WIKI("Springfield Nuclear Power Plant") },
  { from: "g_homer_simpson", predicate: "located_in", to: "g_springfield", label: "lives in", inverse: "contains", source: WIKI("Homer Simpson") },
  { from: "g_kwik_e_mart", predicate: "located_in", to: "g_springfield", label: "is located in", inverse: "contains", source: WIKI("Kwik-E-Mart") },
  { from: "g_moes_tavern", predicate: "located_in", to: "g_springfield", label: "is located in", inverse: "contains", source: WIKI("Moe's Tavern") },
  { from: "g_springfield", predicate: "appears_in", to: "g_the_simpsons", label: "is the setting of", inverse: "features", source: WIKI("Springfield (The Simpsons)") },
  { from: "g_duff_beer", predicate: "manufactured_by", to: "g_duff_brewery", label: "is manufactured by", inverse: "manufactures", source: WIKI("Duff Beer") },
  { from: "g_duff_brewery", predicate: "located_in", to: "g_springfield", label: "is located in", inverse: "contains", source: WIKI("Duff Beer") },
  { from: "g_springfield_plant", predicate: "produces", to: "g_electricity", label: "produces", inverse: "is produced by", source: WIKI("Springfield Nuclear Power Plant") },
  { from: "g_nuclear_power", predicate: "produces", to: "g_electricity", label: "produces", inverse: "is produced by", source: WIKI("Nuclear power") },
  { from: "element_uranium", predicate: "used_for", to: "g_nuclear_power", label: "is used for", inverse: "uses", source: WIKI("Uranium") },
  { from: "element_uranium", predicate: "made_from", to: "g_uranium_ore", label: "is extracted from", inverse: "is a material for", source: WIKI("Uranium") },

  // Geography
  { from: "capital_paris", predicate: "capital_of", to: "country_france", label: "is the capital of", inverse: "has capital", source: WIKI("Paris") },
  { from: "country_france", predicate: "located_in", to: "g_continent_europe", label: "is located in", inverse: "contains", source: WIKI("France") },
  { from: "g_eiffel_tower", predicate: "located_in", to: "capital_paris", label: "is located in", inverse: "contains", source: WIKI("Eiffel Tower") },
  { from: "g_louvre", predicate: "located_in", to: "capital_paris", label: "is located in", inverse: "contains", source: WIKI("Louvre") },
  { from: "g_mona_lisa", predicate: "part_of", to: "g_louvre", label: "is part of the collection of", inverse: "has part", source: WIKI("Mona Lisa") },
  { from: "g_mona_lisa", predicate: "created_by", to: "g_leonardo", label: "was created by", inverse: "created", source: WIKI("Mona Lisa") },
  { from: "country_france", predicate: "produces", to: "g_wine", label: "produces", inverse: "is produced by", source: WIKI("French wine") },
  { from: "g_wine", predicate: "made_from", to: "g_grape", label: "is made from", inverse: "is a material for", source: WIKI("Wine") },
  { from: "g_pizza", predicate: "part_of", to: "g_italian_cuisine", label: "is part of", inverse: "has part", source: WIKI("Pizza") },
  { from: "g_italian_cuisine", predicate: "part_of", to: "country_italy", label: "is part of the cuisine of", inverse: "has part", source: WIKI("Italian cuisine") },
  { from: "country_italy", predicate: "located_in", to: "g_continent_europe", label: "is located in", inverse: "contains", source: WIKI("Italy") },
  { from: "capital_rome", predicate: "capital_of", to: "country_italy", label: "is the capital of", inverse: "has capital", source: WIKI("Rome") },
  { from: "g_pizza", predicate: "made_from", to: "g_wheat", label: "is made from", inverse: "is a material for", source: WIKI("Pizza") },
  { from: "g_wheat", predicate: "used_for", to: "g_flour", label: "is used for", inverse: "uses", source: WIKI("Wheat") },
  { from: "g_flour", predicate: "used_for", to: "g_bread", label: "is used for", inverse: "uses", source: WIKI("Flour") },

  // Space
  { from: "g_earth", predicate: "part_of", to: "g_solar_system", label: "is part of", inverse: "has part", source: WIKI("Solar System") },
  { from: "g_mars", predicate: "part_of", to: "g_solar_system", label: "is part of", inverse: "has part", source: WIKI("Solar System") },
  { from: "g_sun", predicate: "part_of", to: "g_solar_system", label: "is part of", inverse: "has part", source: WIKI("Solar System") },
  { from: "g_solar_system", predicate: "part_of", to: "g_milky_way", label: "is part of", inverse: "has part", source: WIKI("Milky Way") },
  { from: "g_moon", predicate: "part_of", to: "g_earth", label: "orbits", inverse: "has satellite", source: WIKI("Moon") },
  { from: "g_nasa", predicate: "located_in", to: "country_united_states", label: "is located in", inverse: "contains", source: WIKI("NASA") },
  { from: "g_neil_armstrong", predicate: "works_at", to: "g_nasa", label: "worked at", inverse: "has employee", source: WIKI("Neil Armstrong") },
  { from: "g_apollo_11", predicate: "created_by", to: "g_nasa", label: "was run by", inverse: "created", source: WIKI("Apollo 11") },
  { from: "g_apollo_11", predicate: "part_of", to: "g_apollo_program", label: "is part of", inverse: "has part", source: WIKI("Apollo program") },
  { from: "g_apollo_11", predicate: "part_of", to: "g_moon_landing", label: "achieved", inverse: "has part", source: WIKI("Apollo 11") },
  { from: "g_moon_landing", predicate: "located_in", to: "g_moon", label: "took place on", inverse: "contains", source: WIKI("Moon landing") },

  // Technology
  { from: "g_apple", predicate: "created_by", to: "g_steve_jobs", label: "was co-founded by", inverse: "co-founded", source: WIKI("Apple Inc.") },
  { from: "g_iphone", predicate: "created_by", to: "g_apple", label: "was created by", inverse: "created", source: WIKI("iPhone") },
  { from: "g_iphone", predicate: "manufactured_by", to: "g_foxconn", label: "is assembled by", inverse: "assembles", source: WIKI("Foxconn") },
  { from: "g_apple", predicate: "located_in", to: "us_state_california", label: "is headquartered in", inverse: "contains", source: WIKI("Apple Inc.") },
  { from: "us_state_california", predicate: "part_of", to: "country_united_states", label: "is part of", inverse: "has part", source: WIKI("California") },
  { from: "g_silicon_valley", predicate: "located_in", to: "us_state_california", label: "is located in", inverse: "contains", source: WIKI("Silicon Valley") },
  { from: "g_apple", predicate: "located_in", to: "g_silicon_valley", label: "is located in", inverse: "contains", source: WIKI("Apple Inc.") },
  { from: "g_foxconn", predicate: "located_in", to: "country_china", label: "is located in", inverse: "contains", source: WIKI("Foxconn") },
  { from: "country_china", predicate: "located_in", to: "g_continent_asia", label: "is located in", inverse: "contains", source: WIKI("China") },

  // Nature
  { from: "g_bee", predicate: "produces", to: "g_honey", label: "produces", inverse: "is produced by", source: WIKI("Honey") },
  { from: "g_honey", predicate: "made_from", to: "g_nectar", label: "is made from", inverse: "is a material for", source: WIKI("Honey") },
  { from: "g_flower", predicate: "produces", to: "g_nectar", label: "produces", inverse: "is produced by", source: WIKI("Nectar") },
  { from: "g_bee", predicate: "part_of", to: "g_ant_colony", label: "lives in a colony of", inverse: "has member", source: WIKI("Bee") },
  { from: "g_ant", predicate: "part_of", to: "g_ant_colony", label: "lives in", inverse: "has member", source: WIKI("Ant") },
  { from: "g_bee", predicate: "used_for", to: "g_pollination", label: "is used for", inverse: "uses", source: WIKI("Pollination") },
  { from: "g_flower", predicate: "part_of", to: "g_plant", label: "is part of", inverse: "has part", source: WIKI("Flower") },
];

export const PUZZLES: PuzzleSeed[] = [
  { id: "puzzle.homer_nuclear_waste", start: "g_homer_simpson", target: "g_nuclear_waste" },
  { id: "puzzle.homer_electricity", start: "g_homer_simpson", target: "g_electricity" },
  { id: "puzzle.homer_springfield", start: "g_homer_simpson", target: "g_springfield" },
  { id: "puzzle.bart_disney", start: "g_bart_simpson", target: "g_disney" },
  { id: "puzzle.plant_disney", start: "g_springfield_plant", target: "g_disney" },
  { id: "puzzle.springfield_usa", start: "g_springfield", target: "country_united_states" },
  { id: "puzzle.disney_springfield", start: "g_disney", target: "g_springfield" },
  { id: "puzzle.eiffel_mona", start: "g_eiffel_tower", target: "g_mona_lisa" },
  { id: "puzzle.davinci_paris", start: "g_leonardo", target: "capital_paris" },
  { id: "puzzle.paris_europe", start: "capital_paris", target: "g_continent_europe" },
  { id: "puzzle.eiffel_europe", start: "g_eiffel_tower", target: "g_continent_europe" },
  { id: "puzzle.pizza_europe", start: "g_pizza", target: "g_continent_europe" },
  { id: "puzzle.pizza_paris", start: "g_pizza", target: "capital_paris" },
  { id: "puzzle.wine_italy", start: "g_wine", target: "country_italy" },
  { id: "puzzle.mona_europe", start: "g_mona_lisa", target: "g_continent_europe" },
  { id: "puzzle.earth_milky_way", start: "g_earth", target: "g_milky_way" },
  { id: "puzzle.moon_milky_way", start: "g_moon", target: "g_milky_way" },
  { id: "puzzle.armstrong_moon", start: "g_neil_armstrong", target: "g_moon" },
  { id: "puzzle.apollo_usa", start: "g_apollo_11", target: "country_united_states" },
  { id: "puzzle.armstrong_usa", start: "g_neil_armstrong", target: "country_united_states" },
  { id: "puzzle.jobs_foxconn", start: "g_steve_jobs", target: "g_foxconn" },
  { id: "puzzle.iphone_usa", start: "g_iphone", target: "country_united_states" },
  { id: "puzzle.iphone_asia", start: "g_iphone", target: "g_continent_asia" },
  { id: "puzzle.honey_flower", start: "g_honey", target: "g_flower" },
  { id: "puzzle.bee_colony", start: "g_bee", target: "g_ant_colony" },
  { id: "puzzle.rome_europe", start: "capital_rome", target: "g_continent_europe" },
  { id: "puzzle.plant_usa", start: "g_springfield_plant", target: "country_united_states" },
];
