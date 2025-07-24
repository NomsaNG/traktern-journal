document.addEventListener("DOMContentLoaded", () => {
  // Set up tab switching
  const exportTab = document.getElementById("export-tab")
  const shareTab = document.getElementById("share-tab")
  const exportFormContainer = document.getElementById("export-form-container")
  const shareOptionsContainer = document.getElementById("share-options-container")

  exportTab.addEventListener("click", () => {
    exportTab.classList.add("active")
    shareTab.classList.remove("active")
    exportFormContainer.classList.remove("hidden")
    shareOptionsContainer.classList.add("hidden")
  })

  shareTab.addEventListener("click", () => {
    shareTab.classList.add("active")
    exportTab.classList.remove("active")
    shareOptionsContainer.classList.remove("hidden")
    exportFormContainer.classList.add("hidden")
  })

  // Handle export type change
  const exportTypeSelect = document.getElementById("export-type")
  const dateRangeContainer = document.getElementById("date-range-container")

  exportTypeSelect.addEventListener("change", function () {
    if (this.value === "journal") {
      dateRangeContainer.classList.remove("hidden")
    } else {
      dateRangeContainer.classList.add("hidden")
    }
  })

  // Handle form submission
  const exportForm = document.getElementById("export-form")
  exportForm.addEventListener("submit", (e) => {
    e.preventDefault()
    exportData()
  })
})

async function exportData() {
  const exportType = document.getElementById("export-type").value
  const format = document.getElementById("format").value
  const dateRange = document.getElementById("date-range").value

  const submitButton = document.querySelector('#export-form button[type="submit"]')
  const originalButtonText = submitButton.textContent

  // Disable button and show loading state
  submitButton.disabled = true
  submitButton.textContent = "Exporting..."

  try {
    let endpoint = ""
    const data = { format }

    if (exportType === "journal") {
      endpoint = "/api/export/journal"
      data.dateRange = dateRange
    } else {
      endpoint = "/api/export/skills"
    }

    // For simplicity in this demo, we'll use a POST request that returns a file
    // In a real app, you might want to use window.open or create a download link

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error("Export failed")
    }

    // Get the filename from the Content-Disposition header if available
    const contentDisposition = response.headers.get("Content-Disposition")
    let filename = "export"

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]*)"?/)
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1]
      }
    }

    // Create a blob from the response
    const blob = await response.blob()

    // Create a download link and trigger it
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.style.display = "none"
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()

    // Clean up
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    // Show success message
    alert("Export completed successfully!")
  } catch (error) {
    console.error("Error exporting data:", error)
    alert("Failed to export data. Please try again.")
  } finally {
    // Re-enable button
    submitButton.disabled = false
    submitButton.textContent = originalButtonText
  }
}
