
angular.module('gmusicPlayerApp')
    .controller('PlaylistsCtrl', ['$scope', '$rootScope', '$location', 'GMusic', function($scope, $rootScope, $location, GMusic) {
        $scope.playlists = [];

        $rootScope.$on('playlists:set', function(event, playlists) {
            $scope.playlists = playlists;

            $scope.$apply();
        })

        $scope.setPlaylistById = function(playlistId) {
            $location.path('/playlists/' + playlistId);
        }
        $scope.setPlaylist = function(playlist) {
            $scope.setPlaylistById(playlist.id);
        }

        $scope.songDropped = function(data, playlist) {
            GMusic.addSongToPlaylist(data, playlist.id);
        }

        /*$scope.$on('$locationChangeStart', function(event) {
            console.log("Location chagned: ", event);
        });*/
    }]);
