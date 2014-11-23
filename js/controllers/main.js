angular.module('gmusicPlayerApp')
    .controller('MainCtrl', ['$scope', 'GMusic', '$rootScope', function($scope, GMusic, $rootScope) {
        GMusic.login(function() {
            console.log("Succesful login to gmusic");

            // Fetch playlists
            GMusic.fetchPlaylists(function(playlists) {
                $rootScope.$broadcast('playlists:set', playlists.map(function(pl) {
                    return {name: pl.name, id: pl.id};
                }))
            });
        });
    }]);
