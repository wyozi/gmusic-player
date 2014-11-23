
angular.module('gmusicPlayerApp')
    .controller('MusicQueryCtrl', ['$scope', '$rootScope', 'GMusic', function($scope, $rootScope, GMusic) {
        $scope.query = "";
        $scope.results = [];

        $rootScope.$on('musicquery:setresults', function(event, query, results) {
            $scope.query = query;
            $scope.results = results;
        });

        $scope.setCurrentSong = function(song) {
            GMusic.getStreamUrl(song.id, function(url) {
                $rootScope.$broadcast('audio:set', url, song);
            })
        }
    }]);
