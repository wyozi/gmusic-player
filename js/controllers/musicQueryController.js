angular.module('gmusicPlayerApp')
    .controller('MusicQueryCtrl', ['$scope', '$rootScope', 'GMusic', '$timeout', '$location', function($scope, $rootScope, GMusic, $timeout, $location) {
        $scope.queries = [];
        $scope.results = [];

        $rootScope.$on('musicquery:setresults', function(event, data) {
            $timeout(function() {
                $scope.queries = [data.query];
                $scope.results = data.songs;

                $scope.results.forEach(function(res) {
                    res.playlistRef = data;
                });

                $scope.$apply();

                $scope.$broadcast('music_query_updated');
            })
        });

        $scope.setCurrentSong = function(song) {
            GMusic.getStreamUrl(song.id, function(url) {
                $rootScope.$broadcast('audio:set', url, song);
            })
        }

        $scope.go = function(path) {
            $location.path(path);
        }

        $scope.openSongMenu = function(song, menu) {
            //menu.append(new gui.MenuItem({ label: 'Item A' }));
        }

        $scope.moveInPlaylist = function(delta, dontLoopThrough) {
            var song = $rootScope.currentSong;
            if (!song) {
                return;
            }

            var plref = song.playlistRef;
            if (!plref) {
                return;
            }

            var thisIndex = -1;
            for (var i = 0;i < plref.songs.length; i++) {
                if (plref.songs[i].id == song.id) {
                    thisIndex = i;
                    break;
                }
            }

            if (thisIndex != -1) {
                var nextIndex = (thisIndex+delta)%plref.songs.length;
                if (dontLoopThrough && nextIndex != (thisIndex+delta)) {
                    return;
                }

                var nextSong = plref.songs[nextIndex];

                GMusic.getStreamUrl(nextSong.id, function(url) {
                    $rootScope.$broadcast('audio:set', url, nextSong);
                })
            }
        }

        $rootScope.$on('audio:next', function(event, triggeredByEndEvent, loopStateText) {
            $scope.moveInPlaylist(+1, triggeredByEndEvent && loopStateText != "all");
        });
        $rootScope.$on('audio:prev', function() {
            $scope.moveInPlaylist(-1);
        });
    }]);
