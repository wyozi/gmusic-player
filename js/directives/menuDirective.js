
// Load node-webkit gui library
var gui = require('nw.gui');

angular.module("nw-menu-directive", [])
    .directive("nwMenu", function($parse) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                var menuFunc = $parse(attrs.nwMenu);
                element[0].addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    
                    var menu = new gui.Menu();

                    menuFunc(scope, {"$menu": menu});

                    menu.popup(e.x, e.y);
                });
            }
        }
    });
