angular.module('gmusicPlayerApp')
    .controller('PlayerCtrl', ['$scope', 'GMusic', '$rootScope', function($scope, GMusic, $rootScope) {
        GMusic.on('loggedIn', function() {
            var lsid = localStorage.lastSongId;
            if (lsid != undefined) {
                Q.spread([GMusic.getSong(lsid), GMusic.getStreamUrl(lsid)], function(track, url) {
                    $rootScope.$broadcast('audio:set', {
                        url: url,
                        info: track,

                        // startAt doesn't work properly, so we'll just start from the beginning
                        //startAt: localStorage.lastSongTime || 0,

                        startPaused: true
                    });
                });
            }
        });
    }]);
