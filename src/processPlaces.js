const config = require("../config.json");
const filters = require("./filters");
const sorts = require("./sorts");

function processPlaces(placesWithDetails) {
  const placesThatExist = placesWithDetails
    .filter((place) => !!place)
    .map((place) => ({
      totalRatings: place.user_ratings_total,
      name: place.name,
      address: place.vicinity,
      rating: place.rating,
      tag: place.types.join(", "),
      url: place.url,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      placeId: place.place_id,
      status: place.business_status,
      photo: place.photos && place.photos[0].photo_reference,
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
