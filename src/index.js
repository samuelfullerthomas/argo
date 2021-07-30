const { Client } = require("@googlemaps/google-maps-services-js");
const { writeFileSync, existsSync, mkdirSync } = require("fs");
const ProgressBar = require("progress");
const { Parser } = require("json2csv");

const config = require("../config.json");
const { getGrid, sleep } = require("./helpers");
const processPlaces = require("./processPlaces");
const client = new Client({});

async function getNearby(
  searchRadiusInMeters,
  places,
  latLongPoint,
  pagetoken
) {
  if (pagetoken) {
    await sleep(2000);
  }
  const response = await client
    .placesNearby({
      params: {
        key: config.apiKey,
        type: config.placeType,
        radius: searchRadiusInMeters,
        location: latLongPoint,
        pagetoken,
      },
    })
    .catch((e) => {
      console.log(e);
    });
  if (response.data.next_page_token) {
    return getNearby(
      searchRadiusInMeters,
      places.concat(response.data.results),
      latLongPoint,
      response.data.next_page_token
    );
  } else {
    return places.concat(response.data.results);
  }
}

async function getAllPlaces(latLongPoint, searchRadiusInMeters, grid) {
  console.log("getting places from: ", latLongPoint, " ", searchRadiusInMeters);
  const placesFromGoogle = await getNearby(
    searchRadiusInMeters,
    [],
    latLongPoint
  );
  if (placesFromGoogle.length === 60) {
    const subGrib = getGrid(
      [latLongPoint[0] - grid.latStep, latLongPoint[0] + grid.latStep],
      [latLongPoint[1] - grid.longStep, latLongPoint[1] + grid.longStep],
      searchRadiusInMeters / 4
    );
    const morePlaces = await traverse(subGrib, searchRadiusInMeters / 4);
    return morePlaces;
  }
  return placesFromGoogle;
}

async function traverse(grid, searchRadiusInMeters, bar) {
  let places = [];
  console.log("grid steps: ", grid.steps.length);
  for (let i = 0; i < grid.steps.length; i++) {
    if (bar) bar.tick();
    const gridSectionPlaces = await getAllPlaces(
      grid.steps[i],
      searchRadiusInMeters,
      grid
    );
    places = places.concat(gridSectionPlaces);
  }
  return places;
}

async function run() {
  const grid = getGrid(
    config.latRange,
    config.longRange,
    config.searchRadiusInMeters
  );

  console.log(`Starting transversal of grid...`);
  const bar = new ProgressBar("[:bar] :percent :etas", {
    total: grid.steps.length,
  });
  const places = await traverse(grid, config.searchRadiusInMeters, bar);

  const { placesWithDetails } = places.reduce((res, place) => {
    if (!res.placeIds.includes(place.place_id)) {
      return {
        placeIds: res.placeIds.concat(place.place_id),
        placesWithDetails: res.placesWithDetails.concat(place),
      };
    }

    return res;
  }, { placeIds: [], placesWithDetails: [] });

  console.log(`Grid transversal complete...`);

  console.log(
    `discovered ${places.length} ${config.placeType}s, of which ${placesWithDetails.length} are unique`
  );

  const processedPlaces = processPlaces(placesWithDetails);

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
    JSON.stringify({ places: processedPlaces }, null, 2)
  );
  const parser = new Parser();

  writeFileSync("out/sortedPlaces.csv", parser.parse(processedPlaces));

  console.log("written files to out folder, and you are all set");
}

run();
