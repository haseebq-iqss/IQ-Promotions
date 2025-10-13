const uploadedFiles = { q2: null, q3: null, q4: null, base: null }
let processedData = []

const promotionRules = {
  PII: { min_comp_score: 4.0, min_performance: 3.0, min_test_score: 3.0 },
  PIII: { min_comp_score: 4.0, min_performance: 4.0, min_interview_score: 2.0 },
  TLI: {
    min_case_study_score: 2.0,
    min_panel_interview_score: 2.0,
    min_cultural_round_score: 2.0,
    min_comp_score: 2.0,
    min_performance_score: 2.0,
  },
  TLII: {
    min_case_study_score: 2.0,
    min_panel_interview_score: 2.0,
    min_cultural_round_score: 2.0,
    min_comp_score: 2.0,
    min_performance_score: 2.0,
  },
  MI: {
    min_comp_score: 2.5,
    min_performance_score: 2.5,
    min_panel_score: 2.5,
    min_cultural_score: 2.5,
  },
  "MI-CD": {
    min_comp_score: 2.0,
    min_performance_score: 2.0,
    min_panel_score: 2.5,
    min_divisional_score: 1.0,
    min_cultural_score: 2.5,
  },
  MII: { min_comp_score: 4.0, min_divisional_score: 3.0, min_cultural_score: 3.0 },
}

function calculateFinalScore(rowIndex) {
  const row = processedData[rowIndex]
  const targetRole = row["To be Promoted as"]

  if (!targetRole || !promotionRules[targetRole]) {
    row["Final Score"] = ""
    updateFinalScoreCell(rowIndex)
    return
  }

  const rules = promotionRules[targetRole]
  let totalScore = 0
  const totalFields = Object.keys(rules).length

  // Include all criteria for the selected role, treating missing values as 0
  Object.keys(rules).forEach((criteria) => {
    let actualScore = 0

    switch (criteria) {
      case "min_comp_score":
        actualScore = Number.parseFloat(row["Average of last 2 Competency Score"]) || 0
        break
      case "min_performance":
      case "min_performance_score":
        actualScore = Number.parseFloat(row["Average of last 3 Performance Score"]) || 0
        break
      case "min_test_score":
        actualScore = Number.parseFloat(row["Online Test Score"]) || 0
        break
      case "min_interview_score":
      case "min_panel_interview_score":
      case "min_panel_score":
        actualScore = Number.parseFloat(row["Panel Interview"]) || 0
        break
      case "min_case_study_score":
        actualScore = Number.parseFloat(row["Case Study"]) || 0
        break
      case "min_cultural_round_score":
      case "min_cultural_score":
        actualScore = Number.parseFloat(row["Cultural Round"]) || 0
        break
      case "min_divisional_score":
        actualScore = Number.parseFloat(row["Divisional Score"]) || 0
        break
    }

    totalScore += actualScore
  })

  row["Final Score"] = totalFields > 0 ? (totalScore / totalFields).toFixed(2) : ""
  updateFinalScoreCell(rowIndex)
}

function updateFinalScoreCell(rowIndex) {
  const table = document.getElementById("results-table")
  const cell = table.rows[rowIndex + 1].cells[Object.keys(processedData[0]).indexOf("Final Score")]
  if (cell && cell.querySelector("input")) {
    cell.querySelector("input").value = processedData[rowIndex]["Final Score"]
  }
}

function getRoleHierarchy() {
  return ["PI", "PII", "PIII", "TLI", "TLII", "MI", "MI-CD", "MII"]
}

function canPromoteTo(currentBand, targetRole) {
  // Since everyone starts as PI, they can be promoted to any role in the promotion rules
  return promotionRules.hasOwnProperty(targetRole)
}

function getRequiredFields(role) {
  if (!promotionRules[role]) return []

  const fieldMap = {
    min_comp_score: "Average of last 2 Competency Score",
    min_performance: "Average of last 3 Performance Score",
    min_performance_score: "Average of last 3 Performance Score",
    min_test_score: "Online Test Score",
    min_interview_score: "Panel Interview",
    min_panel_interview_score: "Panel Interview",
    min_panel_score: "Panel Interview",
    min_case_study_score: "Case Study",
    min_cultural_round_score: "Cultural Round",
    min_cultural_score: "Cultural Round",
    min_divisional_score: "Divisional Score",
  }

  return Object.keys(promotionRules[role])
    .map((key) => fieldMap[key])
    .filter(Boolean)
}

function excelSerialToDate(serial) {
  if (!serial || isNaN(serial)) return serial

  const excelEpoch = new Date(1900, 0, 1)
  const days = Number.parseInt(serial) - 2
  const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000)

  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const year = date.getFullYear()

  return `${month}/${day}/${year}`
}

function parseDate(dateValue) {
  if (!dateValue) return ""

  if (typeof dateValue === "string" && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue)) {
    const parts = dateValue.split("/")
    const month = parts[0].padStart(2, "0")
    const day = parts[1].padStart(2, "0")
    const year = parts[2]
    return `${month}/${day}/${year}`
  }

  // Handle Excel serial dates
  if (!isNaN(dateValue) && dateValue > 1000) {
    return excelSerialToDate(dateValue)
  }

  // Handle other date formats - convert to MM/DD/YYYY
  const date = new Date(dateValue)
  if (!isNaN(date.getTime())) {
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const year = date.getFullYear()
    return `${month}/${day}/${year}`
  }

  return dateValue
}

document.addEventListener("DOMContentLoaded", () => {
  const calculatorContent = document.getElementById("calculator-content")
  const calcIcon = document.getElementById("calc-icon")
  if (calculatorContent && calcIcon) {
    calculatorContent.classList.add("collapsed")
    calcIcon.classList.add("collapsed")
  }
  ;["q2", "q3", "q4", "base"].forEach((quarter) => {
    document.getElementById(`${quarter}-file`).addEventListener("change", (e) => {
      const file = e.target.files[0]
      if (file) {
        uploadedFiles[quarter] = file
        const uploadArea = document.getElementById(`${quarter}-upload`)
        uploadArea.classList.add("file-uploaded")

        // Update the content inside the label to show file uploaded
        const uploadContent = uploadArea.querySelector(".upload-content")
        if (uploadContent) {
          uploadContent.innerHTML = `<strong>${file.name}</strong><span>✅ File uploaded successfully</span>`
        }

        checkAllFilesUploaded()
      }
    })
  })

  // Add calculator input listeners
  const calcInputs = ["ap_cor", "ap_neg", "dom_cor", "dom_neg", "org_cor", "org_neg"]
  calcInputs.forEach((inputId) => {
    const input = document.getElementById(inputId)
    if (input) {
      input.addEventListener("input", calculateScore)
    }
  })
})

function checkAllFilesUploaded() {
  const allUploaded = Object.values(uploadedFiles).every((file) => file !== null)
  document.getElementById("process-btn").disabled = !allUploaded
}

function showStatus(message, type = "success") {
  const status = document.getElementById("status")
  status.className = `status ${type}`
  status.textContent = message
  status.style.display = "block"
}

function updateProgress(percent) {
  document.getElementById("progress").style.display = "block"
  document.getElementById("progress-bar").style.width = percent + "%"
}

async function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const fileName = file.name.toLowerCase()

    reader.onload = (e) => {
      try {
        let data, headers

        if (fileName.endsWith(".csv")) {
          const text = e.target.result
          const lines = text.split("\n").filter((line) => line.trim())
          headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
          data = lines.slice(1).map((line) => {
            const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
            const obj = {}
            headers.forEach((header, index) => {
              obj[header] = values[index] || ""
            })
            return obj
          })
        } else {
          const workbook = window.XLSX.read(e.target.result, { type: "array" })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 })

          if (jsonData.length === 0) {
            throw new Error("Empty worksheet")
          }

          headers = jsonData[0].map((h) => String(h || "").trim())
          data = jsonData
            .slice(1)
            .map((row) => {
              const obj = {}
              headers.forEach((header, index) => {
                obj[header] = String(row[index] || "").trim()
              })
              return obj
            })
            .filter((row) => Object.values(row).some((val) => val !== ""))
        }

        resolve({ headers, data })
      } catch (error) {
        reject(new Error(`Error parsing ${file.name}: ${error.message}`))
      }
    }

    reader.onerror = () => reject(new Error(`Error reading ${file.name}`))

    if (fileName.endsWith(".csv")) {
      reader.readAsText(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  })
}

async function processFiles() {
  try {
    showStatus("Processing files...", "success")
    updateProgress(10)

    const q2Data = await parseFile(uploadedFiles.q2)
    updateProgress(25)
    const q3Data = await parseFile(uploadedFiles.q3)
    updateProgress(40)
    const q4Data = await parseFile(uploadedFiles.q4)
    updateProgress(55)
    const baseData = await parseFile(uploadedFiles.base)
    updateProgress(70)

    processedData = mergeData(q2Data, q3Data, q4Data, baseData)
    updateProgress(90)

    displayResults()
    updateProgress(100)

    showStatus(`Successfully processed ${processedData.length} employee records`, "success")
    document.getElementById("data-section").style.display = "block"
  } catch (error) {
    showStatus("Error processing files: " + error.message, "error")
    console.error(error)
  }
}

function mergeData(q2Data, q3Data, q4Data, baseData) {
  const merged = []

  baseData.data.forEach((employee) => {
    const email =
      employee["Email ID"] ||
      employee["Employee Email ID"] ||
      employee["Email"] ||
      employee["email"] ||
      employee["EmailID"]

    if (!email) return

    const findByEmail = (data) =>
      data.find((p) => {
        const pEmail = p["Employee Email ID"] || p["Email ID"] || p["Email"] || p["email"] || p["EmailID"]
        return pEmail && pEmail.toLowerCase() === email.toLowerCase()
      }) || {}

    const q2Perf = findByEmail(q2Data.data)
    const q3Perf = findByEmail(q3Data.data)
    const q4Perf = findByEmail(q4Data.data)

    const hasAnyQuarterData =
      Object.keys(q2Perf).length > 0 || Object.keys(q3Perf).length > 0 || Object.keys(q4Perf).length > 0
    if (!hasAnyQuarterData) return

    const getScore = (perf, field) => {
      const score = perf[field] || perf[field.replace(" ", "_")] || perf[field.replace(" ", "")] || 0
      return Number.parseFloat(score) || 0
    }

    const q2Score = getScore(q2Perf, "Goals")
    const q3Score = getScore(q3Perf, "Goals")
    const q4Score = getScore(q4Perf, "Goals")

    const q3Comp = getScore(q3Perf, "Competency")
    const q4Comp = getScore(q4Perf, "Competency")

    const validScores = [q2Score, q3Score, q4Score].filter((s) => s > 0)
    const avgPerformance =
      validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2) : ""

    const validComps = [q3Comp, q4Comp].filter((s) => s > 0)
    const avgCompetency =
      validComps.length > 0 ? (validComps.reduce((a, b) => a + b, 0) / validComps.length).toFixed(2) : ""

    const joinDate = parseDate(employee["Date of joining"] || employee["Date_of_joining"] || "")
    const lastPromDate = parseDate(employee["Last Promotion Date"] || employee["Last_Promotion_Date"] || "")

    merged.push({
      "First Name": employee["First Name"] || employee["First_Name"] || "",
      "Last Name": employee["Last Name"] || employee["Last_Name"] || "",
      Department: q2Perf["Employee Department"] || q3Perf["Employee Department"] || q4Perf["Employee Department"] || "",
      Band: employee["Band"] || "PI",
      "To be Promoted as": "",
      "Date of joining": joinDate,
      "Last Promotion Date": lastPromDate,
      "Tenure cutoff date": "", // user must select
      "Tenure as on 1st of Quarter": "0 months",
      "Last Quarter 1": q2Score ? q2Score.toFixed(2) : "",
      "Last Quarter 2": q3Score ? q3Score.toFixed(2) : "",
      "Last Quarter 3": q4Score ? q4Score.toFixed(2) : "",
      "Average of last 3 Performance Score": avgPerformance,
      "Last Quarter 1 (Comp)": q3Comp ? q3Comp.toFixed(2) : "",
      "Last Quarter 2 (Comp)": q4Comp ? q4Comp.toFixed(2) : "",
      "Average of last 2 Competency Score": avgCompetency,
      "Eligible for Promotion": "",
      "Online Test Score": "",
      "Case Study": "",
      "Panel Interview": "",
      "Divisional Score": "",
      "Cultural Round": "",
      "Final Score": "",
      Decision: "",
    })
  })

  return merged
}

function displayResults() {
  const table = document.getElementById("results-table")
  const thead = document.getElementById("table-header")
  const tbody = document.getElementById("table-body")

  if (processedData.length === 0) return

  const headers = Object.keys(processedData[0])
  thead.innerHTML = "<tr>" + headers.map((h) => `<th>${h}</th>`).join("") + "</tr>"

  const editableFields = [
    "To be Promoted as",
    "Eligible for Promotion",
    "Tenure cutoff date",
    "Online Test Score",
    "Case Study",
    "Panel Interview",
    "Divisional Score",
    "Cultural Round",
    "Final Score",
    "Decision",
  ]
  const allPromotionOptions = Object.keys(promotionRules)
  const decisionOptions = ["Promoted", "Not Promoted", "Exception Taken", "Hold"]
  const eligibilityOptions = ["Eligible", "Not Eligible"]

  const today = new Date()
  const todayFormatted = `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}/${today.getFullYear()}`
  const todayInputFormat = convertToDateInputFormat(todayFormatted)

  tbody.innerHTML = processedData
    .map((row, i) => {
      const dateValue = row["Tenure cutoff date"]
        ? convertToDateInputFormat(row["Tenure cutoff date"])
        : todayInputFormat
      if (!row["Tenure cutoff date"]) {
        row["Tenure cutoff date"] = todayFormatted
        const lastPromDate = row["Last Promotion Date"]
        const joinDate = row["Date of joining"]
        const startDate = lastPromDate || joinDate

        if (startDate) {
          const months = calculateTenureInMonths(startDate, todayFormatted)
          const cappedMonths = Math.min(months, 60)
          const tenureMonths = cappedMonths > 0 ? `${cappedMonths} months` : "0 months"
          row["Tenure as on 1st of Quarter"] = tenureMonths
        } else {
          row["Tenure as on 1st of Quarter"] = "0 months"
        }
      }

      return (
        "<tr>" +
        headers
          .map((h) => {
            const val = row[h] || ""
            if (h === "To be Promoted as") {
              return `<td class="editable">
                      <select class="cell-input" onchange="processedData[${i}]['${h}']=this.value; calculateFinalScore(${i}); toggleRequiredFields(${i})" style="background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 4px;">
                          <option value="">Select Role</option>
                          ${allPromotionOptions.map((opt) => `<option value="${opt}" ${val === opt ? "selected" : ""}>${opt}</option>`).join("")}
                      </select>
                  </td>`
            } else if (h === "Eligible for Promotion") {
              return `<td class="editable">
                      <select class="cell-input" onchange="processedData[${i}]['${h}']=this.value" style="background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 4px;">
                          <option value="">Select Eligibility</option>
                          ${eligibilityOptions.map((opt) => `<option value="${opt}" ${val === opt ? "selected" : ""}>${opt}</option>`).join("")}
                      </select>
                  </td>`
            } else if (h === "Tenure cutoff date") {
              return `<td class="editable">
                      <input type="date" class="cell-input" value="${dateValue}" 
                             onchange="updateTenureCutoffDate(${i}, this.value)" 
                             style="background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 4px;" />
                  </td>`
            } else if (h === "Decision") {
              return `<td class="editable">
                      <select class="cell-input" onchange="processedData[${i}]['${h}']=this.value" style="background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 4px;">
                          <option value="">Select Decision</option>
                          ${decisionOptions.map((opt) => `<option value="${opt}" ${val === opt ? "selected" : ""}>${opt}</option>`).join("")}
                      </select>
                  </td>`
            } else if (editableFields.includes(h)) {
              const onChangeEvent = [
                "Online Test Score",
                "Case Study",
                "Panel Interview",
                "Divisional Score",
                "Cultural Round",
              ].includes(h)
                ? `onchange="processedData[${i}]['${h}']=this.value; calculateFinalScore(${i})"`
                : `onchange="processedData[${i}]['${h}']=this.value"`

              return `<td class="editable"><input type="text" class="cell-input" value="${val}" ${onChangeEvent} style="background-color: #f5f5f5; border: 1px solid #ddd;" /></td>`
            } else {
              return `<td>${val}</td>`
            }
          })
          .join("") +
        "</tr>"
      )
    })
    .join("")
}

function toggleRequiredFields(rowIndex) {
  const row = processedData[rowIndex]
  const selectedRole = row["To be Promoted as"]
  const requiredFields = selectedRole ? getRequiredFields(selectedRole) : []

  const table = document.getElementById("results-table")
  const tableRow = table.rows[rowIndex + 1]
  const headers = Object.keys(processedData[0])

  const testFields = ["Online Test Score", "Case Study", "Panel Interview", "Divisional Score", "Cultural Round"]
  testFields.forEach((fieldName) => {
    const cellIndex = headers.indexOf(fieldName)
    if (cellIndex >= 0) {
      const input = tableRow.cells[cellIndex].querySelector("input")
      if (input) {
        const isRequired = requiredFields.includes(fieldName)
        input.disabled = !isRequired
        if (isRequired) {
          input.style.backgroundColor = "#fff3cd"
          input.style.border = "2px solid #ffc107"
          input.style.borderRadius = "4px"
        } else {
          input.style.backgroundColor = "#f5f5f5"
          input.style.border = "1px solid #ddd"
          input.value = ""
          processedData[rowIndex][fieldName] = ""
        }
      }
    }
  })

  const promotionCellIndex = headers.indexOf("To be Promoted as")
  if (promotionCellIndex >= 0) {
    const select = tableRow.cells[promotionCellIndex].querySelector("select")
    if (select) {
      select.style.backgroundColor = "#fff3cd"
      select.style.border = "2px solid #ffc107"
      select.style.borderRadius = "4px"
    }
  }

  calculateFinalScore(rowIndex)
}

function convertToDateInputFormat(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return ""

  const parts = dateStr.split("/")
  if (parts.length === 3) {
    const month = parts[0].padStart(2, "0")
    const day = parts[1].padStart(2, "0")
    const year = parts[2]
    return `${year}-${month}-${day}`
  }
  return ""
}

function updateTenureCutoffDate(rowIndex, dateValue) {
  if (!dateValue) {
    processedData[rowIndex]["Tenure cutoff date"] = ""
    processedData[rowIndex]["Tenure as on 1st of Quarter"] = ""

    // Update both the tenure cell and date field
    const table = document.getElementById("results-table")
    const headers = Object.keys(processedData[0])
    const tenureCellIndex = headers.indexOf("Tenure as on 1st of Quarter")
    const dateCellIndex = headers.indexOf("Tenure cutoff date")

    if (tenureCellIndex >= 0) {
      table.rows[rowIndex + 1].cells[tenureCellIndex].textContent = ""
    }
    if (dateCellIndex >= 0) {
      const dateInput = table.rows[rowIndex + 1].cells[dateCellIndex].querySelector("input")
      if (dateInput) {
        dateInput.value = ""
      }
    }
    return
  }

  const [year, month, day] = dateValue.split("-").map((num) => Number.parseInt(num, 10))
  const formattedDate = `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`

  processedData[rowIndex]["Tenure cutoff date"] = formattedDate

  const row = processedData[rowIndex]
  const lastPromDate = row["Last Promotion Date"]
  const joinDate = row["Date of joining"]

  // Use Last Promotion Date if available, otherwise use Date of Joining
  const startDate = lastPromDate || joinDate

  if (!startDate) {
    processedData[rowIndex]["Tenure as on 1st of Quarter"] = "0 months"
  } else {
    const months = calculateTenureInMonths(startDate, formattedDate)
    const cappedMonths = Math.min(months, 60)
    const tenureMonths = cappedMonths > 0 ? `${cappedMonths} months` : "0 months"
    processedData[rowIndex]["Tenure as on 1st of Quarter"] = tenureMonths
  }

  // Update both the table cell and ensure the date input shows the correct value
  const table = document.getElementById("results-table")
  const headers = Object.keys(processedData[0])
  const tenureCellIndex = headers.indexOf("Tenure as on 1st of Quarter")
  const dateCellIndex = headers.indexOf("Tenure cutoff date")

  if (tenureCellIndex >= 0 && table.rows[rowIndex + 1]) {
    table.rows[rowIndex + 1].cells[tenureCellIndex].textContent = processedData[rowIndex]["Tenure as on 1st of Quarter"]
  }

  // Ensure the date input field shows the selected date
  if (dateCellIndex >= 0 && table.rows[rowIndex + 1]) {
    const dateInput = table.rows[rowIndex + 1].cells[dateCellIndex].querySelector("input")
    if (dateInput && dateInput.value !== dateValue) {
      dateInput.value = dateValue
    }
  }
}

function exportData(format = "csv") {
  if (processedData.length === 0) {
    showStatus("No data to export", "error")
    return
  }

  const headers = Object.keys(processedData[0])
  const timestamp = new Date().toISOString().split("T")[0]

  if (format === "csv") {
    const csvContent = [
      headers.join(","),
      ...processedData.map((row) => headers.map((header) => `"${row[header]}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    window.saveAs(blob, `promotion_analysis_${timestamp}.csv`)
  } else if (format === "xlsx") {
    const ws = window.XLSX.utils.json_to_sheet(processedData)
    const wb = window.XLSX.utils.book_new()
    window.XLSX.utils.book_append_sheet(wb, ws, "Promotion Analysis")
    window.XLSX.writeFile(wb, `promotion_analysis_${timestamp}.xlsx`)
  } else if (format === "docx") {
    const htmlContent = `
            <html><head><meta charset="utf-8"><title>Promotion Analysis</title></head><body>
            <h1>Promotion Analysis Report</h1>
            <table border="1" style="border-collapse:collapse;width:100%">
            <tr>${headers.map((h) => `<th style="padding:8px;background:#f0f0f0">${h}</th>`).join("")}</tr>
            ${processedData
              .map((row) => `<tr>${headers.map((h) => `<td style="padding:8px">${row[h]}</td>`).join("")}</tr>`)
              .join("")}
            </table></body></html>
        `

    const blob = new Blob([htmlContent], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })
    window.saveAs(blob, `promotion_analysis_${timestamp}.docx`)
  }

  showStatus(`Data exported successfully as ${format.toUpperCase()}!`, "success")
}

// Declare XLSX and saveAs variables
window.XLSX = window.XLSX || {}
window.saveAs =
  window.saveAs ||
  ((blob, filename) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  })

function calculateTenureInMonths(fromDate, toDate) {
  if (!fromDate || !toDate) return 0

  // Parse MM/DD/YYYY format dates
  const parseMMDDYYYY = (dateStr) => {
    const parts = dateStr.split("/")
    if (parts.length === 3) {
      const month = Number.parseInt(parts[0], 10)
      const day = Number.parseInt(parts[1], 10)
      const year = Number.parseInt(parts[2], 10)
      return new Date(year, month - 1, day) // month is 0-indexed
    }
    return null
  }

  const fromDateObj = parseMMDDYYYY(fromDate)
  const toDateObj = parseMMDDYYYY(toDate)

  if (!fromDateObj || !toDateObj || fromDateObj > toDateObj) return 0

  let yearDiff = toDateObj.getFullYear() - fromDateObj.getFullYear()
  let monthDiff = toDateObj.getMonth() - fromDateObj.getMonth()

  if (monthDiff < 0) {
    yearDiff--
    monthDiff += 12
  }

  return Math.max(0, yearDiff * 12 + monthDiff)
}

function calculateScore() {
  const ap_cor = Number.parseFloat(document.getElementById("ap_cor").value) || 0
  const ap_neg = Number.parseFloat(document.getElementById("ap_neg").value) || 0
  const dom_cor = Number.parseFloat(document.getElementById("dom_cor").value) || 0
  const dom_neg = Number.parseFloat(document.getElementById("dom_neg").value) || 0
  const org_cor = Number.parseFloat(document.getElementById("org_cor").value) || 0
  const org_neg = Number.parseFloat(document.getElementById("org_neg").value) || 0

  const ap_score = ap_cor - ap_neg / 4
  const dom_score = dom_cor - dom_neg / 4
  const org_score = org_cor - org_neg / 4

  const finalScore = (ap_score + dom_score + org_score) / 3

  document.getElementById("calc-result").textContent = finalScore.toFixed(2)
}

function copyResult() {
  const result = document.getElementById("calc-result").textContent
  navigator.clipboard
    .writeText(result)
    .then(() => {
      const copyBtn = document.querySelector(".copy-btn")
      const originalContent = copyBtn.innerHTML
      copyBtn.innerHTML = "<span>✓</span>"
      setTimeout(() => {
        copyBtn.innerHTML = originalContent
      }, 1000)
    })
    .catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = result
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
    })
}

function toggleCalculator() {
  const content = document.getElementById("calculator-content")
  const icon = document.getElementById("calc-icon")

  if (content && icon) {
    content.classList.toggle("collapsed")
    icon.classList.toggle("collapsed")
  }
}
