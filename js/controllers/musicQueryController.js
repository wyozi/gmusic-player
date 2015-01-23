var querystring = require('querystring');

angular.module('gmusicPlayerApp')
    .controller('MusicQueryCtrl', ['$scope', '$rootScope', 'GMusic', '$timeout', '$location', function($scope, $rootScope, GMusic, $timeout, $location) {
        $scope.openSongMenu = function(song, menu) {
            menu.append(new gui.MenuItem({
                label: 'Song ' + song.id,
                click: function() {
                    gui.Clipboard.get().set(song.id, 'text');
                    console.log("Original track object for " + song.id + ": ", song.origTrackObj);
                }
            }));

            $scope.$broadcast('addSongMenuItems', song, menu);
        }

        $scope.setCurrentSong = function(song, context) {
            GMusic.getStreamUrl(song.id).then(function(url) {
                $rootScope.$broadcast('audio:set', {
                    url: url,
                    info: song,

                    context: context //an array of songs. Eg the playlist or album the song was played from. Can be null
                });
            });
        }

        $scope.go = function(path) {
            $location.path(path);
        }

        $scope.getNextInPlaylist = function(delta, dontLoopThrough) {
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

                return context.songs[nextIndex];
            }
        }

        $scope.moveInPlaylist = function(delta, dontLoopThrough) {
            var nextSong = $scope.getNextInPlaylist(delta, dontLoopThrough);
            if (nextSong == undefined) {
                return;
            }

            GMusic.getStreamUrl(nextSong.id).then(function(url) {
                $rootScope.$broadcast('audio:set', {
                    url: url,
                    info: nextSong,
                    context: $rootScope.currentSong.context
                });
            });
        }

        /* This breaks streaming
        $rootScope.$on('audio:ending', function(event) {
            if ($scope.nextSongCached) return;
            $scope.nextSongCached = true;

            var nextSong = $scope.getNextInPlaylist(+1);
            console.debug("Audio ending; let's cache the next song in context");
            if (nextSong != undefined) {
                GMusic.getStreamUrl(nextSong.id).then(function(url) {
                    var url = "http://localhost:" + (MusicStreamServerPort || 8080) + "/?" + querystring.stringify({
                        songId: nextSong.id,
                        songUrl: new Buffer(url).toString('base64'),
                        cacheHint : true
                    });

                    $.get(url);
                });
            }
        });
        */

        $rootScope.$on('audio:next', function(event, triggeredByEndEvent, loopStateText) {
            $scope.moveInPlaylist(+1, triggeredByEndEvent && loopStateText != "all");
            $scope.nextSongCached = false;
        });
        $rootScope.$on('audio:prev', function() {
            $scope.moveInPlaylist(-1);
        });
    }]);
