const isChain = require("./chains");
const config = require("../config.json");

function mungeAndSort(placesWithDetails) {
  const filteredPlaces = placesWithDetails
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
    }))
    .filter((place) =>
      config.filterChainRestaurants ? !isChain(place.name) : true
    );

  function ratingsToTop(a, b) {
    if (a.totalRatings === b.totalRatings) return 0;
    return a.totalRatings < b.totalRatings ? 1 : -1;
  }

  const sortedPlaces = filteredPlaces.sort(ratingsToTop);

  return sortedPlaces;
}

module.exports = mungeAndSort;
