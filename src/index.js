const { Client } = require("@googlemaps/google-maps-services-js");
const { writeFileSync, existsSync, mkdirSync } = require("fs");
const ProgressBar = require("progress");
const { Parser } = require("json2csv");

const config = require("../config.json");
const { getGrid, sleep } = require("./helpers");
const munge = require("./mungeAndSort");
const client = new Client({});

async function getNearby(radiusInMeters, places, latLongPoint, pagetoken) {
  if (pagetoken) {
    await sleep(2000);
  }
  const response = await client
    .placesNearby({
      params: {
        key: config.apiKey,
        type: config.mapsType,
        radius: radiusInMeters,
        location: latLongPoint,
        pagetoken,
      },
    })
    .catch((e) => {
      console.log(e);
    });

  if (response.data.next_page_token) {
    return getNearby(
      radiusInMeters,
      places.concat(response.data.results),
      latLongPoint,
      response.data.next_page_token
    );
  } else {
    return places.concat(response.data.results);
  }
}

async function getAllPlaces(latLongPoint, radiusInMeters, grid) {
  const placesFromGoogle = await getNearby(radiusInMeters, [], latLongPoint);
  if (placesFromGoogle.length === 60) {
    const subGrib = getGrid(
      [latLongPoint[0] - grid.latStep, latLongPoint[0] + grid.latStep],
      [latLongPoint[1] - grid.longStep, latLongPoint[1] + grid.longStep],
      radiusInMeters / 4
    );
    const morePlaces = await traverse(subGrib, radiusInMeters / 4);
    return morePlaces;
  }
  return placesFromGoogle;
}

async function traverse(grid, radiusInMeters, bar) {
  let places = [];
  for (let i = 0; i < grid.steps.length; i++) {
    if (bar) bar.tick();
    const restos = await getAllPlaces(grid.steps[i], radiusInMeters, grid);
    places = places.concat(restos);
  }
  return places;
}

async function run() {
  const grid = getGrid(
    config.latRange,
    config.longRange,
    config.radiusInMeters
  );

  console.log(`Starting transversal of grid...`);
  const bar = new ProgressBar("[:bar] :percent :etas", {
    total: grid.steps.length,
  });
  const places = await traverse(grid, config.radiusInMeters, bar);

  console.log(`Grid transversal compelete...`);

  const placeIds = places
    .map((place) => place.place_id)
    .filter((rs, index, arr) => arr.indexOf(rs) === index);

  console.log(
    `discovered ${places.length} ${config.mapsType}s, of which ${placeIds.length} are unique`
  );

  const placesResponses = await Promise.all(
    placeIds.map((placeId) =>
      client.placeDetails({
        params: {
          key: config.apiKey,
          place_id: placeId,
        },
      })
    )
  );

  const placesWithDetails = placesResponses
    .map((response) => response.data.result)
    .flat();

  const mungedAndSortedPlaces = munge(placesWithDetails);

  if (!existsSync("out")) {
    mkdirSync("out");
  }
  writeFileSync("out/rawPlaceList.json", JSON.stringify({ places }, null, 2));
  writeFileSync(
    "out/placesWithDetails.json",
    JSON.stringify({ places: placesWithDetails }, null, 2)
  );
  writeFileSync(
    "out/sortedPlaces.json",
    JSON.stringify({ places: mungedAndSortedPlaces }, null, 2)
  );
  const parser = new Parser();

  writeFileSync("out/sortedPlaces.csv", parser.parse(mungedAndSortedPlaces));

  console.log("written files to out folder, and you are all set");
}

run();
