function alphabetical(a, b) {
  var placeNameA = a.name.toUpperCase();
  var placeNameB = b.name.toUpperCase();
  if (placeNameA < placeNameB) {
    return -1;
  }
  if (placeNameA > placeNameB) {
    return 1;
  }
  return 0;
}

module.exports = alphabetical;
