readCache = function () {
  writeCache("");

  console.log("readCache: reading the cache");
  var cache = { cards: [] };

  if (typeof (Storage) != "undefined") {
    var cacheString = localStorage.getItem("cache");
    if (cacheString != null) {
      var cache = JSON.parse(cacheString);
      if (cache == null) {
        cache = { cards: [] };
      }
    }

    if (cache === "") {
      cache = { cards: [], ratings: [] }
    }

    console.log("readCache: " + JSON.stringify(cache));
  }

  return cache;
}

syncCacheWithServer = function (http, scope) {
  var cache = readCache();
  if (cache.ratings) {
    // Try to send all ratings to server
    var newRatingCache = [];
    cache.ratings.forEach(function (rating) {
      var url = generateRatingsUrl(rating.contentId, rating.ratingValue);

      http.put(url).success(function (response) {
        console.log("syncCacheWithServer: submitted rating to server");

      }).error(function (response) {
        console.log("syncCacheWithServer: failed to submit rating to server. Will leave rating in cache");

        newRatingCache.unshift(angular.extend({}, rating));
      });;
    }, this);

    // Now save the new list into the cache
    cache.ratings = newRatingCache;
  }

  console.log("syncCacheWithServer: refreshing groups");
  if (!cache.groups) {
    cache.groups = [];
  }

  var groupsUrl = generateGroupsUrl();
  http.get(groupsUrl).success(function (response) {
    console.log("syncCacheWithServer: groups found from server." + JSON.stringify(response));
    var groupsList = [];
    if (response) {
      // For each group in the group list, add it to cache
      response.forEach(function (groupName) {
        console.log("syncCacheWithServer: Processing group " + groupName);

        // Check to see if the group already exists
        var found = false;
        console.log("syncCacheWithServer: checking existing cache to see if groups already exist");
        cache.groups.forEach(function (existingGroup) {
          if (existingGroup.name === groupName) {
            found = true;
            console.log("syncCacheWithServer: Group " + groupName + " already exists");
            groupsList.unshift(angular.extend({}, { name: groupName, class: existingGroup.class }));
          }
        });

        if (!found) {
          // Before adding it, see if it was already added
          console.log("syncCacheWithServer: Group " + groupName + " not found. Adding to cache.");
          groupsList.unshift(angular.extend({}, { name: groupName, class: "fa fa-check-circle" }));
        }
      });
    }

    console.log("syncCacheWithServer: Group refreshed: " + JSON.stringify(groupsList));
    cache.groups = groupsList;

    console.log("syncCacheWithServer: Saving new cache: " + JSON.stringify(cache));

    writeCache(cache);

    console.log("syncCacheWithServer: Cache saved. Forcing UI refresh");

    scope.loadCache();
  });

  writeCache(cache);

  console.log("Cards saved. Forcing UI refresh");

  scope.loadCache();

  return true;
}

/* Ratings are only stored temporarily. They are stored if the server is 
inaccessible for whatever reason and will attempt to resend at a later date */
updateRatings = function (cardId, rating) {
  console.log("updateRatings: called for " + cardId + " " + rating);
  var cache = readCache();

  if (!cache.ratings) {
    cache.ratings = [];
  }

  cache.ratings.unshift(angular.extend({}, { contentId: cardId, ratingValue: rating }));
  console.log("updateRatings: new ratings values are - " + JSON.stringify(cache.ratings));

  writeCache(cache);
}

updateCards = function (cards) {
  console.log("ordering cards before save. Cards before order: " + JSON.stringify(cards));

  // if length is greater than 4, delete excess cards
  // this means, after latest card is added, app is only storing 5
  var count = cards.length;
  console.log(count + " cards already saved on the device.");

  if (count > 4) {
    console.log("The device currently has too many cards saved. Cleaning.")
    var cardsToDelete = count - 4;

    console.log("Deleting " + cardsToDelete + " cards.")
    cards.splice(0, cardsToDelete);
  }

  console.log("Sorting cards by date");
  cards = cards.sort(function (a, b) {
    a = new Date(a.dateTime);
    b = new Date(b.dateTime);
    return a > b ? -1 : a < b ? 1 : 0;
  });

  console.log("Cards after order: " + JSON.stringify(cards));
  console.log("Saving cards");

  var cache = this.readCache();
  cache.cards = cards;
  this.writeCache(cache);
}

writeCache = function (cache) {
  // Cards are added to array and storage now
  localStorage.setItem("cache", JSON.stringify(cache));
}

clearCache = function (cache) {
  localStorage.setItem("cache", null);
}