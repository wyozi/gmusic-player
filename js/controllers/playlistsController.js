
angular.module('gmusicPlayerApp')
    .controller('PlaylistsCtrl', ['$scope', '$rootScope', '$location', 'GMusic', function($scope, $rootScope, $location, GMusic) {
        $scope.playlists = [];

        $rootScope.$on('playlists:set', function(event, playlists) {
            $scope.playlists = playlists;
            
            $scope.$apply();
        })

        $scope.setPlaylistById = function(playlistId) {
            GMusic.fetchPlaylistSongs(playlistId, function(songs) {
                $rootScope.$broadcast('musicquery:setresults', 'playlist "' + playlistId + '"', songs);
            });
        }
        $scope.setPlaylist = function(playlist) {
            $scope.setPlaylistById(playlist.id);
        }

        $scope.$watch(function() {
            return $location.path();
        }, function() {
            var playlistRegex = /\/playlists\/([^ ]+)/;
            var match = $location.path().match(playlistRegex);

            if (match) {
                $scope.setPlaylistById(match[1]);
            }
        });

        /*$scope.$on('$locationChangeStart', function(event) {
            console.log("Location chagned: ", event);
        });*/
    }]);
