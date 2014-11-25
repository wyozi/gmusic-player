
angular.module('gmusicPlayerApp')
    .controller('PlaylistsCtrl', ['$scope', '$rootScope', '$location', 'GMusic', function($scope, $rootScope, $location, GMusic) {
        $scope.playlists = [];

        $rootScope.$on('playlists:set', function(event, playlists) {
            $scope.playlists = playlists;

            $scope.$apply();
        })

        $scope.setPlaylistById = function(playlistId) {
            GMusic.getPlaylistSongs(playlistId, function(songs) {

                GMusic.getPlaylist(playlistId, function(pl) {
                    $rootScope.$broadcast('musicquery:setresults', 'playlist "' + (pl ? pl.name : playlistId) + '"', songs);
                });

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

        // TODO move albums and artists watches somewhere else

        $scope.$watch(function() {
            return $location.path();
        }, function() {
            var albumRegex = /\/albums\/([^ ]+)/;
            var match = $location.path().match(albumRegex);

            if (match) {
                GMusic.getAlbum(match[1], function(data) {
                    $rootScope.$broadcast('musicquery:setresults', 'album "' + data.name + '"', data.tracks);
                });
            }
        });

        $scope.$watch(function() {
            return $location.path();
        }, function() {
            var artistRegex = /\/artists\/([^ ]+)/;
            var match = $location.path().match(artistRegex);

            if (match) {
                GMusic.getArtist(match[1], function(data) {
                    $rootScope.$broadcast('musicquery:setresults', 'artist "' + data.name + '"', data.tracks);
                });
            }
        });

        /*$scope.$on('$locationChangeStart', function(event) {
            console.log("Location chagned: ", event);
        });*/
    }]);
