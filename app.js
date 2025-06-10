// app.js

let uploadedFiles = [];
let mergedPdfDoc = null;
const fileListDiv = document.getElementById('fileList');
const canvas = document.getElementById('pdfPreview');
const ctx = canvas.getContext('2d');

// File upload handler
document.getElementById('pdfInput').addEventListener('change', handleFiles);
document.getElementById('mergeBtn').addEventListener('click', mergePDFs);
document.getElementById('compressBtn').addEventListener('click', compressPDF);
document.getElementById('rotateBtn').addEventListener('click', rotatePDF);
document.getElementById('watermarkBtn').addEventListener('click', addWatermark);
document.getElementById('downloadBtn').addEventListener('click', downloadResult);

function handleFiles(e) {
  const newFiles = Array.from(e.target.files);
  newFiles.forEach(file => {
    const isDuplicate = uploadedFiles.some(f => f.name === file.name && f.size === file.size);
    if (!isDuplicate) uploadedFiles.push(file);
  });

  fileListDiv.innerHTML = uploadedFiles.map(f => `✅ ${f.name}`).join('<br>');
  previewPDF(uploadedFiles[uploadedFiles.length - 1]);
}

const dropzone = document.getElementById("dropzone");

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.style.borderColor = "#4f46e5";
});

dropzone.addEventListener("dragleave", () => {
  dropzone.style.borderColor = "#ccc";
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.style.borderColor = "#ccc";
  const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf");
  droppedFiles.forEach(file => {
    const isDuplicate = uploadedFiles.some(f => f.name === file.name && f.size === file.size);
    if (!isDuplicate) uploadedFiles.push(file);
  });

  fileListDiv.innerHTML = uploadedFiles.map(f => `✅ ${f.name}`).join("<br>");
  previewPDF(uploadedFiles[uploadedFiles.length - 1]);
});

async function previewPDF(file) {
  const fileReader = new FileReader();
  fileReader.onload = async function () {
    const typedArray = new Uint8Array(this.result);
    const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.2 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: ctx, viewport }).promise;
  };
  fileReader.readAsArrayBuffer(file);
}

async function previewPDFBuffer(buffer) {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.2 });
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  await page.render({ canvasContext: ctx, viewport }).promise;
}

async function mergePDFs() {
  if (uploadedFiles.length < 2) {
    alert("Upload at least two PDFs to merge.");
    return;
  }
  const mergedPdf = await PDFLib.PDFDocument.create();
  for (const file of uploadedFiles) {
    const bytes = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(bytes);
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach((page) => mergedPdf.addPage(page));
  }
  mergedPdfDoc = mergedPdf;
  alert("✅ Merge complete! You can now download.");
  previewPDFBuffer(await mergedPdf.save());
}

async function compressPDF() {
  if (!uploadedFiles.length) return alert("Upload a PDF first.");
  const pdfBytes = await uploadedFiles[0].arrayBuffer();
  const pdf = await PDFLib.PDFDocument.load(pdfBytes);
  const pages = pdf.getPages();
  pages.forEach(page => {
    const { width, height } = page.getSize();
    page.scaleContent(0.9);
    page.setSize(width * 0.9, height * 0.9);
  });
  mergedPdfDoc = pdf;
  alert("📉 Compressed! You can download it.");
  previewPDFBuffer(await pdf.save());
}

async function rotatePDF() {
  if (!uploadedFiles.length) return alert("Upload a PDF first.");
  const pdfBytes = await uploadedFiles[0].arrayBuffer();
  const pdf = await PDFLib.PDFDocument.load(pdfBytes);
  const pages = pdf.getPages();
  pages.forEach(page => {
    const rotation = page.getRotation().angle;
    page.setRotation(PDFLib.degrees((rotation + 90) % 360));
  });
  mergedPdfDoc = pdf;
  alert("🔁 All pages rotated 90°.");
  previewPDFBuffer(await pdf.save());
}

async function addWatermark() {
  if (!uploadedFiles.length) return alert("Upload a PDF first.");
  const position = prompt("Enter position: top-left, center, bottom-right", "center");
  const text = prompt("Watermark text?", "CONFIDENTIAL");
  const pdfBytes = await uploadedFiles[0].arrayBuffer();
  const pdf = await PDFLib.PDFDocument.load(pdfBytes);
  const pages = pdf.getPages();
  const font = await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
  pages.forEach(page => {
    const { width, height } = page.getSize();
    const size = 24;
    let x = 50, y = height - 50;
    if (position === "center") {
      x = width / 2 - (text.length * size * 0.25);
      y = height / 2;
    } else if (position === "bottom-right") {
      x = width - (text.length * size * 0.5) - 40;
      y = 40;
    }
    page.drawText(text, {
      x, y,
      size,
      font,
      color: PDFLib.rgb(1, 0, 0),
      opacity: 0.4,
      rotate: PDFLib.degrees(0)
    });
  });
  mergedPdfDoc = pdf;
  alert("🖋️ Watermark added!");
  previewPDFBuffer(await pdf.save());
}

function downloadResult() {
  if (!mergedPdfDoc) {
    alert("No PDF generated yet.");
    return;
  }
  mergedPdfDoc.save().then((bytes) => {
    const blob = new Blob([bytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "edited.pdf";
    link.click();
  });
}
