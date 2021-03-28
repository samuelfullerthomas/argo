function rating(a, b) {
  if (a.totalRatings === b.totalRatings) return 0;
  return a.totalRatings < b.totalRatings ? 1 : -1;
}

module.exports = rating;
