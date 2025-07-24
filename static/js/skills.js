document.addEventListener("DOMContentLoaded", () => {
  // Load skills
  loadSkills()

  // Set up tab switching
  const newSkillTab = document.getElementById("new-skill-tab")
  const updateSkillTab = document.getElementById("update-skill-tab")
  const newSkillForm = document.getElementById("new-skill-form")
  const updateSkillForm = document.getElementById("update-skill-form")

  newSkillTab.addEventListener("click", () => {
    newSkillTab.classList.add("active")
    updateSkillTab.classList.remove("active")
    newSkillForm.classList.remove("hidden")
    updateSkillForm.classList.add("hidden")
  })

  updateSkillTab.addEventListener("click", () => {
    updateSkillTab.classList.add("active")
    newSkillTab.classList.remove("active")
    updateSkillForm.classList.remove("hidden")
    newSkillForm.classList.add("hidden")
  })

  // Handle form submissions
  const newSkillFormElement = document.getElementById("new-skill-form")
  newSkillFormElement.addEventListener("submit", (e) => {
    e.preventDefault()
    submitNewSkill()
  })

  const updateSkillFormElement = document.getElementById("update-skill-form")
  updateSkillFormElement.addEventListener("submit", (e) => {
    e.preventDefault()
    submitSkillProgress()
  })
})

async function loadSkills() {
  try {
    const response = await fetch("/api/skills")
    const skills = await response.json()

    renderSkills(skills)
    populateSkillDropdown(skills)
  } catch (error) {
    console.error("Error loading skills:", error)
    document.getElementById("skills-list").innerHTML = '<p class="error">Failed to load skills. Please try again.</p>'
  }
}

function renderSkills(skills) {
  const container = document.getElementById("skills-list")

  if (skills.length === 0) {
    container.innerHTML = '<p class="empty-state">No skills added yet. Start by adding your first skill!</p>'
    return
  }

  container.innerHTML = ""
  const template = document.getElementById("skill-template")

  skills.forEach((skill) => {
    const clone = template.content.cloneNode(true)

    // Set content
    clone.querySelector(".skill-name").textContent = skill.name

    if (skill.description) {
      clone.querySelector(".skill-description").textContent = skill.description
    } else {
      clone.querySelector(".skill-description").remove()
    }

    // Render stars for rating
    const ratingContainer = clone.querySelector(".skill-rating")
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("span")
      star.className = "star"
      star.textContent = i <= skill.level ? "★" : "☆"
      ratingContainer.appendChild(star)
    }

    // Render progress updates if available
    if (skill.progress && skill.progress.length > 0) {
      const progressSection = clone.querySelector(".skill-progress")
      progressSection.classList.remove("hidden")

      const progressList = clone.querySelector(".progress-list")

      // Sort progress by date (newest first)
      const sortedProgress = [...skill.progress].sort((a, b) => new Date(b.date) - new Date(a.date))

      // Show only the 3 most recent updates
      sortedProgress.slice(0, 3).forEach((update) => {
        const li = document.createElement("li")

        const dateSpan = document.createElement("span")
        dateSpan.className = "progress-date"

        // Format date
        const date = new Date(update.date)
        const formattedDate = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })

        dateSpan.textContent = formattedDate + ": "

        li.appendChild(dateSpan)
        li.appendChild(document.createTextNode(update.note))

        progressList.appendChild(li)
      })
    }

    container.appendChild(clone)
  })
}

function populateSkillDropdown(skills) {
  const dropdown = document.getElementById("skill_id")

  // Clear existing options (except the placeholder)
  while (dropdown.options.length > 1) {
    dropdown.remove(1)
  }

  // Add options for each skill
  skills.forEach((skill) => {
    const option = document.createElement("option")
    option.value = skill.id
    option.textContent = skill.name
    dropdown.appendChild(option)
  })
}

async function submitNewSkill() {
  const form = document.getElementById("new-skill-form")
  const submitButton = form.querySelector('button[type="submit"]')
  const originalButtonText = submitButton.textContent

  // Disable button and show loading state
  submitButton.disabled = true
  submitButton.textContent = "Adding..."

  try {
    const formData = new FormData(form)

    const response = await fetch("/api/skills", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Failed to add skill")
    }

    // Reset form
    form.reset()

    // Reload skills
    loadSkills()

    // Show success message
    alert("Skill added successfully!")
  } catch (error) {
    console.error("Error adding skill:", error)
    alert("Failed to add skill. Please try again.")
  } finally {
    // Re-enable button
    submitButton.disabled = false
    submitButton.textContent = originalButtonText
  }
}

async function submitSkillProgress() {
  const form = document.getElementById("update-skill-form")
  const submitButton = form.querySelector('button[type="submit"]')
  const originalButtonText = submitButton.textContent

  // Disable button and show loading state
  submitButton.disabled = true
  submitButton.textContent = "Updating..."

  try {
    const formData = new FormData(form)

    const response = await fetch("/api/skills/progress", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Failed to update skill progress")
    }

    // Reset form
    form.reset()

    // Reload skills
    loadSkills()

    // Show success message
    alert("Skill progress updated successfully!")
  } catch (error) {
    console.error("Error updating skill progress:", error)
    alert("Failed to update skill progress. Please try again.")
  } finally {
    // Re-enable button
    submitButton.disabled = false
    submitButton.textContent = originalButtonText
  }
}
