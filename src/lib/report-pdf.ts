// Client-only PDF generation for reports. Loaded dynamically from event
// handlers so jspdf never lands in the SSR bundle.
export async function exportReportPdf(opts: {
  title: string;
  asset?: { id: string; name: string; area: string; criticality: string; health: number; risk: string; rulDays: number };
  audience: string;
  sections: Array<{ heading: string; body: string }>;
  recommendations?: string[];
}): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  // Header bar
  doc.setFillColor(17, 21, 28);
  doc.rect(0, 0, W, 72, "F");
  doc.setTextColor(255, 138, 61);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TATA MAINTENANCE WIZARD", margin, 32);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Reliability & Maintenance Intelligence Platform", margin, 50);
  doc.text(new Date().toUTCString(), W - margin, 50, { align: "right" });
  y = 100;

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(opts.title, margin, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(`Audience: ${opts.audience}`, margin, y);
  y += 18;

  if (opts.asset) {
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.text(`${opts.asset.id} · ${opts.asset.name}`, margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(`${opts.asset.area} · Criticality ${opts.asset.criticality} · Health ${opts.asset.health}/100 · Risk ${opts.asset.risk} · RUL ~${opts.asset.rulDays}d`, margin, y);
    y += 18;
  }

  // Sections
  for (const s of opts.sections) {
    if (y > H - margin - 80) { doc.addPage(); y = margin; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 138, 61);
    doc.text(s.heading.toUpperCase(), margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(s.body, W - margin * 2);
    for (const line of lines) {
      if (y > H - margin - 20) { doc.addPage(); y = margin; }
      doc.text(line, margin, y); y += 13;
    }
    y += 8;
  }

  if (opts.recommendations && opts.recommendations.length) {
    if (y > H - margin - 100) { doc.addPage(); y = margin; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 138, 61);
    doc.text("RECOMMENDATIONS", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    for (const r of opts.recommendations) {
      const lines = doc.splitTextToSize(`• ${r}`, W - margin * 2);
      for (const line of lines) {
        if (y > H - margin - 20) { doc.addPage(); y = margin; }
        doc.text(line, margin, y); y += 13;
      }
    }
  }

  // Footer on each page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text("Tata Maintenance Wizard · Confidential · Maintenance Intelligence Engine", margin, H - 24);
    doc.text(`Page ${i} of ${pages}`, W - margin, H - 24, { align: "right" });
  }

  const fname = `${opts.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(fname);
}
