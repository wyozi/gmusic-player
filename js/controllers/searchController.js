angular.module('gmusicPlayerApp')
    .controller('SearchCtrl', ['$scope', '$rootScope', '$location', 'GMusic', function($scope, $rootScope, $location, GMusic) {
        $scope.search = function() {
            var query = $scope.query;
            $location.path('/search/' + query);
        }

        $scope.$watch(function() {
            return $location.path();
        }, function() {
            var searchRegex = /\/search\/(.+)/;
            var match = $location.path().match(searchRegex);

            if (match) {
                var query = match[1];

                GMusic.search(query, function(results) {
                    var onlyTracks = results.filter(function(obj) {
                        return obj.type == "track";
                    }).map(function(obj) {
                        return obj.track;
                    });
                    $rootScope.$broadcast('musicquery:setresults', 'search "' + query + '"', onlyTracks);
                });
            }
        });
    }]);
