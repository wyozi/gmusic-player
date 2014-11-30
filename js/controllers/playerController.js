angular.module('gmusicPlayerApp')
    .controller('PlayerCtrl', ['$scope', 'GMusic', '$rootScope', function($scope, GMusic, $rootScope) {
        GMusic.on('loggedIn', function() {
            var lsid = localStorage.lastSongId;
            if (lsid != undefined) {
                GMusic.getSong(lsid, function(track) {
                    GMusic.getStreamUrl(lsid, function(url) {
                        $rootScope.$broadcast('audio:set', {
                            url: url,
                            info: track,

                            startAt: localStorage.lastSongTime || 0,
                            startPaused: true
                        });
                    });
                });
            }
        });
    }]);
