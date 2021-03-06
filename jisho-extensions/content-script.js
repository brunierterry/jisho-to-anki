function addExtensionResourcesStyleSheetToDOM() {
    const extensionResourcesStyleSheet = document.createElement("style")
    extensionResourcesStyleSheet.textContent = `
    button.save-concept {
        background-image: url(${chrome.runtime.getURL("images/save_button_bg.png")})
    }
    `
    document.head.appendChild(extensionResourcesStyleSheet)
}

async function loadConcept(id) {
    const loadingMessage = { 
        "event": "find",
        "savedConceptId": id 
    }
    const response = await chrome.runtime.sendMessage(loadingMessage)
    const savedConcept = response.savedConcept ? response.savedConcept : undefined
    return savedConcept
}

async function saveConcept(concept) {
    const savingMessage = { 
        "event": "save",
        "savedConcept": concept 
    }
    const response = await chrome.runtime.sendMessage(savingMessage)
    if (response.isPersisted) {
        concept.isSaved = true
    } else {
        console.error(`Impossible to save the concept "${concept.kanji}" (id:${concept.id})`)
    }
}

async function forgetConcept(concept) {
    const removingMessage = { 
        "event": "remove",
        "savedConceptId": concept.id
    }
    const response = await chrome.runtime.sendMessage(removingMessage)
    if (response.isRemoved) {
        concept.isSaved = false
    } else {
        console.error(`Impossible to remove the concept "${concept.kanji}" (id:${concept.id})`)
    }
}

function extractUnsavedConcept(id, conceptNode) {
    const furiganaSpans = conceptNode
        .querySelectorAll("div.concept_light-wrapper > div.concept_light-readings > div.concept_light-representation > span.furigana > span.kanji")

    const furiganaByKanji = Array.prototype.slice.call(furiganaSpans)
        .map(span => span.innerText)
    
    const kanjiAndHiragana = conceptNode
        .querySelector("div.concept_light-wrapper > div.concept_light-readings > div.concept_light-representation > span.text")
        .innerText

    const furigana =  kanjiAndHiragana
        .split('')
        .map(kanjiOrHiragana => {
            const isKanji = !hiragana.includes(kanjiOrHiragana)
            const mustReplaceByHiragana = isKanji && furiganaByKanji.length > 0
            if(mustReplaceByHiragana) {
                const replacedByHiragana = furiganaByKanji.shift()
                return replacedByHiragana
            } else {
                return kanjiOrHiragana
            }
        })
        .join('')

    const meanings = conceptNode
         .querySelector("div.concept_light-meanings > div.meanings-wrapper")
         .innerHTML

    const extractedConcept = {
        "id": id
        ,"furigana": furigana
        ,"kanji": kanjiAndHiragana
        ,"meanings": meanings
        ,"isSaved": false
    }
    return extractedConcept
}

async function getSavedConceptOrElseExtractFromDOM(conceptNode) {
    const id = extractIdFromConceptNode(conceptNode)
    const loadedConcept = await loadConcept(id)
    const concept = loadedConcept ? loadedConcept : extractUnsavedConcept(id, conceptNode)
    return concept
}

function extractIdFromConceptNode(conceptNode) {
    return conceptNode
        .querySelector("div.concept_light-status > a[data-dropdown]")
        .getAttribute("data-dropdown")
        .replace("links_drop_", "")
}

async function createSaveOrForgetButton(concept) {
    const saveOrForgetButton = document.createElement("button")
    saveOrForgetButton.append(" ")

    const tooltipText = document.createElement("span")
    tooltipText.className = "tooltiptext"
    saveOrForgetButton.appendChild(tooltipText)

    const saveOnClick = async function(buttonNode) {
        await saveConcept(concept)
        if (concept.isSaved) {
            buttonNode.className ="save-concept saved extention-tooltip"
            buttonNode.querySelector(".tooltiptext").innerText = 
                `"${concept.kanji}" is saved
    
                Click to remove this concept
                from "export shipping list"`
            buttonNode.onclick = function() { forgetOnClick(this) }
        } else {
            console.error(`Button update not allowed for not saved concept: ${concept.kanji}`)
        }
    }
    
    const forgetOnClick = async function(buttonNode) {
        await forgetConcept(concept)
        if (!concept.isSaved) {
            buttonNode.className ="save-concept unsaved extention-tooltip"
            buttonNode.querySelector(".tooltiptext").innerText = 
                `"${concept.kanji}" is ignored
    
                Click to save this concept
                in "export shipping list"`
            buttonNode.onclick = function() { saveOnClick(this) }
        } else {
            console.error(`Button update not allowed for not forgotten concept: ${concept.kanji}`)
        }
    }

    if(concept.isSaved) {
        await saveOnClick(saveOrForgetButton)
    } else {
        await forgetOnClick(saveOrForgetButton)
    }

    return saveOrForgetButton
}

async function addSaveOrForgetButtonToDOM(concept, conceptNode) {
    const saveOrForgetButton = await createSaveOrForgetButton(concept)
    conceptNode
        .querySelector("div.concept_light-wrapper > div.concept_light-readings > div.concept_light-representation")
        .appendChild(saveOrForgetButton)
}

function newConceptNodes() {
    const conceptNodes = document.querySelectorAll("#primary div.concept_light")
    return Array.from(conceptNodes)
        .filter(function(node) {
            const doesNotHaveSaveButtonYet = !node.querySelector(".save-concept")
            const keepCondition = doesNotHaveSaveButtonYet
            return keepCondition
        })
}

async function addSaveButtonToNewConceptFound() {
    const conceptNodes = newConceptNodes()
    await Promise.all(
        conceptNodes.map(async (conceptNode) => {
            const loadedOrExtractedConcept = await getSavedConceptOrElseExtractFromDOM(conceptNode)
            await addSaveOrForgetButtonToDOM(loadedOrExtractedConcept, conceptNode)
        })
    )
}

// Initialization
const hiragana = "??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????".split('')
addExtensionResourcesStyleSheetToDOM()

// Execution
addSaveButtonToNewConceptFound()

// Check for updates
var intervalID = setInterval(async function () {
    await addSaveButtonToNewConceptFound()
}, 2500)

// Done - Get ID : 
// Done - Get furigana :  span.kanji-N-up kanji (N elements for N kanji)
// Done - Get text kanji : 
// Done - Get meanings : 

// Done check the Hash Map - found -> isFound = true
// Done get Data from the HashMap using ID as key (retireved Data contains isSaved=true) + check data are the same
// Done create the Data from the HashMap using ID as key (retireved Data contains isSaved=true)
// Done create the Data from elements found on the page if not in Hashmap (retireved Data contains isSaved=false)

// Done add a button to add unsaved concept to hashMap + toogle button state: unsaved -> saved
// Done add a button to remove saved concept from hashMap + toogle button state: saved -> unsaved

// Done persist the data on the storage
// Done read the data from the storage

// Done download csv file

// TODO check again page with interval  // HERE

// TODO set interval configuration

// TODO remember exported concepts
// TODO add a marker for exported concepts (display export date with tooltype)

// TODO batch loads
// TODO use await and async for promise rather than callbacks

// IDEA allow modification of meaning to export