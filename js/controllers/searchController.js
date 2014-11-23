angular.module('gmusicPlayerApp')
    .controller('SearchCtrl', ['$scope', '$rootScope', 'GMusic', function($scope, $rootScope, GMusic) {
        $scope.search = function() {
            var query = $scope.query;

            GMusic.search(query, function(results) {
                var onlyTracks = results.filter(function(obj) {
                    return obj.type == "track";
                }).map(function(obj) {
                    return obj.track;
                });
                $rootScope.$broadcast('musicquery:setresults', 'search "' + query + '"', onlyTracks);
            });
        }
    }]);
