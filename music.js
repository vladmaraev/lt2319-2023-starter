// JavaScript
let isMicrophoneEnabled = false;
let recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition)();
recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

function toggleMicrophone() {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
        alert("Web Speech API is not supported by this browser.");
    } else {
        if (!isMicrophoneEnabled) {
            startRecognition();
        } else {
            stopRecognition();
        }
    }
}

function startRecognition() {
    recognition.onstart = function () {
        document.getElementById('status').innerHTML = "Microphone enabled";
    };

    recognition.onresult = function (event) {
        const result = event.results[event.results.length - 1][0].transcript;
        // Your recognition logic goes here
        console.log(result);
    };

    recognition.onend = function () {
        isMicrophoneEnabled = false;
        document.getElementById('status').innerHTML = "Microphone disabled";
    };
    recognition.start();
    isMicrophoneEnabled = true;
}

function stopRecognition() {
    if (isMicrophoneEnabled) {
        recognition.stop();
        document.getElementById('status').innerHTML = "Microphone disabled";
    }
}

    

    recognition.onresult = function (event) {
        const result = event.results[event.results.length - 1][0].transcript;
        const lofiPlayer = document.getElementById('lofi');
        const fadePlayer = document.getElementById('fade');
        const jazzPlayer = document.getElementById('jazz');
        const funkPlayer = document.getElementById('funk');
        console.log(result.toLowerCase())
        if (result.toLowerCase() === 'start lofi') {
            lofiPlayer.src += "&autoplay=1";
        } else if (result.toLowerCase() === 'stop lofi') {
            lofiPlayer.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        } else if (result.toLowerCase() === 'start fade') {
            fadePlayer.src += "&autoplay=1";
        } else if (result.toLowerCase() === 'stop fade') {
            fadePlayer.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        } else if (result.toLowerCase() === 'start jazz') {
            console.log("starting jazz")
            // playJazz()
            jazzPlayer.src += "&autoplay=1";
        } else if (result.toLowerCase() === 'stop jazz') {
            // stopJazz()
            jazzPlayer.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        } else if (result.toLowerCase() === 'start funk') {
            funkPlayer.src += "&autoplay=1";
        } else if (result.toLowerCase() === 'stop funk') {
            funkPlayer.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        }
        else if (result.toLowerCase() === 'reduce volume lofi') {
            lofiPlayer.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        } else if (result.toLowerCase() === 'increase volume lofi') {
            lofiPlayer.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        } else if (result.toLowerCase() === 'reduce volume fade') {
            fadePlayer.volume -= 0.1;
        } else if (result.toLowerCase() === 'reduce volume funk') {
            funkPlayer.volume -= 0.1;
        } else if (result.toLowerCase() === 'increase volume lofi') {
            lofiPlayer.volume += 0.1;
        }

    };





//   let lofiVolume = 50; // Initial volume level
//   let fadeVolume = 50; // Initial volume level
//   let jazzVolume = 50; // Initial volume level

//   function changeVolume(command) {
//     const lofiPlayer = document.getElementById('lofi');
//     const fadePlayer = document.getElementById('fade');
//     const jazzPlayer = document.getElementById('jazz');

//     if (command.toLowerCase() === 'louder') {
//       lofiVolume = Math.min(lofiVolume + 10, 100);
//       fadeVolume = Math.min(fadeVolume + 10, 100);
//       jazzVolume = Math.min(jazzVolume + 10, 100);
//     } else if (command.toLowerCase() === 'slower') {
//       lofiVolume = Math.max(lofiVolume - 10, 0);
//       fadeVolume = Math.max(fadeVolume - 10, 0);
//       jazzVolume = Math.max(jazzVolume - 10, 0);
//     }

//     lofiPlayer.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[' + lofiVolume + ']}', '*');
//     fadePlayer.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[' + fadeVolume + ']}', '*');
//     jazzPlayer.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[' + jazzVolume + ']}', '*');
//   }


var players = {};

        function onYouTubeIframeAPIReady() {
            players['lofi'] = new YT.Player('lofi');
            players['fade'] = new YT.Player('fade');
            players['jazz'] = new YT.Player('jazz');
            players['funk'] = new YT.Player('funk')
        }

// Jazz Player 
function playJazz() {
    for (var key in players) {
        if (key === 'jazz') {
            players[key].playVideo();
        } else {
            players[key].pauseVideo();
        }
    }
}
function stopJazz() {
    for (var key in players) {
        if (key === 'jazz') {
            players[key].pauseVideo();
        }
    }
}
function increasevolume(playername) {
    console.log('increasing volume', playername)
    players[playername].set
    players[playername].setVolume(players[playername].getVolume() + 10);
}
function decreasevolume(playername) {
    console.log('decreasing volume', playername)
    players[playername].setVolume(players[playername].getVolume() - 10);
}

// Lofi Player 
function playLofi() {
    for (var key in players) {
        if (key === 'lofi') {
            players[key].playVideo();
        } else {
            players[key].pauseVideo();
        }
    }
}
function stopLofi() {
    for (var key in players) {
        if (key === 'lofi') {
            players[key].pauseVideo();
        }
    }
}

// Fade Player
function playFade() {
    for (var key in players) {
        if (key === 'fade') {
            players[key].playVideo();
        } else {
            players[key].pauseVideo();
        }
    }
}

function stopFade() {
    for (var key in players) {
        if (key === 'fade') {
            players[key].pauseVideo();
        }
    }
}


// Funk Player
function playFunk() {
    for (var key in players) {
        if (key === 'funk') {
            players[key].playVideo();
        } else {
            players[key].pauseVideo();
        }
    }
}

function stopFunk() {
    for (var key in players) {
        if (key === 'funk') {
            players[key].pauseVideo();
        }
    }
}

