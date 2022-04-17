function keyFromId(id) {
    return `savedConcept-${id}`
}

function safeArrayFromResponse(responseObject, key) {
    return Array.isArray(responseObject[`${key}`]) ? responseObject[`${key}`] : []
}

function copyArrayWithout(array, elementToRemove) {
    return array.filter(function(element, index, arr) {
        const keepCondition = element != elementToRemove
        return keepCondition
    })
}

function copyArrayWithNewElement(array, elementToAdd) {
    const isNew = !array.includes(elementToAdd)
    if (isNew) {
        array.push(elementToAdd)
    }
}

async function saveConcept(concept) {
    concept.isSaved = true
    const keyValue = {}
    keyValue[keyFromId(concept.id)] = concept
    await  chrome.storage.sync.set(keyValue)
}

async function addToExportList(concept) {
    const conceptIds = await chrome.storage.sync.get("conceptsToExport")

    const exportIds = safeArrayFromResponse(conceptIds, "conceptsToExport")
    copyArrayWithNewElement(exportIds, concept.id)

    const keyValue = {"conceptsToExport": exportIds}
    await chrome.storage.sync.set(keyValue)
}

async function saveThenSendAsynchronousResponse(concept, sendResponse) {
    await saveConcept(concept)
    await addToExportList(concept)
    sendResponse({isPersisted: true})
}

function removeConcept(conceptId, callback) {
    const key = keyFromId(conceptId)
    chrome.storage.sync.remove(key, function(){
        callback()
    })
}

function deleteFromExportList(conceptId, callback) {
    chrome.storage.sync.get("conceptsToExport", function(response) {
        const oldExportIds = safeArrayFromResponse(response, "conceptsToExport")
        const remainingIds = copyArrayWithout(oldExportIds, conceptId)
        const keyValue = {"conceptsToExport": remainingIds}
        chrome.storage.sync.set(keyValue, function() {
            callback()
        })
    })
}

async function removeThenSendAsynchronousResponse(conceptId, sendResponse) {
    await removeConcept(conceptId)
    await deleteFromExportList(conceptId)
    sendResponse({isRemoved: true})
}

async function findThenSendAsynchronousResponse(conceptId, sendResponse) {
    const key = keyFromId(conceptId)
    const maybeConcept = await chrome.storage.sync.get(key)
    const concept = maybeConcept[key] ? maybeConcept[key] : undefined
    sendResponse({"savedConcept": concept})
}

async function listThenSendAsynchronousResponse(sendResponse) {
    const conceptIds = await chrome.storage.sync.get("conceptsToExport")
    const keys = conceptIds.conceptsToExport.map(id => keyFromId(id))
    const conceptsByKeys = await chrome.storage.sync.get(keys)
    const conceptsToExport = Object.entries(conceptsByKeys).map(( [key, value] ) => value)
    sendResponse(conceptsToExport)
}

// INITIALIZATION
chrome.runtime.onMessage.addListener(
    /**
        This anonymous function MUST be returned to ensure the message sender will expect an asynchronous response.
        Otherwise you will get following error in the console:
            "The message port closed before a response was received."
    */
    (message, sender, sendResponse) => {
        if (message.event == "save") {
            saveThenSendAsynchronousResponse(message.savedConcept, sendResponse)
            return true // Indicate the response will be asynchronous
        } else if (message.event == "remove") {
            removeThenSendAsynchronousResponse(message.savedConceptId, sendResponse)
            return true // Indicate the response will be asynchronous
        } 
        else if (message.event == "find") {
            findThenSendAsynchronousResponse(message.savedConceptId, sendResponse)
            return true // Indicate the response will be asynchronous
        }
        else if (message.event == "list") {
            listThenSendAsynchronousResponse(sendResponse)
            return true // Indicate the response will be asynchronous
        } else {
            console.error(`Unknown event "${message.event}"`)
            sendResponse()
            return false
        }
  }
)