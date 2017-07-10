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

    var emptyThumbsDown = "fa fa-2x fa-thumbs-o-down";
    var thumbsDown = "fa fa-2x fa-thumbs-down";
    var emptyThumbsUp = "fa fa-2x fa-thumbs-o-up";
    var thumbsUp = "fa fa-2x fa-thumbs-up";

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
      $scope.messagesClass = "visible";

      // Close other tabs
      $scope.settingsClass = "invisible";
    }

    $scope.openSettings = function () {
      $scope.settingsClass = "visible";

      // Close other tabs
      $scope.messagesClass = "invisible";
    }

    $scope.loadCache = function () {
      var cache = readCache();
      this.addCards(cache.cards);
      $scope.groups = cache.groups;
    }

    $scope.displayCard = function (card) {
      $scope.cards.unshift(angular.extend({}, card));
    }

    $scope.notify = function (notification) {
      console.log(notification);
    }

    $scope.addCards = function (newCards) {
      // Check if we already have this content, and if we should update it.
      var cache = readCache();
      newCards.forEach(function (newCard) {
        var card = null;
        cache.cards.forEach(function (existingCard) {
          if (existingCard.id === newCard.id) {
            card = newCard;
          }
        });

        if (card != null) {
          // As the card already exists, it may be on the UI already
          var displayedCard = $scope.getCardById(card.id);
          if (displayedCard) {
            // If it is different to the UI version, update it and send a notification if it has changed (Otherwise do nothing)
            if (displayedCard.htmlContent != card.htmlContent) {
              $scope.notify(card.title);

              displayedCard.htmlContent = card.htmlContent;
            }
          }
          else {
            // Card not yet on UI, so just reload it (NO notification, as the user will have already been notified)
            $scope.displayCard(newCard);
          }
        }
        else {
          $scope.notify(newCard.title);
          $scope.displayCard(newCard);
        }
      });

      updateCards($scope.cards);
    }

    $scope.getCardFromServer = function (beaconId) {
      var url = generateGetContentUrl(beaconId);

      $http.get(url).success(function (response) {
        if (response != "") {
          var cards = [];
          response.forEach(function (content) {
            // check if user is subscribed to any of the tags, otherwise skip
            var displayCard = false;
            content.tags.forEach(function (subscribedTag) {
              $scope.groups.forEach(function (messageTag) {
                if (messageTag.name === subscribedTag) {
                  displayCard = true;
                }
              });
            });

            if (displayCard) {
              cards.push({
                id: content.id,
                htmlContent:
                content.content,
                title: content.contentShortDescription,
                dateTime: content.requestDateTime,
                location: content.location,
                tags: content.tags,
                thumbUpClass: emptyThumbsUp,
                thumbDownClass: emptyThumbsDown
              })
            }
          });

          $scope.addCards(cards);
        }
      });
    }

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

      $http.put(url).success(function (response) {
        console.log("rateCard: submitted rating to server");
      }).error(function (response) {
        console.log("rateCard: failed to submit rating to server. Will cache and retry later");
        updateRatings(id, rating);
      });;
    }

    $scope.upRateCard = function (id) {
      console.log("up");

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

      $http.put(url).success(function (response) {
      }).error(function (response) {
        updateRatings(id, rating);
      });;
    }

    $scope.getCardById = function (contentId) {
      var card = null;
      $scope.cards.forEach(function (possibleCard) {
        if (possibleCard.id == contentId) {
          card = possibleCard;
        }
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