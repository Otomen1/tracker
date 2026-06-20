import { Transaction, Category } from "@/types"
import { formatCurrency, formatDate } from "./formatters"

function computeTotals(transactions: Transaction[]) {
  let income = 0
  let expenses = 0
  for (const t of transactions) {
    if (t.type === "income") income += t.amount
    else expenses += t.amount
  }
  return { income, expenses, net: income - expenses }
}

export async function transactionsToPDF(
  transactions: Transaction[],
  categories: Category[],
  rangeLabel: string,
  currency: string,
  filename: string
): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const { default: autoTable } = await import("jspdf-autotable")

  const fmt = (n: number) => formatCurrency(n, currency)
  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "Unknown"

  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date))
  const { income, expenses, net } = computeTotals(transactions)

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14

  // ── Header ──────────────────────────────────────────────
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.setTextColor(24, 24, 27) // zinc-900
  doc.text("Expense Tracker", margin, 18)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(113, 113, 122) // zinc-500
  doc.text(rangeLabel, pageW - margin, 18, { align: "right" })

  // ── Summary row ─────────────────────────────────────────
  const summaryY = 28
  const colW = (pageW - margin * 2) / 3

  const summaryItems = [
    { label: "Total Income", value: fmt(income), r: 22, g: 163, b: 74 },   // emerald-500
    { label: "Total Expenses", value: fmt(expenses), r: 239, g: 68, b: 68 }, // rose-500
    { label: "Net Balance", value: (net >= 0 ? "+" : "") + fmt(net), r: net >= 0 ? 22 : 239, g: net >= 0 ? 163 : 68, b: net >= 0 ? 74 : 68 },
  ]

  summaryItems.forEach((item, i) => {
    const x = margin + i * colW
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(113, 113, 122)
    doc.text(item.label, x, summaryY)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(item.r, item.g, item.b)
    doc.text(item.value, x, summaryY + 6)
  })

  // ── Transaction table ────────────────────────────────────
  const tableData = sorted.map((t) => [
    formatDate(t.date),
    t.description,
    getCategoryName(t.categoryId),
    t.type === "income" ? "Income" : "Expense",
    (t.type === "income" ? "+" : "-") + fmt(t.amount),
  ])

  autoTable(doc, {
    startY: summaryY + 16,
    head: [["Date", "Description", "Category", "Type", "Amount"]],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3, textColor: [39, 39, 42] },
    headStyles: {
      fillColor: [244, 244, 245], // zinc-100
      textColor: [63, 63, 70],    // zinc-700
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 32 },
      3: { cellWidth: 22 },
      4: { cellWidth: 28, halign: "right" },
    },
    didDrawPage: (data) => {
      const pageCount = (doc as any).internal.getNumberOfPages()
      const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(161, 161, 170) // zinc-400
      const footerY = doc.internal.pageSize.getHeight() - 8
      doc.text(
        `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
        margin,
        footerY
      )
      doc.text(`Page ${pageNum} of ${pageCount}`, pageW - margin, footerY, { align: "right" })
    },
  })

  doc.save(filename)
}
