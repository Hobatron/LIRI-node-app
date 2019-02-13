require('dotenv').config();
var fs = require('fs')
var inqurer = require('inquirer')
var keys = require('./keys.js');
var axios = require('axios');
var moment = require('moment');
var Spotify = require('node-spotify-api');
var options = [];
var spotify = new Spotify(keys.spotify);
var log = {
    "songs": {},
    "concerts": {},
    "movies": []
};

fs.readFile('log.txt', 'utf8', (err, data) => {
    if (err) {
        console.log('log.txt does not exist. Created new default.');
        fs.writeFile('log.txt', JSON.stringify(log), err => {});
        setTimeout(function () {
            addWatch();
        }, 200);
        LIRI();
    } else {
        log = JSON.parse(data);
        addWatch()
        LIRI();
    };
});

function LIRI() {
    inqurer.prompt([{
        type: 'list',
        message: 'What would you like to use?',
        choices: ['Spotify', 'Concert', 'IMDB', 'Import'],
        name: 'choice'
    }]).then(input => {
        switch (input.choice) {
            case 'Spotify':
                userSearchTerm('What song would you like to search for?', 'spotify-search');
                break;
            case 'Concert':
                userSearchTerm('What artist would you like to search for?', 'bandsintown')
                break;
            case 'IMDB':

                break;
            case 'Import':
        };
    });


    function userSearchTerm(question, qType) {
        inqurer.prompt([{
            message: question,
            name: 'query'
        }]).then(input => {
            queryMachine(input.query, qType);
        });
    };

    function queryMachine(query, qType) {
        switch (qType) {
            case 'spotify-search':
                spotify.search({
                    type: 'track',
                    query: query
                }, function (err, data) {
                    if (err) throw err;
                    songDetails = data.tracks.items;
                    for (var i in songDetails) {
                        options.push(songDetails[i].artists[0].name + ' - ' + songDetails[i].name);
                    };
                    options = Array.from(new Set(options));
                    saveSelection('Choose a song to add to your log', 'songs');
                });
                break;
            case 'bandsintown':
                axios({
                        method: 'get',
                        url: 'https://rest.bandsintown.com/artists/' + query + '/events?app_id=codingbootcamp&date=upcoming'
                    })
                    .then(response => {
                        for (var i in response.data) {
                            cD = response.data[i];
                            var time = moment(response.data[i].datetime).format("MM/DD/YY hh:mm:a");
                            options.push(cD.venue.city + ' @ ' + cD.venue.name + ' - ' + time);
                        };
                        saveSelection('Which concert would you like to save?', 'concerts');
                    })
                    .catch(error => {
                        console.log(error);
                    });
                break;


        };
    };

    function saveSelection(question, entryPoint) {
        inqurer.prompt([{
            type: 'list',
            message: question,
            choices: options,
            name: 'selectedToSave'
        }]).then(optionToSave => {

            var res = optionToSave.selectedToSave.split('-');
            res[0] = res[0].trim();
            res[1] = res[1].trim();
            if (log[entryPoint][res[0]]) {
                log[entryPoint][res[0]].push(res[1]);
            } else {
                log[entryPoint][res[0]] = [];
                log[entryPoint][res[0]].push(res[1]);
            }

            fs.writeFile('log.txt', JSON.stringify(log), (err) => {
                if (err) throw err;
            });
        });

    };
};

function addWatch() {
    fs.watchFile('log.txt', (err) => {
        console.log('log.txt has been updated');
        inqurer.prompt([{
            type: 'confirm',
            message: 'Would you like to add something else?',
            name: 'continue',
            default: false
        }]).then(doWe => {
            if (doWe.continue) {
                options = [];
                LIRI();
            } else {
                process.exit();
            };
        });
    });

}