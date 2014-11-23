
angular.module('gmusicPlayerApp')
    .controller('PlaylistsCtrl', ['$scope', '$rootScope', 'GMusic', function($scope, $rootScope, GMusic) {
        $scope.playlists = [];

        $rootScope.$on('playlists:set', function(event, playlists) {
            $scope.playlists = playlists;
        })

        $scope.setPlaylist = function(playlist) {
            GMusic.fetchPlaylistSongs(playlist.id, function(songs) {
                $rootScope.$broadcast('musicquery:setresults', 'songs from playlist "' + playlist.name + '"', songs);
            });
        }

        /*$scope.$on('$locationChangeStart', function(event) {
            console.log("Location chagned: ", event);
        });*/
    }]);
