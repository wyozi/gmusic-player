angular.module('gmusicPlayerApp')
    .controller('MusicQueryCtrl', ['$scope', '$rootScope', 'GMusic', '$timeout', '$location', function($scope, $rootScope, GMusic, $timeout, $location) {
        $scope.setCurrentSong = function(song, context) {
            GMusic.getStreamUrl(song.id, function(url) {
                $rootScope.$broadcast('audio:set', {
                    url: url,
                    info: song,

                    context: context //an array of songs. Eg the playlist or album the song was played from. Can be null
                });
            })
        }

        $scope.go = function(path) {
            $location.path(path);
        }

        $scope.moveInPlaylist = function(delta, dontLoopThrough) {
            var song = $rootScope.currentSong;
            if (!song) {
                return;
            }

            var context = song.context;
            if (!context) {
                return;
            }

            var thisIndex = -1;
            for (var i = 0;i < context.songs.length; i++) {
                if (context.songs[i].id == song.info.id) {
                    thisIndex = i;
                    break;
                }
            }

            if (thisIndex != -1) {
                var nextIndex = (thisIndex+delta)%context.songs.length;
                if (dontLoopThrough && nextIndex != (thisIndex+delta)) {
                    return;
                }

                var nextSong = context.songs[nextIndex];

                GMusic.getStreamUrl(nextSong.id, function(url) {
                    $rootScope.$broadcast('audio:set', {
                        url: url,
                        info: nextSong,
                        context: context
                    });
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
