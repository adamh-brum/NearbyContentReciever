// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('contentReceiver', ['ionic', 'ionic.contrib.ui.cards'])

  .run(function ($ionicPlatform, $rootScope, $http) {
    $ionicPlatform.ready(function () {
      if (window.cordova && window.cordova.plugins) {
        if (window.cordova.plugins.Keyboard) {
          console.log("Updating keyboard settings (Hide keyboard, disable scroll)")

          // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
          // for form inputs)
          cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

          // Don't remove this line unless you know what you are doing. It stops the viewport
          // from snapping when text inputs are focused. Ionic handles this internally for
          // a much nicer keyboard experience.
          cordova.plugins.Keyboard.disableScroll(true);
        }

        if (window.cordova.plugins.notification) {
          console.log("Requesting notification permission");
          window.cordova.plugins.notification.local.promptForPermission();
        }

        if (window.cordova.plugins.locationManager) {
          console.log("Requesting Location Permission");
          cordova.plugins.locationManager.requestAlwaysAuthorization();
        }
      }

      if (window.StatusBar) {
        StatusBar.styleDefault();
      }
    });
  })

  .controller('CardsCtrl', function ($ionicPlatform, $scope, $http) {
    $scope.cards = [];
    $scope.settingsClass = "invisible";
    $scope.messagesClass = "visible";
    $scope.groups = [];

    // Start ranging for beacons
    $ionicPlatform.ready(function () {
      var delegate = new window.cordova.plugins.locationManager.Delegate();

      delegate.didDetermineStateForRegion = function (pluginResult) {
        // if we are inside the beacon region, go grab content
        if (pluginResult.state && pluginResult.state === "CLRegionStateInside") {
          console.log("Inside region for beacon: " + pluginResult.region.uuid);
          $scope.getCardFromServer(pluginResult.region.uuid);
        }
      };

      delegate.didStartMonitoringForRegion = function (pluginResult) {
      };

      cordova.plugins.locationManager.setDelegate(delegate);

      var url = "http://nearbycontentapi.azurewebsites.net/api/Beacon";
      $http.get(url).success(function (response) {
        response.forEach(function (element) {
          var id = element.beaconId;
          var uuid = element.uuid;

          try {
            var region = new cordova.plugins.locationManager.BeaconRegion(id, uuid);
          }
          catch (ex) {
            console.log("An error occured while creating a beacon region: " + JSON.stringify(ex));
            console.log("Error message:" + ex.message);
          }

          cordova.plugins.locationManager.startMonitoringForRegion(region)
            .fail(console.error)
            .done();

          cordova.plugins.locationManager.startRangingBeaconsInRegion(region)
            .fail(console.error)
            .done();
        }, this);
      });
    });

    $scope.clickGroup = function (groupName) {
      $scope.groups.forEach(function (group) {
        if (group.class === "fa fa-check-circle") {
          group.class = "fa fa-check-circle-o";
        }
        else {
          group.class = "fa fa-check-circle";
        }
      });
    }

    $scope.openMessages = function () {
      console.log("Opening messages");
      $scope.messagesClass = "visible";

      // Close other tabs
      $scope.settingsClass = "invisible";
    }

    $scope.openSettings = function () {
      console.log("Opening settings");
      $scope.settingsClass = "visible";

      // Close other tabs
      $scope.messagesClass = "invisible";
    }

    $scope.loadCache = function () {
      var cache = readCache();
      var cards = cache.card;
      for (cardIndex in cards) {
        $scope.displayCard(cards[cardIndex]);
      }

      // Retrieve saved groups
      $scope.groups = cache.groups;
    }

    $scope.displayCard = function (card) {
      $scope.cards.unshift(angular.extend({}, card));
    }

    $scope.addCard = function (contentId, content, name, requestDateTime, locationName) {
      var card = { id: contentId, htmlContent: content, title: name, dateTime: requestDateTime, location: locationName, thumbUpClass: "fa fa-thumbs-o-up", thumbDownClass: "fa fa-thumbs-o-down" };
      $scope.displayCard(card);

      // Cards are added to array and storage now
      updateCards($scope.cards);
    }

    $scope.getCardFromServer = function (beaconId) {
      console.log("getCardFromServer: Attempting to retrieve content for beacon UUID: " + beaconId);

      var url = generateGetContentUrl(beaconId);
      console.log("getCardFromServer: using URL: " + url);

      $http.get(url).success(function (response) {
        console.log("getCardFromServer: Response is " + JSON.stringify(response));
        if (response != "") {
          response.forEach(function (element) {
            $scope.addCard(element.id, element.content, element.contentShortDescription, element.RequestDateTime, element.locationName);
          }, this);
        }
      });
    }

    var emptyThumbsDown = "fa fa-3x fa-thumbs-o-down";
    var thumbsDown = "fa fa-3x fa-thumbs-down";
    var emptyThumbsUp = "fa fa-3x fa-thumbs-o-up";
    var thumbsUp = "fa fa-3x fa-thumbs-up";

    $scope.downRateCard = function (id) {
      var card = $scope.getCardById(id);

      // Also, if card is uprated, down rate
      if (card.thumbUpClass == thumbsUp) {
        $scope.upRateCard(id);
      }

      var rating = 0;

      // if card is already downrated, rate up
      if (card.thumbDownClass == thumbsDown) {
        rating = 1;
      } else {
        rating = -1;
      }

      var url = generateRatingsUrl(id, rating);
      if (card.thumbDownClass == emptyThumbsDown) {
        card.thumbDownClass = thumbsDown;
      }
      else if (card.thumbDownClass == thumbsDown) {
        card.thumbDownClass = emptyThumbsDown;
      }

      updateCards($scope.cards);

      $http.put(url).success(function (response) {
        console.log("rateCard: submitted rating to server");
      }).error(function (response) {
        console.log("rateCard: failed to submit rating to server. Will cache and retry later");
        updateRatings(id, rating);
      });;
    }

    $scope.upRateCard = function (id) {
      var card = $scope.getCardById(id);

      // Also, if card is downrated, up rate
      if (card.thumbDownClass == thumbsDown) {
        $scope.downRateCard(id);
      }

      var rating = 0;

      // if card is already rated highly, un-rate
      if (card.thumbUpClass == thumbsUp) {
        rating = -1; // downrate
      } else {
        rating = 1;
      }

      var url = generateRatingsUrl(id, rating);
      if (card.thumbUpClass == emptyThumbsUp) {
        card.thumbUpClass = thumbsUp;
      }
      else if (card.thumbUpClass == thumbsUp) {
        card.thumbUpClass = emptyThumbsUp;
      }
      updateCards($scope.cards);

      $http.put(url).success(function (response) {
        console.log("rateCard: submitted rating to server");
      }).error(function (response) {
        console.log("rateCard: failed to submit rating to server. Will cache and retry later");
        updateRatings(id, rating);
      });;
    }

    $scope.getCardById = function (contentId) {
      console.log("getCardsById: ID is " + contentId);
      var card = null;
      $scope.cards.forEach(function (possibleCard) {
        if (possibleCard.id == contentId) {
          console.log("getCardsById: Found card " + JSON.stringify(possibleCard));
          card = possibleCard;
        }

        console.log("getCardsById: No card found");
      });

      return card;
    }

    // Now everything is loaded, sync the cache up
    syncCacheWithServer($http, $scope);

    // Add some stub data
    $scope.getCardFromServer("84addf9c-649f-11e7-907b-a6006ad3dba0");

    // Load the saved cards
    $scope.loadCache();

    $scope.cardDestroyed = function (index) {
      $scope.cards.splice(index, 1);
    };
  })

  .controller('CardCtrl', function ($scope, $ionicSwipeCardDelegate) {
    $scope.doAnything = function () {
      var card = $ionicSwipeCardDelegate.getSwipeableCard($scope);
      card.swipe();
    };
  })