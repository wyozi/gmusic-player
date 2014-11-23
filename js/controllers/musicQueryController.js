
angular.module('gmusicPlayerApp')
    .controller('MusicQueryCtrl', ['$scope', '$rootScope', 'GMusic', function($scope, $rootScope, GMusic) {
        $scope.queries = [];
        $scope.results = [];

        $rootScope.$on('musicquery:setresults', function(event, query, results, shouldAppend) {
            if (!shouldAppend) {
                $scope.queries = [];
                $scope.results = [];
            }
            $scope.queries.push(query);
            $scope.results = $scope.results.concat(results);

            var playlistRef = $scope.results.copy();
            $scope.results.forEach(function(res) {
                res.playlistRef = playlistRef;
            })
        });

        $scope.setCurrentSong = function(song) {
            GMusic.getStreamUrl(song.id, function(url) {
                $rootScope.$broadcast('audio:set', url, song);
            })
        }
    }]);
