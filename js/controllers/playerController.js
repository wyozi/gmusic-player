angular.module('gmusicPlayerApp')
    .controller('PlayerCtrl', ['$scope', 'GMusic', '$rootScope', function($scope, GMusic, $rootScope) {
        // Fetch playlists
        GMusic.getPlaylists(function(playlists) {
            $rootScope.$broadcast('playlists:set', playlists.map(function(pl) {
                return {name: pl.name, id: pl.id};
            }))
        });
    }]);
