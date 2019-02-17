require('dotenv').config();
var fs = require('fs')
var _ = require('underscore')
var inqurer = require('inquirer')
var keys = require('./keys.js');
var axios = require('axios');
var moment = require('moment');
var Spotify = require('node-spotify-api');
var options = ['Cancel'];
var viewingLog = false;
var spotify = new Spotify(keys.spotify);
var log = {
    "songs": {},
    "concerts": {},
    "movies": {}
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
    viewingLog = false;
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
                userSearchTerm('What artist would you like to search for?', 'bandsintown');
                break;
            case 'IMDB':
                userSearchTerm('What movie would you like to search for?', 'IMDB');
                break;
            case 'Import':
                viewingLog = true;
                if (_.isEmpty(log.songs) && _.isEmpty(log.conserts) && _.isEmpty(log.movies)) {
                    console.log('Your log is empty, try adding something first!');
                    LIRI();
                } else {
                    viewLog();
                };
        };
    });
};



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
            if (query == '') {
                query = 'The Sign';
            }
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
                selectionList('Choose a song to add to your log', 'songs');
            });
            break;
        case 'bandsintown':
            axios({
                method: 'get',
                url: 'https://rest.bandsintown.com/artists/' + query + '/events?app_id=codingbootcamp&date=upcoming'
            }).then(res => {
                for (var i in res.data) {
                    cD = res.data[i];
                    var time = moment(cD.datetime).format("MM/DD/YY hh:mm:a");
                    options.push(cD.venue.city + ' @ ' + cD.venue.name + ' - ' + time + ' ' + cD.lineup[0]);
                };
                selectionList('Which concert would you like to save?', 'concerts');
            }).catch(error => {
                console.log(error);
            });
            break;
        case 'IMDB':
            axios({
                method: 'get',
                url: "https://www.omdbapi.com/?t=" + query + "&y=&plot=short&apikey=trilogy"
            }).then(res => {
                m = res.data;
                console.log(
                    'Title: ' + m.Title +
                    '\nYear: ' + m.Year +
                    '\nRT Rating: ' + m.Ratings[1].Value +
                    '\nCountry: ' + m.Country +
                    '\nLanguage: ' + m.Language +
                    '\nPlot: ' + m.Plot +
                    '\nActors: ' + m.Actors
                );
                if (viewingLog) {
                    leaveOrContinue();
                    return;
                }
                inqurer.prompt([{
                    type: 'confirm',
                    message: 'Would you like to add ' + query + ' to your log?',
                    name: 'movie',
                    default: false
                }]).then(add => {
                    if (add.movie) {
                        movieToSave = m.Title + ' - ' + m.Year;
                        saveData(movieToSave, 'movies');
                    } else {
                        leaveOrContinue();
                    }
                });
            });
    };
};

function selectionList(question, entryPoint) {
    inqurer.prompt([{
        type: 'list',
        message: question,
        choices: options,
        name: 'selectedToSave'
    }]).then(optionToSave => {
        if (optionToSave.selectedToSave == 'Cancel') {
            leaveOrContinue();
        } else {
            saveData(optionToSave.selectedToSave, entryPoint);
        }
    });
};

function saveData(dataToSave, entryPoint) {
    var res = stringFormater(dataToSave);
    if (log[entryPoint][res[0]]) {
        log[entryPoint][res[0]].push(" " + res[1]);
    } else {
        log[entryPoint][res[0]] = [];
        log[entryPoint][res[0]].push(" " + res[1]);
    };
    updateLog();
};

function viewLog() {
    options = ['Back'];
    for (var i in log) {
        if (_.isEmpty(log[i])) {
            console.log(i + ' is empty')
        } else {
            options.push(i.charAt(0).toUpperCase() + i.slice(1));
        };
    };
    inqurer.prompt([{
        type: 'list',
        choices: options,
        message: 'Select an entry view, or back.',
        name: 'selection'
    }]).then(view => {
        options = ['Back'];
        view = view.selection.charAt(0).toLowerCase() + view.selection.slice(1);
        if (view == 'back') {
            LIRI();
        } else {
            for (var i in log[view]) {
                options.push(i + ' - ' + log[view][i]);
            };
            inqurer.prompt([{
                type: 'list',
                choices: options,
                message: 'Select an entry to view, or back.',
                name: 'selection'
            }]).then(item => {
                if (item.selection == 'Back') {
                    viewLog();
                } else {
                    itemHandler(view, stringFormater(item.selection));
                }
            });
        };
    });
};


function itemHandler(parentIndex, item) {
    options = ['Back'];
    switch (parentIndex) {
        case 'movies':
            inqurer.prompt([{
                type: 'list',
                message: 'What would you like to do with ' + item[0],
                choices: ['Back', 'View Movie details', 'Remove Movie'],
                name: 'toDo'
            }]).then(job => {
                switch (job.toDo) {
                    case 'Back':
                        viewLog();
                        break;
                    case 'View Movie details':
                        queryMachine(item[0], 'IMDB');
                        break;
                    case 'Remove Movie':
                        delete log[parentIndex][item[0]];
                        updateLog();
                        console.log(item[0] + ' deleted.');
                };
            });
            break;
        case 'songs':
            viewSongs(parentIndex, item);
            break;
        case 'concerts':
            inqurer.prompt([{
                type: 'confirm',
                message: 'Would you like to delete: ' + item[0],
                name: 'concert',
                default: false
            }]).then(deleteThis => {
                if (deleteThis.concert) {
                    itemLocation = log[parentIndex][item[0]];
                    indexOfDeleteItem = _.indexOf(itemLocation, ' ' + item[0]);
                    itemLocation.splice([indexOfDeleteItem], 1);
                    if (itemLocation.length == 0) {
                        delete log[parentIndex][item[0]];
                    };
                    updateLog();
                } else {
                    viewLog();
                }
            });
            break;

    };

}

function viewSongs(parentIndex, item) {
    options.push('Search for more songs by this artist');
    for (var i in item[1]) {
        options.push(item[1][i].trim());
    }
    inqurer.prompt([{
        type: 'list',
        message: 'Select a saved song by ' + item[0] + ' to continue',
        choices: options,
        name: 'song'
    }]).then(chosen => {
        if (chosen.song == 'Search for more songs by this artist') {
            options = ['Cancel'];
            queryMachine(item[0], 'spotify-search')
        } else if (chosen.song == 'Back') {
            viewLog();
        } else {
            inqurer.prompt([{
                type: 'confirm',
                message: 'Would you like to delete ' + chosen.song + '?',
                name: 'song',
                default: false
            }]).then(deleteThis => {
                if (deleteThis.song) {
                    itemLocation = log[parentIndex][item[0]];
                    indexOfDeleteItem = _.indexOf(itemLocation, ' ' + chosen.song);
                    itemLocation.splice([indexOfDeleteItem], 1);
                    if (itemLocation.length == 0) {
                        delete log[parentIndex][item[0]];
                    };
                    updateLog();
                } else {
                    options = ['Back'];
                    viewSongs(parentIndex, item);
                }
            })
        }
    })
}

function updateLog() {
    fs.writeFile('log.txt', JSON.stringify(log), (err) => {
        if (err) throw err;
    });
}

function stringFormater(str) {
    var str = str.split('-');
    str[0] = str[0].trim();
    str[1] = str[1].trim();
    str[1] = str[1].split(',')
    return str;
}

function addWatch() {
    fs.watchFile('log.txt', (err) => {
        console.log('log.txt has been updated');
        leaveOrContinue();
    });
}

function leaveOrContinue() {
    inqurer.prompt([{
        type: 'confirm',
        message: 'Would you like to do something else?',
        name: 'continue',
        default: true
    }]).then(doWe => {
        if (doWe.continue) {
            options = ['Cancel'];
            LIRI();
        } else {
            process.exit();
        };
    });

}