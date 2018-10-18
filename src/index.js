import L from 'leaflet';
import 'leaflet.markercluster';
import TransitFeedFetcher from '../lib/transit-land';

import countries from '../countries.json';
import feeds from '../feed_data.json';
import operators from '../operator_data.json';


var map = L.map('map_isochrone', {
    scrollWheelZoom: true
}).setView([30.90, 5.2], 3);

L.tileLayer('https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=f2488a35b11044e4844692095875c9ce', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var markers = L.markerClusterGroup();
map.addLayer(markers);

var gtfs_count = document.getElementById('gtfs_count');
var count = 0;

loadData();

async function loadData() {
    let country_index = new Map();
    let feed_index = new Map();

    let countryPromise = Promise.all(countries.map(async c => {
        country_index.set(c.alpha_2_code, { lat: c['latitude_average'], long: c['longitude_average'] });
    }));

    let feedPromise = Promise.all(feeds.map(async f => {
        feed_index.set(f.id, f.url);
    }));

    await Promise.all([countryPromise, feedPromise]);

    await Promise.all(operators.map(async op => {
        let geoData = country_index.get(op.country);
        let marker = L.marker([geoData.lat, geoData.long]);
        let opArea = op.zone && op.zone != null ? op.zone : '';
        let website = op.website && op.website != null ? op.website : '';
        let feedUrl = feed_index.get(op.id) ? feed_index.get(op.id) : '';

        marker.bindPopup('<div><strong>' + op.name + '</strong><br> Feed URL: <a href="' + feedUrl + '">' + feedUrl
            + '</a><br> Operation Area: ' + opArea + ' <br> Website: <a href="' + website + '">' + website + '</a></div>', { maxWidth: 600 });

        markers.addLayer(marker);
        count++;
        gtfs_count.innerHTML = count;
    }));

    document.getElementById('loading').style.display = 'none';
    console.log('Done!');
}

window.reloadData = async () => {
    console.log('reloading!!');
    document.getElementById('loading').style.display = 'block';
    markers.clearLayers();
    let country_index = new Map();
    let feed_index = new Map();
    count = 0;
    gtfs_count.innerHTML = count;


    await Promise.all(countries.map(async c => {
        country_index.set(c.alpha_2_code, { lat: c['latitude_average'], long: c['longitude_average'] });
    }));

    let gtfsFeeds = new TransitFeedFetcher('https://api.transit.land/api/v1/feeds', 'feeds');

    gtfsFeeds.on('data', data => {
        for (let i in data) {
            let feed = data[i];
            feed_index.set(feed['onestop_id'], feed['url']);
        }
    }).on('end', () => {
        let gtfsOps = new TransitFeedFetcher('https://api.transit.land/api/v1/operators.json?offset=0&per_page=10&sort_key=id&sort_order=asc', 'operators');

        gtfsOps.on('data', data => {
            for (let i in data) {
                let op = data[i];
                let geoData = country_index.get(op.country);
                let marker = L.marker([geoData.lat, geoData.long]);
                let opArea = op.metro && op.metro != null ? op.metro : '';
                let website = op.website && op.website != null ? op.website : '';
                let feedUrl = feed_index.get(op.represented_in_feed_onestop_ids[0]) ? feed_index.get(op.represented_in_feed_onestop_ids[0]) : '';

                marker.bindPopup('<div><strong>' + op.name + '</strong><br> Feed URL: <a href="' + feedUrl + '">' + feedUrl
                    + '</a><br> Operation Area: ' + opArea + ' <br> Website: <a href="' + website + '">' + website + '</a></div>', { maxWidth: 600 });

                markers.addLayer(marker);
                count++;
                gtfs_count.innerHTML = count;
            }
        }).on('end', () => {
            let now = new Date();
            document.getElementById('loading').style.display = 'none';
            document.getElementById('update').innerHTML = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();
            console.log('Done!');
        });
    });
}