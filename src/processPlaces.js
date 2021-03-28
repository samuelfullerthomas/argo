const config = require("../config.json");
const filters = require("./filters");
const sorts = require("./sorts");

function processPlaces(placesWithDetails) {
  const placesThatExist = placesWithDetails
    .filter((place) => !!place)
    .map((place) => ({
      totalRatings: place.user_ratings_total,
      name: place.name,
      phoneNumber: place.formatted_phone_number,
      address: place.formatted_address,
      rating: place.rating,
      tag: place.types.join(", "),
      website: place.website,
      googleMapsUrl: place.url,
    }));

  const filteredPlaces = config.filters.reduce(
    (filteredPlaces, selectedFilter) => {
      if (!filters[selectedFilter]) {
        console.error("selected filter does not exist!");
        console.info(`Existing filters: [${filters.join(" | ")}]`);
        return filteredPlaces;
      }
      console.log(`applying filter: ${selectedFilter}`);
      return filteredPlaces.filter(filters[selectedFilter]);
    },
    placesThatExist
  );

  const selectedSort = sorts[config.sort] || "alphabetical";

  console.log(`applying sort: ${selectedSort}`);

  const sortedPlaces = filteredPlaces.sort(selectedSort);

  return sortedPlaces;
}

module.exports = processPlaces;
