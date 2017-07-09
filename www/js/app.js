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

          console.log("Location Manager enabled. Will begin ranging for beacons");
          var delegate = new window.cordova.plugins.locationManager.Delegate();

          delegate.didDetermineStateForRegion = function (pluginResult) {
            // if we are inside the beacon region, go grab content
            if (pluginResult.state && pluginResult.state === "CLRegionStateInside") {
              console.log("Inside region for beacon: " + pluginResult.region.uuid);
              //$scope.getCardFromServer(pluginResult.region.uuid);
            }

            console.log('didDetermineStateForRegion: ' + JSON.stringify(pluginResult));
          };

          // delegate.didExitRegion = function (pluginResult) {
          //   console.log('didExitRegion: ' + JSON.stringify(pluginResult));
          // };

          // delegate.didEnterRegion = function (pluginResult) {
          //   console.log('didEnterRegion: ' + JSON.stringify(pluginResult));
          // };

          delegate.didStartMonitoringForRegion = function (pluginResult) {
            console.log('didStartMonitoringForRegion: ' + JSON.stringify(pluginResult));
          };

          cordova.plugins.locationManager.setDelegate(delegate);

          // Get beacons from the server
          console.log("Requesting beacons from server");
          var url = "http://nearbycontentapi.azurewebsites.net/api/Beacon";
          $http.get(url).success(function (response) {
            console.log("Response recieved from server");
            console.log(JSON.stringify(response));
            response.forEach(function (element) {
              console.log("Registering beacon " + element.uuid);
              var id = element.beaconId;
              console.log("12");
              var uuid = element.uuid;
              console.log("123");
              try {
                var region = new cordova.plugins.locationManager.BeaconRegion(id, uuid);
              }
              catch (ex) {
                console.log("An error occured while creating a beacon region: " + JSON.stringify(ex));
                console.log("Error message:" + ex.message);
              }
              console.log("dsfhjkhk");
              console.log(region);
              console.log("Searching for beacons with region: " + JSON.stringify(region));

              cordova.plugins.locationManager.startMonitoringForRegion(region)
                .fail(console.error)
                .done();

              cordova.plugins.locationManager.startRangingBeaconsInRegion(region)
                .fail(console.error)
                .done();
            }, this);
          });
        }
      }

      if (window.StatusBar) {
        StatusBar.styleDefault();
      }
    });
  })

  .controller('CardsCtrl', function ($scope, $http) {
    $scope.cards = [];
    $scope.settingsClass = "invisible";
    $scope.messagesClass = "visible";
    $scope.groups = [];

    console.log("loading CardsCtrl");

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
      console.log("loadCache: Loading cache from save to UI");
      var cache = readCache();
      var cards = cache.card;
      for (cardIndex in cards) {
        $scope.displayCard(cards[cardIndex]);
      }

      console.log("loadCache: Cards loaded." + JSON.stringify($scope.cards));

      // Retrieve saved groups
      $scope.groups = cache.groups;
      console.log("loadCache: Groups loaded." + JSON.stringify(cache.groups));
      console.log("loadCache: UI variables populated from cache");
    }

    $scope.displayCard = function (card) {
      $scope.cards.unshift(angular.extend({}, card));
    }

    $scope.addCard = function (contentId, content, name, requestDateTime, locationName) {
      console.log("addCard: New card to be added.")
      var card = { id: contentId, htmlContent: content, title: name, dateTime: requestDateTime, location: locationName, thumbUpClass: "fa fa-thumbs-o-up", thumbDownClass: "fa fa-thumbs-o-down" };
      console.log("addCard: New card values are " + JSON.stringify(card));

      console.log("addCard: Display card");
      $scope.displayCard(card);

      console.log("Saving a new card to device");

      // Cards are added to array and storage now
      updateCards($scope.cards);
    }

    $scope.getCardFromServer = function (beaconId) {
      console.log("getCardFromServer: Attempting to retrieve content for beacon UUID: " + beaconId);

      var url = generateGetContentUrl(beaconId);
      $http.get(url).success(function (response) {
        console.log("getCardFromServer: Response recieved from server")
        console.log(response);
        console.log("getCardFromServer: Response is " + JSON.stringify(response));
        if (response != "") {
          response.forEach(function (element) {
            console.log("getCardFromServer: Parsing a response");
            console.log("getCardFromServer: Response has description: " + element.contentShortDescription);
            $scope.addCard(element.id, element.content, element.contentShortDescription, element.RequestDateTime, element.locationName);
          }, this);
        }
      });
    }

    var emptyThumbsDown = "fa fa-2x fa-thumbs-o-down";
    var thumbsDown = "fa fa-2x fa-thumbs-down";
    var emptyThumbsUp = "fa fa-2x fa-thumbs-o-up";
    var thumbsUp = "fa fa-2x fa-thumbs-up";

    $scope.downRateCard = function (id) {
      console.log("rateCard: up rate content " + id);

      var card = $scope.getCardById(id);
      console.log("rateCard: card found: " + JSON.stringify(card));

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

      console.log("rateCard: card " + id + " given rating " + rating);

      var url = generateRatingsUrl(id, rating);
      if (card.thumbDownClass == emptyThumbsDown) {
        card.thumbDownClass = thumbsDown;
      }
      else if (card.thumbDownClass == thumbsDown) {
        card.thumbDownClass = emptyThumbsDown;
      }

      updateCards($scope.cards);

      console.log("rateCard: Sending rating to API on URL '" + url + "'");

      $http.put(url).success(function (response) {
        console.log("rateCard: submitted rating to server");
      }).error(function (response) {
        console.log("rateCard: failed to submit rating to server. Will cache and retry later");
        updateRatings(id, rating);
      });;
    }

    $scope.upRateCard = function (id) {
      console.log("rateCard: up rate content " + id);

      var card = $scope.getCardById(id);
      console.log("rateCard: card found: " + JSON.stringify(card));

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

      console.log("rateCard: card " + id + " given rating " + rating);

      var url = generateRatingsUrl(id, rating);
      console.log("rateCard: Sending rating to API on URL '" + url + "'");

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
    // $scope.getCardFromServer("74278bda-b6444520-8f0c720e-af059935");

    // Load the saved cards
    $scope.loadCache();

    $scope.cardDestroyed = function (index) {
      $scope.cards.splice(index, 1);
    };

    console.log("CardsCntrl loaded");
  })

  .controller('CardCtrl', function ($scope, $ionicSwipeCardDelegate) {
    $scope.doAnything = function () {
      var card = $ionicSwipeCardDelegate.getSwipeableCard($scope);
      card.swipe();
    };
  })