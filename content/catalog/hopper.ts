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

export const HOPPER_QUESTIONS: HopperSeed[] = [
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
