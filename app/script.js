function changeColor(c) {
    document.querySelectorAll(".key").forEach(a => a.style.backgroundColor = c);
}

function setTumbling(t) {
    if (t) {
        document.querySelectorAll(".tum").forEach(function(a) {
            a.style.filter = "";
            a.disabled = false;
        });
    } else {
        document.querySelectorAll(".tum").forEach(function(a) {
            a.style.filter = "brightness(75%)";
            a.disabled = true;
        });
    }
}

function skillFromFIG(skill) {
    // tumbling skills, hardcode
    if (["f", "[", "^"].includes(skill)) {
        return skill;
    }

    var skillStream = skill.split("");

    // for tumbling, forward skills
    var forward = false;
    if (skillStream.length > 0 && skillStream[0] == ".") {
        skillStream.shift();
        skill = skill.slice(1, skill.length)
        forward = true;
    }

    // get position from end
    var position = skillStream.pop();
    if (!["/", "<", "•"].includes(position)) {
        skillStream.push(position);

        // hardcode straight as default for flips under double
        if (parseInt(skill) < 80) {
            position = "/";
        } else {
            return undefined;
        }
    }

    // flips between single and double get a default 0 twist
    if (parseInt(skill) >= 4 && parseInt(skill) < 8) {
        skillStream.push("0");
    }

    var flipBuffer = "";
    do {
        flipBuffer += skillStream.shift();

        // bad flip
        if (isNaN(flipBuffer)) {
            return undefined;
        }

        let quarterFlip = parseInt(flipBuffer);
        let fullFlip = Math.floor(quarterFlip/4);

        // test if all twists can be accompanied by a flip
        let diff = Math.abs(skillStream.length - fullFlip);

        // if skill doesn't go to feet, give leeway for one less possible twist
        if (diff == 0 || (quarterFlip % 4 && diff <= 1)) {
            break;
        } else if (fullFlip > skillStream.length) {
            return undefined;
        }
    } while(skillStream.length);

    // pad twists for flips that don't go to feet
    if (Math.ceil(parseInt(flipBuffer)/4) > skillStream.length) {
        skillStream.push("0");
    }

    // sanity check
    for (var i=0; i<skillStream.length; i++) {
        if (isNaN(parseInt(skillStream[i]))) {
            return undefined;
        }
    }

    return {
        position: position,
        flips: parseInt(flipBuffer),
        twists: parseInt(skillStream.reduce((a,b)=>parseInt(a)+parseInt(b))),
        forward: forward
    };

}

function dmtDD(skillObj) {
    // everything must land on feet
    if (skillObj.flips % 4) {
        return NaN;
    }

    let fullFlips = Math.floor(skillObj.flips/4);
    // Each completed 360º of somersault: 0.5
    var dd = fullFlips * 0.5;

    if (fullFlips < 2) { // Single somersaults
        // pike / straight, without twist
        if (skillObj.twists == 0 && skillObj.position != "•") {
            dd += 0.1;
        }

        // Twists - single somersaults
        var twist = 0.0;
        while (twist < skillObj.twists/2) {
            dd += (2 + Math.floor(twist))/10.0;
            twist += 0.5;
        }
    } else { // More than single somersaults

        // Double/Triple/Etc. somersault: pike / straight
        var bonus = 0;
        if (skillObj.position == "<") {
            bonus = (2 ** fullFlips)/10.0; // assuming it is exponential
        } else if (skillObj.position == "/") {
            bonus = (2 ** fullFlips)/5.0; // assuming it is exponential
        }

        // Double/Triple/Etc. somersault each 1/2 twist
        dd += 0.2 * skillObj.twists;

        // Add all somersault and twist values, double/triple/etc. that amount, and then add the position bonus
        dd = dd * fullFlips + bonus;
    }

    return dd;
}

function trampDD(skillObj) {
    let fullFlips = Math.floor(skillObj.flips/4);
    var dd = 0.1*skillObj.flips + 0.1*fullFlips + 0.1*skillObj.twists;

    if (skillObj.twists == 0 && skillObj.flips > 3 && skillObj.flips < 8 && skillObj.position != "•") {
        dd += 0.1;
    } else if (skillObj.flips >= 8 && skillObj.position != "•") {
        dd += fullFlips*0.1;
    }

    dd += fullFlips >= 3 ? (fullFlips-2)*0.1 : 0;

    return dd;
}

function tumblingDD(skillObj) {
    // everything must land on feet
    if (skillObj.flips % 4) {
        return NaN;
    }

    if (skillObj == "f" || skillObj == "[") {
        return 0.1;
    } else if (skillObj == "^") {
        return 0.2;
    }

    dd = Math.floor(skillObj.flips/4.0)/2;
    dd += skillObj.forward ? Math.floor(skillObj.flips/4.0) * 0.1 : 0.0;

    if (skillObj.position == "<") {
        dd += (Math.floor(skillObj.flips / 12) * 0.1 + 0.1);
    } else if (skillObj.position == "/") {
        dd += 2**(Math.floor(skillObj.flips/4.0) - 1) / 10;
    }

    if (skillObj.flips < 8) {
        var twist = 0.0;
        while (twist < skillObj.twists) {
            if (twist > 6) {
                dd += 0.4;
            } else if (twist > 4) {
                dd += 0.3;
            } else {
                dd += 0.2;
            }
            twist += 1;
        }
        if (twist > 0) {
            dd -= 0.1; // janky
        }
    } else if (skillObj.flips < 12) {
        var twist = 0.0;
        while (twist < skillObj.twists) {
            dd += (Math.floor(twist/2)+1)*0.1;
            twist += 1;
        }
    } else {
        var twist = 0.0;
        while (twist < skillObj.twists) {
            if (twist > 2) {
                dd += 0.4;
            } else {
                dd += 0.3;
            }
            twist += 1;
        }
    }

    return dd * Math.floor(skillObj.flips/4.0);
}

window.mode = 1; // 0=tramp, 1=mini, 2=tumbling
window.skills = []; // [ [1, "800<"], [-1, "42/"] ] is same as 800<-42/

function getDD(skillObj) {
    switch (window.mode) {
        case 0:
            return trampDD(skillObj);
        case 1: 
            return dmtDD(skillObj);
        case 2:
            return tumblingDD(skillObj);
        default:
            return NaN;
    }
}

function updateMode(m) {
    if (window.mode != m) {
        document.getElementById("vcontainer").innerHTML = "";
        window.skills = [];
    }
    window.mode = m;
    switch (m) {
        case 0:
            changeColor('skyblue');
            setTumbling(false);
            break;
        case 1:
            changeColor('lightgreen');
            setTumbling(false);
            break;
        case 2:
            changeColor('deeppink');
            setTumbling(true);
            break;
    }

}

function updateInput(output) {
    let inputSpace = document.querySelector('#vcontainer');
    inputSpace.innerHTML = "";

    var total = 0.0;

    for (var i = 0; i < window.skills.length; i++) {
        skill = window.skills[i];
        let entry = document.createElement("div");
        let sign = document.createElement("span");
        let fig = document.createElement("span");

        entry.appendChild(sign);
        entry.appendChild(fig);

        entry.classList.add("skillField");
        entry.classList.add("skillV1");
        sign.classList.add("skillSign");
        fig.classList.add("skillFig");

        sign.innerText = skill[0] != -1 ? (i == 0 ? " " : "+") : "-";
        fig.innerText = skill[1];
        fig.style.color = "#aaa";

        inputSpace.appendChild(entry);

        let out = document.createElement("div");
        let value = output[i];

        out.classList.add("ddField");
        out.style.color = "#aaa";

        if (isNaN(value)) {
            out.innerText = "0.0";
            out.style.color = "#aa0000";
            fig.style.color = "#aa0000";
        } else {
            out.innerText = value.toFixed(1);
            out.style.color = "#aaa";
            total += value;
        }

        entry.appendChild(out);
    }

    let entry = document.createElement("div");
    let sign = document.createElement("span");
    let fig = document.createElement("span");

    entry.appendChild(sign);
    entry.appendChild(fig);

    entry.classList.add("skillField");
    sign.classList.add("skillSign");
    fig.classList.add("skillFig");

    sign.innerText = " ";
    fig.innerText = "=";

    inputSpace.appendChild(entry);

    let out = document.createElement("div");
    out.classList.add("ddField");
    out.innerText = total.toFixed(1);

    entry.appendChild(out);

    inputSpace.append(...Array.from(inputSpace.childNodes).reverse());  
}

window.onload = function() {

    let events = document.querySelectorAll('[name="event"]');
    let buttons = document.querySelectorAll(".key");

    events.forEach(function(a) {
        if (a.checked) {
            switch (a.id) {
                case "tra": updateMode(0); break;
                case "dmt": updateMode(1); break;
                case "tum": updateMode(2); break;
            }
        }
    });

    document.querySelector("#clear").addEventListener("click", function() {
        window.skills = [];
        updateInput([]);
    })

    buttons.forEach(function(a) {
        a.addEventListener("click", function() {
            if (a.disabled) {
                return;
            }
            let char = a.children[0].innerText;
            let skills = window.skills;

            if (char == "+") {
                if (skills.length > 0 && skills[skills.length-1][1] == "") {
                    skills[skills.length-1][0] = 1;
                } else {
                	skills.push([1, ""]);
                }
            } else if (char == "-") {
                if (skills.length > 0 && skills[skills.length-1][1] == "") {
                    skills[skills.length-1][0] = -1;
                } else {
                	skills.push([-1, ""]);
                }
            } else if (char == "Del") {
                if (skills.length > 0) {
                    let last = skills[skills.length-1];
                    if (last[1].length == 0) {
                        skills.pop();
                    } else {
                        skills[skills.length-1][1] = last[1].slice(0, last[1].length-1);
                    }
                }
            } else if (char == "Clear") {
                skills = [];
            } else {
                if (skills.length == 0) {
                    skills.push([1, ""]);
                }
                skills[skills.length-1][1] += char;
            }

            window.skills = skills;
            updateInput(window.skills.map(function(s) {

                let skill = skillFromFIG(s[1]);
                if (skill == undefined) {
                    return NaN;
                } else {
                    let ret = getDD(skill) * s[0];
                    return ret;
                }
            }));
        });
    })
}
