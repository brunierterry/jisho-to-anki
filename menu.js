async function listConceptsToExport() {
    return await chrome.runtime.sendMessage({"event": "list"})
}

function prepareValueForExport(value) {
    return String(value).replaceAll('"', '""')
}

function inlineConcept(concept) {
    return `"${prepareValueForExport(concept.kanji)}";"${prepareValueForExport(concept.furigana)}";"${prepareValueForExport(concept.meanings)}"`
}

function fileContent(concepts) {
    return concepts
        .map(concept => inlineConcept(concept))
        .join("\n")
}

function prepareFileToDownload(concepts) {
    if (Array.isArray(concepts)) {
        downloadTriggerNode.download = "jisho2anki_export.csv";
        const headersLine = '"";"";""\n'
        downloadTriggerNode.href = `data:text/csv,${headersLine}${fileContent(concepts)}\n`
    } else {
        console.error("Impossible to fetch concepts to export")
    }
}

// INITIALIZATION
const downloadTriggerNode = document.getElementById('hidden_download_trigger')
const exportButton = document.getElementById('displayed_export_button')

exportButton.onclick = async function() {
    const conceptsToExport = await listConceptsToExport()
    prepareFileToDownload(conceptsToExport)
    downloadTriggerNode.click()
}