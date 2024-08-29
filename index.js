// ISSUE: IF STATES ARE ON TOP OF EACH OTHER, VECTOR IS NOT DRAWN. ERROR IN CONSOLE.

const SVG = document.getElementById("line-container")

var reader = new FileReader()
reader.onload = LoadStates

var lastPos
var states = []
var statesNo = 0
var mouseDown = false
var clickedState = null
var currentMenu = null
field = document.getElementsByTagName("field")[0]

class State {
    constructor(name, statesDOM, infoDOM) {
        this.name = name
        this.id = name
        this.stateDOM = statesDOM
        this.infoDOM = infoDOM
        // this.x = DOM.getBoundingClientRect().x
        // this.y = DOM.getBoundingClientRect().y
    }
    x = 0
    y = 0
    statesFrom = []
    transitionEditing = "0"
    transitions = {
        "0": {
            stateTo: "",
            executes: "",
            vector: undefined,
        },
        "1": {
            stateTo: "",
            executes: "",
            vector: undefined,
        },
        "#": {
            stateTo: "",
            executes: "",
            vector: undefined,
        },
        "□": {
            stateTo: "",
            executes: "",
            vector: undefined,
        },
    }
}

function DefineVector(start, end, type) {
    if (type == "straight") {
        let d = `M ${start[0]} ${start[1]} ${end[0]} ${end[1]}`
        return d
    } // could also do this with setting cartesian / direction offset to 0
    if ((type == "loop")) { // start[0] == end[0] && start[1] == end[1]
        let yDiff = window.innerWidth * .12
        let xDiff = window.innerWidth * .08
        return `M ${start[0]} ${start[1]} C ${start[0]-xDiff} ${start[1]-yDiff} ${start[0]+xDiff} ${start[1]-yDiff} ${start[0]} ${start[1]}`
    }
    let midpoint = [(start[0] + end[0])/2, (start[1] + end[1])/2]
    let grad = -(start[0]-end[0])/(start[1]-end[1])
    isNaN(grad) ? grad = Infinity : {}
    let length = (((end[0]-start[0])**2 + (end[0]-start[0])**2))**(1/2)
    length < 1000 ? length = 1000 : {} // for the purposes of LOG
    let arctan = Math.atan(grad)
    start[1] >= end[1] ? {} : arctan += Math.PI
    let cartesianOffset = [Math.cos(arctan), Math.sin(arctan)]
    let directionOffset = -1
    let m = [midpoint[0] + directionOffset*30*Math.log(length)*cartesianOffset[0], midpoint[1] + directionOffset*30*Math.log(length)*cartesianOffset[1]]
    let d = `M ${start[0]} ${start[1]} Q ${m[0]} ${m[1]} ${end[0]} ${end[1]}`
    return d
}

function DrawVector(startState, endState, type) {
    let startRect = startState.stateDOM.getBoundingClientRect()
    let start = [startRect.x+startRect.width/2,startRect.y+startRect.height/2]
    let d
    if (type == "loop") {
        d = DefineVector(start, start, type)
    } else {
        let endRect = endState.stateDOM.getBoundingClientRect()
        let end = [endRect.x+endRect.width/2,endRect.y+endRect.height/2]
        d = DefineVector(start, end, type) // type can probably be removed because of ifs above
    }
    let vector = SVG.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "path"))
    vector.classList.add("statearrow")
    vector.setAttribute("d", d)
    vector.setAttribute("stroke", "blue")
    vector.setAttribute("stroke-width", ".4dvw")
    vector.setAttribute("fill", "none")
    vector.setAttribute("marker-end", "url(#arrowmarker)")
    // start
    return vector
}

function AssignVector(from, to, forceCurved) {
    if (from != to) {
        if (forceCurved == true) {
            return DrawVector(from, to)
        }
        if (from.statesFrom.includes(to.name) == false) {
            return DrawVector(from, to, "straight") // replace undefined with straight calculation
        } else {
            UpdateVectors(to, from)
            return DrawVector(from, to)
        }
    } else {
        return DrawVector(from, to, "loop")
    }
}

function ResizeAllVectors() {
    states.forEach((state) => UpdateVectors(state))
}

function StateNameChange() {
    let cursorPos = this.selectionStart
    let length = this.value.length
    let value = this.value = this.value.toUpperCase().replaceAll(" ", "").replaceAll(/[^A-Z0-9]/g, "")
    cursorPos = cursorPos-(length-this.value.length)
    this.setSelectionRange(cursorPos, cursorPos)

    if (states.find(state => state.name == value) == undefined && value != "") {
        let thisState = states.find(state => state.infoDOM == this.parentElement.parentElement)
        thisState.stateDOM.innerHTML = value
        let oldName = thisState.name
        thisState.name = value
        thisState.statesFrom.forEach(function(stateName) {
            let stateFrom = states.find(state => state.name == stateName)
            let statesConnected = Object.keys(stateFrom.transitions).filter(key => stateFrom.transitions[key].stateTo == oldName)
            statesConnected.forEach(function(connectedStateName) {
                stateFrom.transitions[connectedStateName].stateTo = value
            })
        })
    }
}

function StateNameUnfocus() {
    let thisState = states.find(state => state.infoDOM == this.parentElement.parentElement)
    this.value = thisState.name
}

function StartStateChange() {
    let value = this.value
    let state = states.find(state => state.infoDOM == this.parentElement.parentElement)
    document.getElementsByClassName("start-state")[0] != undefined ? document.getElementsByClassName("start-state")[0].classList.remove("start-state") : {}
    state.stateDOM.classList.add("start-state")
}

function StateCoordChange() {
    let state = states.find(state => state.infoDOM == this.parentElement.parentElement.parentElement)
    let xOffset = 0
    let yOffset = 0
    if (this.classList.contains("xCoord")) {
        xOffset = state.x - this.value
    } else if (this.classList.contains("yCoord")) {
        yOffset = state.y - this.value
    }
    MoveState(state, xOffset, yOffset)
}

function ExecuteChange() {
    let state = states.find(state => state.infoDOM == this.parentElement.parentElement.parentElement.parentElement)
    let cursorPos = this.selectionStart
    let length = this.value.length
    let value = this.value = this.value.toUpperCase().replaceAll("U", "🡑").replaceAll("D", "🡓").replaceAll("L", "🡐").replaceAll("R", "🡒").replaceAll(" ", "□").replaceAll(/[^🡐🡑🡒🡓01#□]/g, "")
    cursorPos = cursorPos-(length-this.value.length)
    this.setSelectionRange(cursorPos, cursorPos) 
    state.transitions[state.transitionEditing].executes = value
}

function StateToChange() {
    let thisState = states.find(state => state.infoDOM == this.parentElement.parentElement.parentElement.parentElement)
    let cursorPos = this.selectionStart
    let length = this.value.length
    let name = this.value = this.value.toUpperCase().replaceAll(" ", "").replaceAll(/[^A-Z0-9]/g, "")
    cursorPos = cursorPos-(length-this.value.length)
    this.setSelectionRange(cursorPos, cursorPos)

    if (states.find(state => state.name == name) != undefined || name == 0) {
        let oldStateTo = states.find(state => state.name == thisState.transitions[thisState.transitionEditing].stateTo)
        thisState.transitions[thisState.transitionEditing].stateTo = this.value
        let stateTo = states.find(state => state.name == name)
        let vectorMatch
        let oldVectorMatch
        Object.keys(thisState.transitions).forEach(function(key) {
            if (key != thisState.transitionEditing ) {
                if (thisState.transitions[key].stateTo == thisState.transitions[thisState.transitionEditing].stateTo) {
                    vectorMatch = thisState.transitions[key]
                }
                if (oldStateTo != undefined && thisState.transitions[key].stateTo == oldStateTo.name) {
                    oldVectorMatch = true
                }
            }
        })
        if (vectorMatch != undefined && stateTo != undefined) {
            thisState.transitions[thisState.transitionEditing].vector = vectorMatch.vector
        } else {
            if (thisState.transitions[thisState.transitionEditing].vector != undefined) {
                if (oldVectorMatch == undefined && oldStateTo != undefined) {
                    thisState.transitions[thisState.transitionEditing].vector.remove()
                    oldStateTo.statesFrom.splice(oldStateTo.statesFrom.indexOf(thisState.name), 1)
                    if (thisState.statesFrom.includes(oldStateTo.name)) {
                        UpdateVectors(oldStateTo)
                    }
                }
                thisState.transitions[thisState.transitionEditing].vector = undefined
            }
            if (stateTo != undefined) {
                thisState.transitions[thisState.transitionEditing].vector = AssignVector(thisState, stateTo)
                stateTo.statesFrom.push(thisState.name)
            }
        }
    }
}

function StateToUnfocus() {
    let thisState = states.find(state => state.infoDOM == this.parentElement.parentElement.parentElement.parentElement)
    this.value = thisState.transitions[thisState.transitionEditing].stateTo
}

function CreateInfoDOM(name) { // autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
    let DOM = document.getElementsByTagName("states")[0].appendChild(document.createElement("stateinfo"))
    DOM.onclick = ClickState
    
    
    let checkBox = DOM.appendChild(document.createElement("checkbox"))
    checkBox.innerHTML = `<input type="radio" name="start">`
    checkBox.children[0].oninput = StartStateChange
    
    
    let stateName = DOM.appendChild(document.createElement("infoname"))
    stateName.innerHTML = `<input class="namefield" type="text" maxlength="5" size="5" placeholder="Name:" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">`
    stateName.children[0].value = name
    stateName.children[0].oninput = StateNameChange
    stateName.children[0].addEventListener("focusout", StateNameUnfocus)
    
    
    let defineTransitionContainer = DOM.appendChild(document.createElement("definetransitioncontainer"))
    let addTransitionsButton = defineTransitionContainer.appendChild(document.createElement("addtransition"))
    let addTransitions = defineTransitionContainer.appendChild(document.createElement("definetransition"))
    let transitionsPreContainer = addTransitions.appendChild(document.createElement("precontainer"))
    transitionsPreContainer.innerHTML = `<input class="namefield" type="text" maxlength="5 size="5" placeholder="Name:" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">`
    transitionsPreContainer.children[0].oninput = StateToChange
    transitionsPreContainer.children[0].addEventListener("focusout", StateToUnfocus)
    addTransitions.appendChild(document.createElement("inputspacing"))
    let transitionsPostContainer = addTransitions.appendChild(document.createElement("postcontainer"))
    transitionsPostContainer.innerHTML = `<input type="text" placeholder="Machine executes:" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></input>`
    transitionsPostContainer.children[0].oninput = ExecuteChange
    let selectSymbols = transitionsPreContainer.appendChild(document.createElement("symbolcontainer"))
    let selectSymbol0 = selectSymbols.appendChild(document.createElement("selectsymbol"))
    selectSymbol0.innerHTML = "0"
    // selectSymbol0.tabIndex = 0
    selectSymbol0.classList.add("clicked")
    selectSymbol0.onclick = ClickSelectSymbol
    let selectSymbol1 = selectSymbols.appendChild(document.createElement("selectsymbol"))
    selectSymbol1.innerHTML = "1"
    // selectSymbol1.tabIndex = 0
    selectSymbol1.onclick = ClickSelectSymbol
    let selectSymbolHash = selectSymbols.appendChild(document.createElement("selectsymbol"))
    selectSymbolHash.innerHTML = "#"
    // selectSymbolHash.tabIndex = 0
    selectSymbolHash.onclick = ClickSelectSymbol
    let selectSymbolEmpty = selectSymbols.appendChild(document.createElement("selectsymbol"))
    selectSymbolEmpty.innerHTML = "□"
    // selectSymbolEmpty.tabIndex = 0
    selectSymbolEmpty.onclick = ClickSelectSymbol


    let transitionInformations = defineTransitionContainer.appendChild(document.createElement("transitioninfocontainer"))
    let transitionInfo0 = transitionInformations.appendChild(document.createElement("transitioninfo"))
    let transitionInfo1 = transitionInformations.appendChild(document.createElement("transitioninfo"))
    let transitionInfoHash = transitionInformations.appendChild(document.createElement("transitioninfo"))
    let transitionInfoEmpty = transitionInformations.appendChild(document.createElement("transitioninfo"))


    let stateCoords = DOM.appendChild(document.createElement("coords"))
    let xCoord = stateCoords.appendChild(document.createElement("coordinate"))
    stateCoords.appendChild(document.createElement("inputspacing"))
    let yCoord = stateCoords.appendChild(document.createElement("coordinate"))
    xCoord.classList.add("x-coord")
    yCoord.classList.add("y-coord")
    xCoord.innerHTML = `X: <space></space><input type="number" class="xCoord" value="0">`
    yCoord.innerHTML = `Y: <space></space><input type="number" class="yCoord" value="0">`
    xCoord.children[1].oninput = yCoord.children[1].oninput = StateCoordChange

    return DOM
}

function ClickState() {
    let state = states.find(state => state.stateDOM == this)
    state == undefined ? state = states.find(state => state.infoDOM == this) : {}
    state.stateDOM.style.backgroundColor = " hsl(51,100%,80%)"
    state.infoDOM.scrollIntoView({behavior: "smooth", block: "nearest"})
    state.infoDOM.style.backgroundColor = "hsl(51,100%,80%)"
    let prevState = states.find(state => state.stateDOM == clickedState)
    prevState == undefined ? prevState = states.find(state => state.infoDOM == clickedState) : {}
    if (clickedState != null && prevState.stateDOM != this && prevState.infoDOM != this) { // clickedState != null is replaceable with prevState != undefined
        prevState.stateDOM.style.backgroundColor = "gold"
        prevState.infoDOM.style.backgroundColor = "hsl(35, 100%, 28%, 30%)"
    }
    clickedState = this
}

function ClickSelectSymbol() {
    let clicked = this.parentElement.getElementsByClassName("clicked")[0]
    clicked != undefined ? clicked.classList.remove("clicked") : {}
    this.classList.add("clicked")
    let state = states.find(state => state.infoDOM == this.parentElement.parentElement.parentElement.parentElement.parentElement)
    let symbol = this.innerHTML
    state.transitionEditing = symbol
    this.parentElement.parentElement.getElementsByTagName("input")[0].value = state.transitions[symbol].stateTo
    this.parentElement.parentElement.parentElement.getElementsByTagName("postcontainer")[0].children[0].value = state.transitions[symbol].executes
}

function UpdateCoords(state) {
    state.infoDOM.getElementsByTagName("coords")[0].children[0].children[1].value = state.x
    state.infoDOM.getElementsByTagName("coords")[0].children[2].children[1].value = state.y
}

function UpdateVectors(thisState, forceCurved) {
    let stateList = []
    let vectorList = []
    Object.values(thisState.transitions).forEach(function(value) {
        if (stateList.includes(value.stateTo) == false && value.stateTo != "") {
            stateList.push(value.stateTo)
            let stateTo = states.find(state => state.name == value.stateTo)
            if (states.find(state => state.name == value.stateTo) == forceCurved) { // THIS MAY CAUSE PROBLEMS BECAUSE UNDEFINED == UNDEFINED. IF IT IS SUSPECTED THAT THIS IS CAUSING PROBLEMS, ADD A CLAUSE THAT SPECIFIED forceCurved (or the other thing) != undefined
                vectorList.push(AssignVector(thisState, stateTo, true))
            } else {
                vectorList.push(AssignVector(thisState, stateTo))
            }
        }
    })
    Object.keys(thisState.transitions).forEach(function(key) {
        let removed
        if (stateList.includes(thisState.transitions[key].stateTo)) {
            if (removed == undefined) {
                thisState.transitions[key].vector.remove()
                removed = true
            }
            thisState.transitions[key].vector = vectorList[stateList.indexOf(thisState.transitions[key].stateTo)]
        }
    })

    thisState.statesFrom.forEach(function(from) {
        let stateFrom = states.find(state => state.name == from)
        let newVector
        if (stateFrom == forceCurved) {
            newVector = AssignVector(stateFrom, thisState, true)
        } else {
            newVector = AssignVector(stateFrom, thisState)
        }
        let removed
        Object.keys(stateFrom.transitions).forEach(function(key) {
            if (stateFrom.transitions[key].stateTo == thisState.name) {
                if (removed == undefined) {
                    stateFrom.transitions[key].vector.remove()
                    removed = true
                }
                stateFrom.transitions[key].vector = newVector
            }
        })
    })
}

function MoveState(state, xTranslation, yTranslation, movedVectors) {
    state.x -= xTranslation
    state.y -= yTranslation
    state.stateDOM.style.transform = `translate(${state.x}px, ${state.y}px)`
    if (movedVectors == undefined) {
        UpdateCoords(state)
        UpdateVectors(state)
    }
}

function MoveStates(xTranslation, yTranslation) {
    states.forEach(function(element) {
        MoveState(element, xTranslation, yTranslation, true)
    })
    for (let i = 0; i < document.getElementsByClassName("statearrow").length; i++) {
        console.log(document.getElementsByClassName("statearrow")[i].getAttribute("d"))
        let dArrow = document.getElementsByClassName("statearrow")[i]
        d = dArrow.getAttribute("d").split(" ")
        console.log(d[0], typeof d[0], d[1], typeof d[1])
        let preQ = 1
        d.forEach(function(element, index) {
            if (element == "Q" || element == "C") {
                preQ = 0
            } else {
                let dNum = Number(element)
                if (isNaN(dNum) == false) {
                    d[index] = dNum - (index % 2 == preQ ? xTranslation : yTranslation)
                }
            }
        })
        dArrow.setAttribute("d", d.join(" "))
    }
}

function StateMouseDown(clickEvent) {
    if (mouseDown) {
        return
    }
    if (clickEvent.button == 0) {
        mouseDown = this
        this.style.zIndex = 2
        lastPos = [clickEvent.x, clickEvent.y]
        document.onmouseup = function(event) {
            if (event.button == 0) {
                document.onmousemove = null
                document.onmouseup = null
                mouseDown.style.zIndex = 1
                mouseDown = false
            }
        }
        document.onmousemove = function(dragEvent) {
            let x = dragEvent.x
            let y = dragEvent.y
            MoveState(states.find(state => state.stateDOM == mouseDown),lastPos[0]-x, lastPos[1]-y)
            lastPos = [x, y]
        }
    }
}

function StateTouchStart(clickEvent) {
    if (mouseDown) {
        return
    }
    mouseDown = this
    this.style.zIndex = 2
    lastPos = [clickEvent.touches[0].clientX, clickEvent.touches[0].clientY]
    document.ontouchend = function(event) {
        if (event.touches[0] == undefined) {
            document.ontouchmove = null
            document.ontouchend = null
            mouseDown.style.zIndex = 1
            mouseDown = false
        }
    }
    document.ontouchmove = function(dragEvent) {
        let x = dragEvent.touches[0].clientX
        let y = dragEvent.touches[0].clientY
        MoveState(states.find(state => state.stateDOM == mouseDown),lastPos[0]-x, lastPos[1]-y)
        lastPos = [x, y]
    }
}

document.getElementsByTagName("dragbar")[0].onmousedown = document.getElementsByTagName("dragbar")[1].onmousedown = function(clickEvent) {
    if (mouseDown) {
        return
    }
    if (clickEvent.button == 0) {
        mouseDown = this
        lastPos = [0, clickEvent.y]
        document.onmouseup = function(event) {
            if (event.button == 0) {
                document.onmousemove = null
                document.onmouseup = null
                mouseDown = false
            }
        }
        document.onmousemove = function(dragEvent) {
            let y = dragEvent.y
            div = mouseDown.parentElement
            div.style.height = `${div.getBoundingClientRect().height + lastPos[1]-y}px`
            lastPos = [0,y]
        }
    }
}

document.getElementsByTagName("dragbar")[0].ontouchstart = document.getElementsByTagName("dragbar")[1].ontouchstart = function(clickEvent) {
    if (mouseDown) {
        return
    }
    mouseDown = this
    lastPos = [0, clickEvent.touches[0].clientY]
    document.ontouchend = function(event) {
        if (event.touches[0] == undefined) {
            document.ontouchmove = null
            document.ontouchend = null
            mouseDown = false
        }
    }
    document.ontouchmove = function(dragEvent) {
        let y = dragEvent.touches[0].clientY
        div = mouseDown.parentElement
        div.style.height = `${div.getBoundingClientRect().height + lastPos[1]-y}px`
        lastPos = [0,y]
    }
}

window.onresize = ResizeAllVectors

document.getElementById("add-state").onclick = function() {
    let statesDOM = document.getElementsByTagName("field")[0].appendChild(document.createElement("state"))
    statesDOM.onmousedown = StateMouseDown
    statesDOM.ontouchstart = StateTouchStart
    statesDOM.onclick = ClickState
    let name = `S${statesNo++}`
    statesDOM.innerHTML = name
    // statesDOM.id = name
    let infoDOM = CreateInfoDOM(name)
    states.push(new State(name, statesDOM, infoDOM))
}

document.getElementById("import-states").onclick = function() {
    let upload = document.getElementById("upload-file")
    upload.click()
}

document.getElementById("save-states").onclick = function() {
    if (states.length != 0) {
        let data = new Blob([JSON.stringify(states)])
        var a = document.createElement("a")
        a.style = "display:none"
        a.download = "machine.fsm"
        a.href = window.URL.createObjectURL(data)
        a.click()
    } else {
        alert("Nothing to save!")
    }
}

document.getElementById("upload-file").onchange = function() {
    reader.readAsText(this.files[0])
}

function LoadStates() {
    try {
        let json = JSON.parse(reader.result)
    } catch {
        alert("Invalid file!")
    }
}

document.getElementsByTagName("field")[0].onmousedown = function(clickEvent) {
    if (mouseDown) {
        return
    }
    if (clickEvent.button == 0) {
        mouseDown = true
        lastPos = [clickEvent.x, clickEvent.y]
        document.onmouseup = function(event) {
            if (event.button == 0) {
                document.onmousemove = null
                document.onmouseup = null
                mouseDown = false
            }
        }
        document.onmousemove = function(dragEvent) {
            let x = dragEvent.x
            let y = dragEvent.y
            MoveStates(lastPos[0]-x, lastPos[1]-y)
            lastPos = [x, y]
        }
    }
}

document.getElementsByTagName("field")[0].ontouchstart = function(clickEvent) {
    if (mouseDown) {
        return
    }
    mouseDown = true
    lastPos = [clickEvent.touches[0].clientX, clickEvent.touches[0].clientY]
    document.ontouchend = function(event) {
        if (event.touches[0] == undefined) {
            document.ontouchmove = null
            document.ontouchend = null
            mouseDown = false
        }
    }
    document.ontouchmove = function(dragEvent) {
        let x = dragEvent.touches[0].clientX
        let y = dragEvent.touches[0].clientY
        MoveStates(lastPos[0]-x, lastPos[1]-y)
        lastPos = [x, y]
    }
}

document.getElementById("states-button").onclick = function() {
    if (currentMenu == "states") {
        currentMenu = null
        document.getElementById("states-button").classList.remove("opened")
        document.getElementsByTagName("states")[0].classList.add("closed")
    } else {
        document.getElementById("states-button").classList.add("opened")
        document.getElementsByTagName("states")[0].classList.remove("closed")
        if (currentMenu == "tape") {
            document.getElementById("tape-button").classList.remove("opened")
            document.getElementsByTagName("tape")[0].classList.add("closed")
        }
        currentMenu = "states"
    }
}

document.getElementById("tape-button").onclick = function() {
    if (currentMenu == "tape") {
        currentMenu = null
        document.getElementById("tape-button").classList.remove("opened")
        document.getElementsByTagName("tape")[0].classList.add("closed")
    } else {
        document.getElementById("tape-button").classList.add("opened")
        document.getElementsByTagName("tape")[0].classList.remove("closed")
        if (currentMenu == "states") {
            document.getElementById("states-button").classList.remove("opened")
            document.getElementsByTagName("states")[0].classList.add("closed")
        }
        currentMenu = "tape"
    }
}