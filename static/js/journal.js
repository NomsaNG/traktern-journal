document.addEventListener("DOMContentLoaded", () => {
  // Set default date to today
  const dateInput = document.getElementById("date")
  const today = new Date().toISOString().split("T")[0]
  dateInput.value = today

  // Load journal entries
  loadJournalEntries()

  // Handle form submission
  const journalForm = document.getElementById("journal-form")
  journalForm.addEventListener("submit", (e) => {
    e.preventDefault()
    submitJournalEntry()
  })
})

async function loadJournalEntries() {
  try {
    // Load recent entries (limited to 3)
    const recentResponse = await fetch("/api/journal?limit=2")
    const recentEntries = await recentResponse.json()
    renderEntries("recent-entries", recentEntries)

    // Load all entries
    const allResponse = await fetch("/api/journal")
    const allEntries = await allResponse.json()
    renderEntries("all-entries-list", allEntries)
  } catch (error) {
    console.error("Error loading journal entries:", error)
    document.getElementById("recent-entries").innerHTML =
      '<p class="error">Failed to load entries. Please try again.</p>'
    document.getElementById("all-entries-list").innerHTML =
      '<p class="error">Failed to load entries. Please try again.</p>'
  }
}

function renderEntries(containerId, entries) {
  const container = document.getElementById(containerId)

  if (entries.length === 0) {
    container.innerHTML = '<p class="empty-state">No journal entries yet. Start by creating your first entry!</p>'
    return
  }

  container.innerHTML = ""
  const template = document.getElementById("entry-template")

  entries.forEach((entry) => {
    const clone = template.content.cloneNode(true)

    // Format date
    const date = new Date(entry.date)
    const formattedDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })

    const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" })

    // Set content
    clone.querySelector(".entry-date").textContent = formattedDate
    clone.querySelector(".entry-day").textContent = dayOfWeek
    clone.querySelector(".entry-worked-on").textContent = entry.worked_on
    clone.querySelector(".entry-learned").textContent = entry.learned
    clone.querySelector(".entry-challenges").textContent = entry.challenges
    clone.querySelector(".entry-goals").textContent = entry.goals

    container.appendChild(clone)
  })
}

async function submitJournalEntry() {
  const form = document.getElementById("journal-form")
  const submitButton = form.querySelector('button[type="submit"]')
  const originalButtonText = submitButton.textContent

  // Disable button and show loading state
  submitButton.disabled = true
  submitButton.textContent = "Saving..."

  try {
    const formData = new FormData(form)

    const response = await fetch("/api/journal", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Failed to save journal entry")
    }

    // Reset form (except date)
    const dateValue = form.elements.date.value
    form.reset()
    form.elements.date.value = dateValue

    // Reload entries
    loadJournalEntries()

    // Show success message
    alert("Journal entry saved successfully!")
  } catch (error) {
    console.error("Error submitting journal entry:", error)
    alert("Failed to save journal entry. Please try again.")
  } finally {
    // Re-enable button
    submitButton.disabled = false
    submitButton.textContent = originalButtonText
  }
}
