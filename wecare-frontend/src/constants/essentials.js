// Predefined list of essential items for aid requests
export const ESSENTIAL_ITEMS = [
  "Diapers",
  "Baby Formula",
  "Baby Food",
  "Baby Clothes",
  "Baby Blankets",
  "Baby Bottles",
  "Baby Wipes",
  "Baby Toys",
  "Maternity Clothes",
  "Baby Carrier"
];

export const getEssentialItemOptions = () => {
  return ESSENTIAL_ITEMS.map(item => ({
    value: item,
    label: item
  }));
};
