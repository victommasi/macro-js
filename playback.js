const r = require('robotjs');
const fs = require('fs');

const buttons = ["", "left", "right"];

// TODO USER CONFIGURABLE 
var maxPlayback = -1; // Loop quantity (-1 for infinite) 
const oneMinute = 60 * 1000;
const oneHour = 60 * oneMinute;

// TIME LOOP CONFIGURATION
var timeBetweenPlayback = 1 * oneHour;

// globals
var playbackCount = 1;
var markings = {};
var macroName;
var inputCommands = [];
var flags = [];

async function handleClick(command) {
    var mousePos = r.getMousePos();
    r.moveMouse(command['x'], command['y']);
    setTimeout(() => {
        r.mouseClick(buttons[command['button']]);
        // r.moveMouse(mousePos['x'], mousePos['y']);
    }, 40);
}

var commands = {
    "note": async (command) => {
        // do nothing
    },
    "debug": async (command) => {
        console.log(command.note);
    },
    "jump": async (command) => {
        runCommands(markings[command.jumpName]);
    },
    "flagJump": async (command) => {
        if (flags.indexOf(command.flagName) != -1) {
            runCommands(markings[command.jumpName.toLowerCase()]);
        }
    },
    "wait": async (command) => {
        // todo breaks if for less than mid double digits ms
        process.stdout.write("|");
        for (var i = 0; i < 50; i++) {
            setTimeout(() => process.stdout.write("-"), command.ms / 50 * i);
        }
        setTimeout(() => { console.log("|"); }, command.ms);
        return new Promise(resolve => setTimeout(resolve, command.ms));
    },
    "mouseclick": handleClick,
    "mouseup": handleClick,
    "movemouse": async (command) => { r.moveMouse(command['x'], command['y']); },
    // "keydown": async (command) => { r.keyToggle(keycode(command.rawcode), "down"); },
    // "keyup": async (command) => { r.keyToggle(keycode(command.rawcode), "up"); }
};


// This will go until it hits a wait. The wait will run the next runCommands() in a setTimeout, which will run all commands until the next wait.
// It's kind of like strtok
function runCommands(index) {
    var value = inputCommands[index];
    if (value != undefined && value['type'] != undefined) {
        console.log(value);
        var commandToRun = commands[value["type"]];
        if (commandToRun == undefined) {
            console.log("Warning: Invalid command type! Nothing ran.");
            runCommands(index + 1);
        } else {
            // array of commands to NOT automatically run the next command with. 
            // these commands automatically handle running the next command on their own.
            var blacklistedCommands = ['conditionalJump', "jump", "flagJump"];
            commandToRun(value).then(() => {
                // Somehow I want to take this out of here and put it into the functions themselves
                // However, I need this to work now so I'm going to fix it later(tm)
                if (blacklistedCommands.indexOf(value.type) == -1) {
                    runCommands(index + 1);
                }
            });
        }
    }
    else {
        playbackCount++;
        if (maxPlayback == -1 || playbackCount <= maxPlayback) {
            console.log("Waiting " + timeBetweenPlayback + "ms (will be iteration " + playbackCount + "/" + maxPlayback + ").");
            commands["wait"]({ "ms": timeBetweenPlayback }).then(() => runCommands(0));
        }
    }
}


(() => {
    // there are 50 -s
    console.log("Don't forget to disable flux if using image matching!");
    console.log("|--------------------------------------------------|");
    macroName = process.argv[2];
    if (process.argv[2] == undefined) {
        console.log("No macro name passed as an argument, using 'default'");
        macroName = "lor";
    }
    input = fs.readFileSync("playbackfiles/" + macroName + '/playbackfile.txt').toString().split("\n");
    for (var i = 3; i < process.argv.length; i++) {
        if (process.argv[i][0] == '-') {
            flags.push(process.argv[i].substr(1).toLowerCase());
        } else {
            flags.push(process.argv[i].toLowerCase());
        }
    }
    for (var i = 0; i < input.length; i++) {
        try {
            if (input[i] == '' || input[i] == '\r') { continue; } // Ignore blank lines
            var parsedInput = JSON.parse(input[i]);
            // handle marks
            if (parsedInput.type == "mark") {
                // assumption: all marks are succeeded by a command
                // because length = the index of the last item + 1, we don't have to add 1.
                markings[parsedInput.name] = inputCommands.length;
            }
            else {
                parsedInput["index"] = inputCommands.length;
                inputCommands[inputCommands.length] = parsedInput;
            }
        } catch (e) {
            console.log(e);
        }
    }
    runCommands(0);
})();