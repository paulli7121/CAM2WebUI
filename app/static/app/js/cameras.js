//Javascript code to display camera database on map
//Authors: Deeptanshu Malik, Juncheng Tang

//functions named updateMap_* are used to update the map based on form inputs from webpage
//functions named get* are used to query data from fusion tables
//function populate_dropdown is used to parse data from JSON object obtained by queries sent from get* functions
//--------------------------------------------------------------------------------------------------------------

//tableId - unique id of database fusions table
//locationColumn - column containing latitude information for camera
var tableId = "1XszW34wSZP2dW4tfBJxX_Tnvmvvqnumd31WMIlxg";
var locationColumn = "col1";

//Data is obtained from fusion tables by SQL queries
//These queries are sent using HTTP GET requests and a JSON object is returned by fusion tables
//Each query has 3 parts - a url head, the SQL query(encoded as a URL string) and the query tail
//The link below can be referred to understand this further
//https://stackoverflow.com/questions/21497573/fusion-tables-calling-the-api-from-a-browser-using-javascript-uncaught-typee/21511325#21511325

//Note: the callback function's name must be appended as a string to queryTail
//The callback function will be a method to parse the returned JSON object

var queryUrlHead = 'https://www.googleapis.com/fusiontables/v2/query?sql=';
var queryUrlTail = '&key=AIzaSyBAJ63zPG5FpAJV9KXBJ6Y1bLKkvzYmhAg&callback=';

//a global variable to track whether state or city data is to be queried from database fusiontable
var region = '';

//This function is called every time the cameras webpage is loaded
//It initializes a map, overlays a "layer" of data from fusiontables (camera markers) on the map
//and uses DOM properties to track user actions on the webpage
function initialize() {

    //the code below to initialize map and populate markers on map is obtained using the 'publish' tool from fusiontables
    google.maps.visualRefresh = true;

    var isMobile = (navigator.userAgent.toLowerCase().indexOf('android') > -1) ||
        (navigator.userAgent.match(/(iPod|iPhone|iPad|BlackBerry|Windows Phone|iemobile)/));
    if (isMobile) {
        var viewport = document.querySelector("meta[name=viewport]");
        viewport.setAttribute('content', 'initial-scale=1.0, user-scalable=no');
    }

    var mapDiv = document.getElementById('mapCanvas');

    var map = new google.maps.Map(mapDiv, {
        center: new google.maps.LatLng(40.363489, -98.832955),
        zoom: 4,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    layer = new google.maps.FusionTablesLayer({
        map: map,
        heatmap: {enabled: false},
        query: {
            select: locationColumn,
            from: tableId
        },
        options: {
            styleId: 2,
            templateId: 2
        }
    });

    //country, state and city are names for html select tags for the corresponding dropdown menus on html webpage
    //
    //layer - to update data layer from fusion tables according to user requests

    google.maps.event.addDomListener($("#country").on("change", function() {
            updateMap_Country(layer, map);
        }));

    google.maps.event.addDomListener($("#state").on("change", function() {
            updateMap_State(layer);
        }));

    google.maps.event.addDomListener($("#city").on("change", function() {
            updateMap_City(layer);
        }));

    if (isMobile) {
      var legend = document.getElementById('googft-legend');
      var legendOpenButton = document.getElementById('googft-legend-open');
      var legendCloseButton = document.getElementById('googft-legend-close');
      legend.style.display = 'none';
      legendOpenButton.style.display = 'block';
      legendCloseButton.style.display = 'block';
      legendOpenButton.onclick = function() {
        legend.style.display = 'block';
        legendOpenButton.style.display = 'none';
      }
      legendCloseButton.onclick = function() {
        legend.style.display = 'none';
        legendOpenButton.style.display = 'block';
      }
    }

    google.maps.event.addDomListener(window, 'load', initialize);
  }

function updateMap_Country(layer, map) {

    //intialise state and city drop down menus to NULL values when no country is selected
    document.getElementById('state').innerHTML = '<option value="" selected="selected"> - All - <\/option>';
    document.getElementById('city').innerHTML = '<option value="" selected="selected"> - All - <\/option>';

    var selected = document.getElementById('country');
    var country = selected.value;
    var country_name = selected.options[selected.selectedIndex].text;

    //if an option other than All is selected from the country dropdown menu then
    //recenter map and zoom in on selected country
    //to do so send a geocoding request - as explained below
    //https://developers.google.com/maps/documentation/javascript/examples/geocoding-simple?csw=1
    if(selected.selectedIndex > 0) {
        var geocoder = new google.maps.Geocoder();
        geocoder.geocode( {'address' : country_name}, function(results, status) {
            while (status != google.maps.GeocoderStatus.OK) {}
            map.setCenter(results[0].geometry.location);
            map.fitBounds(results[0].geometry.viewport);
        });
        
        layer.setOptions({
            query: {
                select: locationColumn,
                from: tableId,
                where: "col5 = '" + country + "'"
            }
        });
    }
    else{
        map.setCenter(new google.maps.LatLng(40.363489, -98.832955));
        map.setZoom(2);
        layer.setOptions({
            query: {
                select: locationColumn,
                from: tableId
            }
        });
    }

    //if a country has been selected from the dropdown menu then
    //query database for camera data in its states and city data
    if(country) {
        getStateNames(country);
    }
}

function updateMap_State(layer) {
    var state = $("#state").select2('val');
    var s = '(';
    for (var i = state.length - 1; i > 0; i--) {
        s += "'" + state[i] + "'" + ','
    }
    s += "'" + state[0] + "'" + ')'

    if(state && state != "NULL") {
        layer.setOptions({
            query: {
                select: locationColumn,
                from: tableId,
                where: "col4 IN " + s
            }
        });
        getCityNames();
    }
    else{
        document.getElementById('city').innerHTML = '<option value="" selected="selected"> - All - <\/option>';
        layer.setOptions({
            query: {
                select: locationColumn,
                from: tableId,
                where: "col5 = '" + document.getElementById('country').value + "'"
            }
        });
    }

}

function updateMap_City(layer) {
    var city = $("#city").select2('val');
    //console.log(city);
    var state = $("#state").select2('val');
    var s = '(';
    for (var i = state.length - 1; i > 0; i--) {
        s += "'" + state[i] + "'" + ','
    }
    s += "'" + state[0] + "'" + ')'

    var country = document.getElementById('country').value;

    if (city) {
        var t = '(';
        for (var i = city.length - 1; i > 0; i--) {
            t += "'" + city[i] + "'" + ','
        }
        t += "'" + city[0] + "'" + ')'

        if (t != "('')" && t != "('undefined')") {
            if (state) {
                layer.setOptions({
                    query: {
                        select: locationColumn,
                        from: tableId,
                        where: "col4 IN " + s + " AND  " + "col3 IN " + t
                    }
                });
            }
            else {
                layer.setOptions({
                    query: {
                        select: locationColumn,
                        from: tableId,
                        where: "col5 = '" + country + "' AND  " + "col3 IN " + t
                    }
                });
            }
        }
        else if (state) {
            layer.setOptions({
                query: {
                    select: locationColumn,
                    from: tableId,
                    where: "col4 = '" + state + "'"
                }
                });
            }
        else{
            layer.setOptions({
                query: {
                    select: locationColumn,
                    from: tableId,
                    where: "col5 = '" + country + "'"
                }
            });
        }
    }

    else{
        layer.setOptions({
            query: {
                select: locationColumn,
                from: tableId,
                where: "col5 = '" + country + "'"
            }
        });
    }
}




function getCityNames() {
    document.getElementById('city').isDisabled = false;
    region = 'city';
    var query = new google.visualization.Query(queryUrlHead + get_querytext('City') + queryUrlTail + "populate_dropdown");
    query.send();
}

function getStateNames(country) {
    // set the query using the parameters
    if(country != "USA"){// && country != "CA")
        console.log("country != USA && country != CA");
        document.getElementById('state').isDisabled = true;
        getCityNames();
    }
    else {
        document.getElementById('state').isDisabled = false;
        document.getElementById('city').isDisabled = true;
        region = 'state';
        var FT_Query_StateName = "SELECT 'State' " +
            "FROM " + tableId;
        var country = document.getElementById('country').value;
        if (country) {
            FT_Query_StateName += " WHERE 'Nation' = '" + country + "' ";
        }
        FT_Query_StateName += " group by 'State'";

        var queryText = encodeURIComponent(FT_Query_StateName);
        var query = new google.visualization.Query(queryUrlHead + queryText + queryUrlTail + "populate_dropdown");

        //set the callback function
        query.send();
    }
}

function get_querytext(data){
    // set the query using the parameters
    var FT_Query = "SELECT '" + data + "' " +
        "FROM " + tableId;
    var state = $("#state").select2('val');
    var s = '(';
    for (var i = state.length - 1; i > 0; i--) {
        s += "'" + state[i] + "'" + ','
    }
    s += "'" + state[0] + "'" + ')'

    var country = document.getElementById('country').value;
    if(state){
        FT_Query += " WHERE 'State' IN " + s;
        console.log(FT_Query);
    }
    else if (country) {
        FT_Query += " WHERE 'Nation' = '" + country + "' ";
    }
    FT_Query += " group by '" + data + "'";

    return encodeURIComponent(FT_Query);
}

function populate_dropdown(response) {
    if (!response.rows) {
        return;
    }

    numRows = response.rows.length;

    var Names = {};
    for (var i = 0; i < numRows; i++) {
        var name = response.rows[i][0];
        Names[name] = name;
    }

    var dropdown_list = "<select name='data_select' onchange='handleSelected(this)'>"
    dropdown_list += '<option value="" selected="selected"> - All - <\/option>';
    for (name in Names) {
        dropdown_list += "<option value='"+name+"'>"+name+"</option>"
    }
    dropdown_list += "</select>"
    //alert(region);
    document.getElementById(region).innerHTML = dropdown_list;
}