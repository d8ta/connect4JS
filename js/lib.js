lib = window.lib || {};

lib.log = function(text) {
    $('#output')[0].innerHTML += text + '<br/>';
};