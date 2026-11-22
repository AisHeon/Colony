/**
 * Hopper questions and their frozen reference rankings.
 *
 * Every ranking here is an editorial estimate written after reviewing plausible
 * answers. They are NOT survey results, and the app labels them that way. No
 * invented percentages, sample sizes or participant counts are stored.
 */

export type HopperSeed = {
  id: string;
  text: string;
  scope: string;
  sourceKind: "editorial_estimate";
  sourceMeta: { label: string; note: string; reviewedAt: string };
  buckets: Array<{ canonical: string; aliases: string[] }>;
};

const REVIEWED_AT = "2026-11-12";
const LABEL = "Estimated popular answers";
const NOTE = "Editorially reviewed expected ranking. Not a survey result.";

const q = (
  id: string,
  text: string,
  scope: string,
  buckets: Array<[string, string[]?]>,
): HopperSeed => ({
  id: `hopper.${id}`,
  text,
  scope,
  sourceKind: "editorial_estimate",
  sourceMeta: { label: LABEL, note: NOTE, reviewedAt: REVIEWED_AT },
  buckets: buckets.map(([canonical, aliases]) => ({ canonical, aliases: aliases ?? [] })),
});

const BASE_HOPPER_QUESTIONS: HopperSeed[] = [
  q("push_wheels", "Name something people push that has wheels.", "Everyday objects with wheels that a person pushes by hand.", [
    ["Shopping cart", ["shopping trolley", "grocery cart", "grocery trolley", "cart"]],
    ["Stroller", ["pushchair", "pram", "buggy", "baby carriage"]],
    ["Wheelchair", ["wheel chair"]],
    ["Wheelbarrow", ["wheel barrow", "barrow"]],
    ["Wagon", ["little wagon", "pull wagon"]],
    ["Push lawnmower", ["lawn mower", "push mower"]],
    ["Office chair", ["desk chair", "swivel chair"]],
  ]),
  q("birthday_party", "Name something people do at a birthday party.", "Typical activities at a birthday party.", [
    ["Eat cake", ["cake"]],
    ["Sing Happy Birthday", ["sing", "singing"]],
    ["Open presents", ["open gifts", "presents"]],
    ["Blow out candles", ["blow candles"]],
    ["Play games", ["games"]],
    ["Dance", ["dancing"]],
    ["Take photos", ["pictures"]],
  ]),
  q("kitchen_item", "Name something found in a kitchen.", "Appliances, fixtures and everyday tools found in a kitchen.", [
    ["Refrigerator", ["fridge"]],
    ["Stove", ["cooker", "stovetop"]],
    ["Sink", ["kitchen sink"]],
    ["Microwave", ["microwave oven"]],
    ["Oven", []],
    ["Toaster", []],
    ["Knife", ["kitchen knife"]],
  ]),
  q("beach_bring", "Name something you take to the beach.", "Items commonly packed for a beach trip.", [
    ["Towel", ["beach towel"]],
    ["Sunscreen", ["sunblock", "sun cream"]],
    ["Swimsuit", ["bathing suit", "swimming costume"]],
    ["Umbrella", ["beach umbrella", "parasol"]],
    ["Cooler", ["cool box", "ice chest"]],
    ["Sunglasses", ["shades"]],
    ["Bucket and spade", ["sand bucket", "spade"]],
  ]),
  q("hand_food", "Name a food you eat with your hands.", "Foods normally eaten without cutlery.", [
    ["Pizza", []],
    ["Sandwich", []],
    ["Chips", ["fries", "crisps"]],
    ["Burger", ["hamburger"]],
    ["Fries", ["chips"]],
    ["Fruit", ["apple", "banana"]],
    ["Cookies", ["biscuits"]],
  ]),
  q("wake_up", "Name something you do when you wake up.", "First things people commonly do after waking.", [
    ["Brush teeth", ["brush my teeth"]],
    ["Check phone", ["look at phone"]],
    ["Shower", ["take a shower"]],
    ["Eat breakfast", ["breakfast"]],
    ["Drink coffee", ["coffee"]],
    ["Get dressed", ["get ready"]],
    ["Snooze alarm", ["hit snooze"]],
  ]),
  q("wedding", "Name something people do at a wedding.", "Common activities at a wedding reception or ceremony.", [
    ["Dance", ["dancing"]],
    ["Eat", ["dinner"]],
    ["Toast", ["give a toast", "speech"]],
    ["Cry", ["tears"]],
    ["Throw bouquet", ["toss the bouquet"]],
    ["Take photos", ["pictures"]],
    ["Give a speech", ["toast"]],
  ]),
  q("late_work", "Name a reason you might be late for work.", "Common causes of arriving late to work.", [
    ["Traffic", ["traffic jam"]],
    ["Overslept", ["slept in"]],
    ["Alarm didn't go off", ["forgot alarm"]],
    ["Public transport delay", ["train delay", "bus late"]],
    ["Kids", ["school run"]],
    ["Weather", ["snow"]],
    ["Car trouble", ["flat tire", "breakdown"]],
  ]),
  q("wallet", "Name something you keep in your wallet.", "Items commonly carried in a wallet.", [
    ["Money", ["cash", "cash"]],
    ["Credit card", ["debit card", "bank card"]],
    ["ID", ["identification", "driver's license", "licence"]],
    ["Receipts", ["receipt"]],
    ["Photos", ["photo"]],
    ["Business cards", ["business card"]],
    ["Stamps", ["stamp"]],
  ]),
  q("cold_thing", "Name something that is cold.", "Objects, places or experiences commonly described as cold.", [
    ["Ice", []],
    ["Snow", []],
    ["Ice cream", ["icecream"]],
    ["Refrigerator", ["fridge"]],
    ["Winter", []],
    ["Freezer", []],
    ["Air conditioning", ["air conditioner", "ac"]],
  ]),
  q("in_a_car", "Name something people do while riding in a car.", "Activities passengers or drivers do in a car.", [
    ["Listen to music", ["music"]],
    ["Talk", ["chat"]],
    ["Sing", ["singing"]],
    ["Eat", ["snack"]],
    ["Nap", ["sleep"]],
    ["Argue", ["fight"]],
    ["Look out the window", ["window watching"]],
  ]),
  q("chore", "Name a household chore people avoid.", "Common household chores people put off.", [
    ["Dishes", ["washing up"]],
    ["Laundry", ["washing clothes"]],
    ["Vacuuming", ["vacuum"]],
    ["Ironing", ["iron"]],
    ["Cleaning the bathroom", ["toilet cleaning"]],
    ["Taking out the trash", ["taking out rubbish"]],
    ["Dusting", ["dust"]],
  ]),
  q("backpack", "Name something you might find in a backpack.", "Items commonly carried in a backpack.", [
    ["Books", ["book"]],
    ["Laptop", ["computer"]],
    ["Water bottle", ["water"]],
    ["Snacks", ["snack"]],
    ["Pencil case", ["pencils", "pens"]],
    ["Umbrella", []],
    ["Headphones", ["earphones"]],
  ]),
  q("rainy_day", "Name something people do on a rainy day.", "Activities common during rainy weather.", [
    ["Stay inside", ["stay indoors"]],
    ["Watch movies", ["watch tv", "movies"]],
    ["Read", ["reading"]],
    ["Sleep", ["nap"]],
    ["Play board games", ["board games"]],
    ["Use an umbrella", ["umbrella"]],
    ["Drink tea", ["tea"]],
  ]),
  q("relax_place", "Name a place people go to relax.", "Places associated with rest and relaxation.", [
    ["Beach", []],
    ["Spa", []],
    ["Park", []],
    ["Home", ["house"]],
    ["Bed", ["bedroom"]],
    ["Library", []],
    ["Vacation", ["holiday"]],
  ]),
  q("buttons", "Name something that has buttons.", "Objects with pressable buttons.", [
    ["Shirt", []],
    ["Remote control", ["remote"]],
    ["Elevator", ["lift"]],
    ["Keyboard", ["computer keyboard"]],
    ["Phone", ["smartphone"]],
    ["Microwave", []],
    ["Jacket", ["coat"]],
  ]),
  q("breakfast", "Name a breakfast food.", "Foods commonly eaten for breakfast.", [
    ["Eggs", ["egg"]],
    ["Bacon", []],
    ["Cereal", []],
    ["Pancakes", ["pancake"]],
    ["Toast", []],
    ["Waffles", ["waffle"]],
    ["Oatmeal", ["porridge"]],
  ]),
  q("picnic", "Name something you'd bring to a picnic.", "Items commonly packed for a picnic.", [
    ["Blanket", ["picnic blanket"]],
    ["Sandwiches", ["sandwich"]],
    ["Drinks", ["soda", "water"]],
    ["Fruit", []],
    ["Chips", ["crisps"]],
    ["Basket", ["picnic basket"]],
    ["Sunscreen", ["sunblock"]],
  ]),
  q("waiting_line", "Name something people do while waiting in line.", "Behaviours common while queuing.", [
    ["Check phone", ["look at phone"]],
    ["Talk", ["chat"]],
    ["Read", []],
    ["Complain", ["moan"]],
    ["Tap foot", ["fidget"]],
    ["People watch", ["people watching"]],
    ["Sigh", ["huff"]],
  ]),
  q("hear_music", "Name a place where you might hear music.", "Places music is commonly played.", [
    ["Concert", ["gig"]],
    ["Car", []],
    ["Gym", []],
    ["Party", []],
    ["Elevator", ["lift"]],
    ["Store", ["shop"]],
    ["Wedding", []],
  ]),
  q("at_the_gym", "Name something you do at the gym.", "Common gym activities.", [
    ["Lift weights", ["weights", "weightlifting"]],
    ["Run", ["running", "treadmill"]],
    ["Stretch", ["stretching"]],
    ["Cycle", ["cycling", "bike"]],
    ["Swim", ["swimming"]],
    ["Yoga", []],
    ["Drink water", ["water break"]],
  ]),
  q("collect", "Name something people collect.", "Items people commonly collect as a hobby.", [
    ["Stamps", ["stamp collecting"]],
    ["Coins", ["coin collecting"]],
    ["Cards", ["trading cards"]],
    ["Rocks", ["stones"]],
    ["Books", []],
    ["Vinyl records", ["records"]],
    ["Sneakers", ["shoes"]],
  ]),
  q("long_travel", "Name a way to travel a long distance.", "Transport modes used for long journeys.", [
    ["Plane", ["airplane", "flight"]],
    ["Train", []],
    ["Car", []],
    ["Bus", ["coach"]],
    ["Boat", ["ship", "cruise"]],
    ["Motorcycle", ["motorbike"]],
    ["Ship", ["boat"]],
  ]),
  q("hotel_room", "Name something you find in a hotel room.", "Common hotel room features and items.", [
    ["Bed", []],
    ["TV", ["television"]],
    ["Towel", ["towels"]],
    ["Minibar", ["fridge"]],
    ["Desk", []],
    ["Shower", ["bathroom"]],
    ["Phone", ["telephone"]],
  ]),
  q("sliced_food", "Name a food that comes in slices.", "Foods typically cut into slices.", [
    ["Pizza", []],
    ["Bread", []],
    ["Cake", []],
    ["Cheese", []],
    ["Pie", []],
    ["Watermelon", []],
    ["Ham", []],
  ]),
];

/** Lower-ranked answers for the original prompts. Order is still intentional. */
const MORE_BUCKETS: Record<string, string> = {
  push_wheels: "Luggage cart|Pallet jack|Golf push cart|Lawn roller|Child's tricycle|Hospital gurney|Rolling suitcase|Wheeled shopping basket",
  birthday_party: "Piñata|Balloons|Party hats|Karaoke|Pizza|Party poppers|Pass the parcel|Face painting",
  kitchen_item: "Dishwasher|Kettle|Blender|Frying pan|Cutting board|Coffee maker|Spatula|Trash can",
  beach_bring: "Beach chair|Sun hat|Flip-flops|Beach ball|Snorkel|Book|Drinking water|Picnic blanket",
  hand_food: "Taco|Burrito|Hot dog|Doughnut|Pretzel|Chicken wings|Sushi|Wrap",
  wake_up: "Make the bed|Brush hair|Check the time|Let the dog out|Drink water|Scroll social media|Stretch|Turn off the alarm",
  wedding: "First dance|Wedding vows|Walk down the aisle|Throw confetti|Sign the guestbook|Drink champagne|Cut the cake|Kiss the couple",
  late_work: "Lost keys|Roadworks|Traffic accident|Snowstorm|Sick child|Car wouldn't start|Missed exit|Doctor appointment",
  wallet: "Gift cards|Loyalty cards|Library card|Coins|Insurance card|Transit pass|Old lottery ticket|Notes",
  cold_thing: "Ice cube|Popsicle|Winter coat|Mountain top|Antarctica|Cold brew coffee|Hail|Freezer",
  in_a_car: "Charge your phone|Play I Spy|Give directions|Read a book|Watch a film|Stretch at a rest stop|Complain about traffic|Take a photo",
  chore: "Mopping|Making the bed|Cleaning windows|Mowing the lawn|Cleaning the oven|Sorting recycling|Cleaning the fridge|Watering plants",
  backpack: "Keys|Wallet|Charger|Notebook|Sunglasses|Tissues|Hand sanitizer|Laptop charger",
  rainy_day: "Bake cookies|Do a puzzle|Listen to the rain|Watch the storm|Clean the house|Call a friend|Play video games|Organise photos",
  relax_place: "Hot tub|Sauna|Cabin|Garden|Coffee shop|Mountain|Hammock|Lake",
  buttons: "Camera|Calculator|Game controller|Washing machine|Dishwasher|Doorbell|Vending machine|Alarm clock",
  breakfast: "Bagel|Yogurt|Smoothie|Croissant|Hash browns|Muffin|Fruit|Granola",
  picnic: "Cheese|Crackers|Salad|Pie|Cookies|Lemonade|Napkins|Frisbee",
  waiting_line: "Listen to music|Stretch|Chat with a stranger|Check your watch|Shift your weight|Let someone ahead|Play a game|Hum a song",
  hear_music: "Festival|Church|Restaurant|Shopping mall|Sports stadium|Movie theatre|School|Headphones",
  at_the_gym: "Rowing machine|Jump rope|Elliptical trainer|Squats|Bench press|Exercise class|Shower|Chat",
  collect: "Comic books|Postcards|Figurines|Action figures|Teapots|Snow globes|Seashells|Keychains",
  long_travel: "Ferry|Camper van|Sleeper train|Cargo ship|Helicopter|Private jet|Coach|Caravan",
  hotel_room: "Kettle|Coffee maker|Hair dryer|Safe|Iron|Ironing board|Bathrobe|Slippers",
  sliced_food: "Salami|Cucumber|Tomato|Onion|Carrot|Pineapple|Melon|Roast beef",
};

const simple = (id: string, text: string, scope: string, raw: string): HopperSeed =>
  q(
    id,
    text,
    scope,
    raw.split("|").map((value) => [value.trim()] as [string]),
  );

const MORE_HOPPER_QUESTIONS: HopperSeed[] = [
  simple("bathroom", "Name something you find in a bathroom.", "Fixtures and everyday items in a bathroom.", "Toilet|Sink|Shower|Bathtub|Mirror|Toothbrush|Towel|Soap|Shampoo|Toilet paper|Razor|Hair dryer"),
  simple("school_bag", "Name something you find in a school bag.", "Items a student commonly carries.", "Books|Notebook|Pencil case|Lunch|Water bottle|Calculator|Laptop|Gym kit|Keys|Phone|Headphones|Homework"),
  simple("pizza_topping", "Name a pizza topping.", "Common pizza toppings.", "Cheese|Pepperoni|Mushroom|Ham|Pineapple|Onion|Sausage|Bacon|Olives|Green pepper|Tomato|Jalapeño"),
  simple("appliance", "Name a household appliance.", "Powered appliances found in a home.", "Refrigerator|Washing machine|Dryer|Dishwasher|Oven|Microwave|Toaster|Kettle|Vacuum cleaner|Blender|Coffee maker|Air fryer"),
  simple("playground", "Name something you find at a playground.", "Equipment and features at a children's playground.", "Swing|Slide|Seesaw|Roundabout|Climbing frame|Sandbox|Monkey bars|Spring rider|Basketball hoop|Bench|Zip line|Tunnel"),
  simple("farm_animal", "Name a farm animal.", "Animals commonly kept on a farm.", "Cow|Pig|Chicken|Sheep|Horse|Goat|Duck|Turkey|Donkey|Rooster|Goose|Llama"),
  simple("airport", "Name something you do at an airport.", "Activities and steps in an airport.", "Check in|Go through security|Shop duty free|Wait at the gate|Board the plane|Collect bags|Passport control|Eat overpriced food|Watch planes|Buy coffee|Use the lounge|Say goodbye"),
  simple("yellow_fruit", "Name a fruit that is yellow.", "Fruits with a yellow skin or flesh.", "Banana|Lemon|Pineapple|Mango|Papaya|Star fruit|Peach|Apricot|Golden kiwi|Quince|Jackfruit|Yellow plum"),
  simple("things_fly", "Name something that flies.", "Living things and objects that fly.", "Bird|Airplane|Helicopter|Bee|Butterfly|Drone|Balloon|Kite|Rocket|Mosquito|Eagle|Frisbee"),
  simple("supermarket", "Name something you buy at a supermarket.", "Everyday groceries.", "Milk|Bread|Eggs|Bananas|Cheese|Chicken|Rice|Pasta|Cereal|Toilet paper|Apples|Frozen pizza"),
  simple("christmas", "Name a Christmas tradition.", "Common Christmas customs.", "Decorate the tree|Open presents|Eat turkey|Hang stockings|Sing carols|Watch movies|Drink eggnog|Give gifts|Visit family|Put up lights|Bake cookies|Kiss under mistletoe"),
  simple("forget", "Name something people often forget.", "Things people regularly leave behind or forget.", "Keys|Phone|Wallet|Password|Birthday|Umbrella|Charger|Groceries|Appointment|Names|Glasses|Why you walked into a room"),
  simple("call_friend", "Name a reason to call a friend.", "Reasons people phone a friend.", "To chat|Share news|Ask for help|Make plans|Say happy birthday|Complain|Catch up|Invite them out|Ask advice|Tell a joke|Check in|Say goodnight"),
  simple("makes_laugh", "Name something that makes people laugh.", "Common sources of laughter.", "Jokes|Memes|Funny videos|Friends|Stand-up comedy|Cats|Bloopers|Puns|Tickling|Baby videos|Embarrassing stories|Dad jokes"),
  simple("desk_drawer", "Name something you find in a desk drawer.", "Items kept in a desk drawer.", "Pens|Scissors|Stapler|Tape|Paper clips|Batteries|Sticky notes|Charger|Snacks|Rubber bands|Glue|Takeaway menus"),
  simple("holiday", "Name a type of holiday destination.", "Places people go on holiday.", "Beach|Mountains|City break|Theme park|Camping|Cruise|Cabin|Resort|Lake|Island|Road trip|Ski resort"),
  simple("sandwich", "Name a sandwich filling.", "Common sandwich fillings.", "Ham|Cheese|Tuna|Chicken|Egg|BLT|Peanut butter and jelly|Turkey|Cucumber|Salmon|Bacon|Salad"),
  simple("screen", "Name something with a screen.", "Devices and objects that have a screen.", "Phone|TV|Laptop|Tablet|Monitor|Smartwatch|Cinema screen|Nintendo Switch|ATM|GPS|E-reader|Video game console"),
  simple("pet", "Name a common pet.", "Animals commonly kept as pets.", "Dog|Cat|Fish|Hamster|Rabbit|Bird|Guinea pig|Turtle|Snake|Lizard|Gerbil|Ferret"),
  simple("doctor", "Name something you find in a doctor's office.", "Equipment and features of a doctor's office.", "Stethoscope|Blood pressure cuff|Waiting room|Magazines|Scale|Thermometer|Prescription pad|Exam table|Hand sanitizer|Reception desk|Needle|X-ray"),
  simple("exercise", "Name a way to exercise.", "Common forms of exercise.", "Running|Walking|Swimming|Cycling|Yoga|Weightlifting|Dancing|Pilates|Jump rope|Hiking|Rowing|Boxing"),
  simple("car_colour", "Name a common car colour.", "Paint colours commonly seen on cars.", "Black|White|Silver|Grey|Red|Blue|Green|Yellow|Orange|Brown|Gold|Beige"),
  simple("fridge", "Name something you keep in the fridge.", "Food and drinks stored in a refrigerator.", "Milk|Eggs|Butter|Cheese|Vegetables|Fruit|Leftovers|Juice|Yogurt|Condiments|Beer|Ice"),
  simple("cinema", "Name something you do at the cinema.", "Activities around a cinema visit.", "Watch trailers|Eat popcorn|Find your seat|Turn off your phone|Watch the film|Whisper|Go for snacks|Use the bathroom|Complain about the price|Stay for the credits|Fall asleep|Laugh"),
  simple("night_sounds", "Name a sound you hear at night.", "Sounds common after dark.", "Crickets|An owl|Snoring|Traffic|Rain|Wind|A dog barking|A ticking clock|The fridge humming|Sirens|A train|A mosquito"),
];

const withMoreBuckets = (question: HopperSeed): HopperSeed => {
  const key = question.id.replace(/^hopper\./, "");
  const raw = MORE_BUCKETS[key];
  if (!raw) return question;
  return {
    ...question,
    buckets: [
      ...question.buckets,
      ...raw.split("|").map((value) => ({ canonical: value.trim(), aliases: [] })),
    ],
  };
};

export const HOPPER_QUESTIONS: HopperSeed[] = [
  ...BASE_HOPPER_QUESTIONS.map(withMoreBuckets),
  ...MORE_HOPPER_QUESTIONS,
];
