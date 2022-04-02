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

function saveConcept(concept, callback) {
    concept.isSaved = true
    const keyValue = {}
    keyValue[keyFromId(concept.id)] = concept
    chrome.storage.sync.set(keyValue, function(){
        callback()
    })
}

function addToExportList(concept, callback) {
    chrome.storage.sync.get("conceptsToExport", function(conceptIds) {
        const exportIds = safeArrayFromResponse(conceptIds, "conceptsToExport")
        copyArrayWithNewElement(exportIds, concept.id)

        const keyValue = {"conceptsToExport": exportIds}
        chrome.storage.sync.set(keyValue, function() {
            callback()
        })
    })
}

function saveThenSendAsynchronousResponse(concept, sendResponse) {
    saveConcept(concept, function(){
        addToExportList(concept, function(){
            sendResponse({isPersisted: true})
        })
    })
    return true // Indicate the response will be asynchronous
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

function removeThenSendAsynchronousResponse(conceptId, sendResponse) {
    removeConcept(conceptId, function() {
        deleteFromExportList(conceptId, function() {
            sendResponse({isRemoved: true})
        })
    })
    return true // Indicate the response will be asynchronous
}

function findThenSendAsynchronousResponse(conceptId, sendResponse) {
    const key = keyFromId(conceptId)
    chrome.storage.sync.get(key, function(maybeConcept){
        const concept = maybeConcept[key] ? maybeConcept[key] : undefined;
        sendResponse({"savedConcept": concept})
    })
    return true // Indicate the response will be asynchronous
}

function listThenSendAsynchronousResponse(sendResponse) {
    chrome.storage.sync.get("conceptsToExport", function(conceptIds) {
        const keys = conceptIds.conceptsToExport.map(id => keyFromId(id))
        chrome.storage.sync.get(keys, function(conceptsByKeys){
            const conceptsToExport = Object.entries(conceptsByKeys).map(( [key, value] ) => value)
            sendResponse(conceptsToExport)
        })
    })
    return true // Indicate the response will be asynchronous
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
            return saveThenSendAsynchronousResponse(message.savedConcept, sendResponse) // Do not remove the RETURN
        } else if (message.event == "remove") {
            return removeThenSendAsynchronousResponse(message.savedConceptId, sendResponse) // Do not remove the RETURN
        } 
        else if (message.event == "find") {
            return findThenSendAsynchronousResponse(message.savedConceptId, sendResponse) // Do not remove the RETURN
        }
        else if (message.event == "list") {
            return listThenSendAsynchronousResponse(sendResponse) // Do not remove the RETURN
        }
  }
)