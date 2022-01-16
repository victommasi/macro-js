const io = require('iohook');
const readline = require('readline-sync');
const fs = require('fs');
// const configFilename = "./record-config.txt";
const textColor = "\x1b[37m";
var dirtyData = false;
var recording = false;
var lastAction;
var macroName;
var pressedKeys = {};

// ctrl shift g
// todo hardcoded
var stopKeybind = [29, 42, 34];

// todo support more
var options = {
    "mouseup": true,
    "keydown": true,
    "keyup": true
    // wait: true (forced)
};

var mainMenu = {
    "Record now": () => {
        if (fs.existsSync("playbackfiles/" + macroName)) {
            fs.rmdirSync("playbackfiles/" + macroName, { recursive: true });
        }
        fs.mkdirSync("playbackfiles/" + macroName);
        fs.mkdirSync("playbackfiles/" + macroName + "/images");
        io.registerShortcut(stopKeybind, () => {
            io.stop();
            process.exit();
        });
        Object.keys(options).forEach(value => {
            if (options[value]) {
                io.on(value, data => {
                    if (!recording) return;
                    if (data.type == 'keydown') {
                        if (pressedKeys[data.rawcode] != undefined) return;
                        else pressedKeys[data.rawcode] = true;
                    }
                    if (data.type == 'keyup') {
                        delete pressedKeys[data.rawcode]
                    }
                    if (lastAction == undefined) {
                        lastAction = new Date();
                    }
                    else {
                        var newDate = new Date();
                        // Needs to be blocking so that actions don't start appearing out of order
                        var ms = (newDate - lastAction);
                        var waitObj = { type: "wait", ms: ms }
                        fs.appendFileSync("playbackfiles/" + macroName + '/playbackfile.txt', JSON.stringify(waitObj) + "\n");
                        console.log(waitObj);
                        // we don't use newDate in case it took a long time to write the file for some reason
                        lastAction = new Date();
                    }
                    console.log(data);
                    fs.appendFileSync("playbackfiles/" + macroName + '/playbackfile.txt', JSON.stringify(data) + "\n");
                })
            }
        });
        recording = true;
        io.start();
        console.clear()
        console.log("Use ctrl+shift+g to stop recording.");
    },
    "Quit": () => {
        console.log("You can also use ctrl+c any time (recordings will be saved if mid-record)");
        process.exit();
    }
}

function main() {
    // Make the text white (I like it more that way)
    console.log(textColor);

    macroName = process.argv[2];
    if (process.argv[2] == undefined) {
        printError("No macro name passed as an argument, using 'default'");
        macroName = "default";
    }
    if (!fs.existsSync("playbackfiles/")) fs.mkdirSync("playbackfiles/");
    var choice;
    while (choice != "Record now") {
        printLogo();
        if (dirtyData) {
            printError("The current config will apply for this session only, save it to disk to make it permanant.");
        }
        choice = printMenu(mainMenu);
        mainMenu[choice]();
    }
}

function printLogo() {
    printColor("--------------------");
    process.stdout.write("\x1b[35m");
    process.stdout.write(" MacroJS ");
    printColorLine("--------------------");
}

function printError(message) {
    console.log("\x1b[31m(!) " + textColor + message);
}

function printColor(message) {
    process.stdout.write("\x1b[36m");
    process.stdout.write(message);
    process.stdout.write(textColor);
}

function printColorLine(message) {
    printColor(message + "\n");
}

/* menu is an object that typically looks like this:
{
    "Option one": () => { // code to run when the user selects this option },
    "Option two": () => { // code to run when the user selects this option },
    ...
}
The keys can be any stringable object, and the values can be anything you want. This function does not consider the values, it just returns the user's selection
*/
function printMenu(menu) {
    while (1) {
        var keys = Object.keys(menu);
        for (var count = 0; count < keys.length; count++) {
            console.log(count + ": " + keys[count]);
        }
        printColor("Choose an option (0-" + (keys.length - 1) + "): ");
        var res = readline.questionInt();
        if (menu[keys[res]]) {
            return keys[res];
        }
        printError("Invalid option.");
    }
}

main();